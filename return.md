# Retours et propositions d'amélioration

## Ce qui a été mis en place

- **Tests unitaires (backend)** : `server/tests/unit/cdController.test.js` — le contrôleur `cdController` est testé isolément avec le pool PostgreSQL mocké (`server/configs/__mocks__/db.js`), pour les cas nominaux et les cas d'erreur (500).
- **Tests d'intégration (backend)** :
  - `server/tests/integration/cds.db.integration.test.js` : API ↔ Base de données, avec un vrai PostgreSQL éphémère lancé via **Testcontainers** (point optionnel de l'énoncé réalisé) et le schéma `configs/import.sql` appliqué automatiquement.
  - `client/src/services/__tests__/cdService.integration.test.js` : API ↔ Frontend — la couche `cdService.js` réellement utilisée par les composants React est exécutée contre l'application Express réelle (routes + contrôleur), driver PostgreSQL simulé par un magasin en mémoire, pour valider le contrat HTTP consommé par le frontend.
- **Tests end-to-end (Cypress)** : `cypress/e2e/cd-management.cy.js` — ajout d'un CD, affichage dans la liste, puis suppression, sur l'application réellement démarrée.
- **Tests de composants (bonus)** : `client/src/components/__tests__/` — `AddCD`, `CDItem`, `CDList` testés avec Vitest + React Testing Library (rendu, saisie utilisateur, appels aux services mockés).
- **Refactor minimal** : extraction de l'application Express dans `server/app.js` (séparée de `server.js` qui ne fait plus que l'écoute du port), nécessaire pour pouvoir tester l'API avec `supertest`/`vitest` sans ouvrir un vrai socket.
- **Couverture de code + SonarQube (bonus)** : `sonar-project.properties` à la racine, scripts `npm run test:coverage` (server et client) générant des rapports LCOV réels et vérifiés (voir résultats ci-dessous).
- **Docker Scout (bonus)** : `security/docker-scout.sh` prêt à l'emploi, ajout de `.dockerignore` (server et client), revue manuelle des `Dockerfile` avec proposition de version durcie (voir ci-dessous).
- **OWASP ZAP (bonus)** : `security/zap-baseline.sh`, scan baseline prêt à l'emploi contre le frontend et l'API.

## Résultats réels obtenus (exécutés dans cet environnement)

- Tests unitaires : **6/6** passent.
- Tests de composants : **8/8** passent.
- Test d'intégration API ↔ Frontend : **3/3** passent.
- Test d'intégration API ↔ DB (Testcontainers) : le code s'exécute correctement mais nécessite un démon Docker pour lancer réellement le conteneur PostgreSQL, absent de l'environnement utilisé pour préparer ce rendu (l'échec observé est uniquement *"Could not find a working container runtime strategy"*, aucune erreur de code).
- Couverture de code (v8/Jest, générée réellement) :
  - Client : 100 % lignes/fonctions sur `AddCD`, `CDItem`, `CDList`, `cdService.js`.
  - Server : 100 % lignes/fonctions sur `Controllers/cdController.js` (via les tests unitaires ; `app.js`/`Routes` sont couverts par les tests d'intégration, non inclus dans ce rapport car nécessitant Docker).
- `npm audit` (exécuté réellement) :
  - **Client** : 0 vulnérabilité.
  - **Server** : 0 vulnérabilité sur les dépendances de production (`npm audit --omit=dev`). 5 vulnérabilités (4 modérées, 1 haute) existent uniquement dans la chaîne de dépendances internes de `testcontainers` (via `dockerode`/`undici`/`uuid`), un outil de *test*, jamais embarqué dans l'image de production.

## Docker Scout — revue manuelle et proposition d'amélioration

Docker Scout et OWASP ZAP nécessitent un démon Docker, indisponible dans l'environnement utilisé pour préparer ce rendu. Les scripts `security/docker-scout.sh` et `security/zap-baseline.sh` sont prêts à l'emploi. En attendant, voici une revue manuelle des `Dockerfile` actuels, avec les points qu'un scan Docker Scout relèverait typiquement :

**`server/Dockerfile`**
| Problème | Risque |
|---|---|
| `FROM node:lts` (tag flottant, image complète non-slim) | Reconstructions non reproductibles, surface d'attaque plus large qu'une image `alpine`/`slim` |
| Pas de `USER` non-root | Le process tourne en `root` dans le conteneur |
| `npm install` au lieu de `npm ci` | Build non déterministe, dérive possible par rapport au lockfile |
| Pas de multi-stage | `devDependencies` (`nodemon`) embarquées dans l'image finale |
| `EXPOSE 5000` alors que l'app écoute sur `5005` (`PORT` par défaut) | Incohérence avec `docker-compose.prod.yml` qui mappe `5005:5005` |
| Pas de `.dockerignore` (corrigé dans ce rendu) | `node_modules` local risquait d'être copié dans l'image |

Proposition de `Dockerfile` durci (non appliquée au fichier original pour ne pas modifier le sujet du professeur, fournie ici à titre de proposition) :
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 5005
CMD ["node", "server.js"]
```

**`client/Dockerfile`**
| Problème | Risque |
|---|---|
| `FROM node:lts-slim` / `FROM nginx:latest` (tags flottants) | Mêmes risques de reproductibilité/dérive de CVE que côté serveur |
| `npm install` au lieu de `npm ci` | Idem |
| Pas de `USER` non-root sur l'étage `nginx` | `nginx` tourne en root par défaut |
| Pas de `.dockerignore` (corrigé dans ce rendu) | Idem |

Proposition : épingler les versions (`node:22-alpine`, `nginx:1.27-alpine`), utiliser `npm ci`, et envisager `nginxinc/nginx-unprivileged` pour l'étage final.

## Propositions d'amélioration sur l'application

1. **Validation des entrées côté API** : `addCD` insère directement `title`, `artist`, `year` sans valider leur présence/type. Un `title`/`artist` manquant ou un `year` non numérique remonte une erreur 500 générique (violation de contrainte `NOT NULL` ou erreur de type PostgreSQL) au lieu d'un 400 explicite. Une validation (ex. `express-validator` ou vérification manuelle) donnerait des messages d'erreur plus clairs au frontend.
2. **Gestion des erreurs trop permissive** : les trois handlers du contrôleur renvoient `error.message` brut au client (`res.status(500).json({ error: error.message })`), ce qui peut exposer des détails internes (structure de requêtes SQL, etc.). Préférer un message générique côté client et logguer le détail côté serveur.
3. **UX du frontend** : `Home.jsx` recharge toute la page (`window.location.reload()`) après l'ajout d'un CD au lieu de simplement rafraîchir la liste comme le fait déjà `CDList` après une suppression. Cela casse l'expérience utilisateur (flash de la page) et complique les tests E2E. Il serait plus cohérent de faire remonter un callback de rafraîchissement local, comme pour la suppression.
4. **`id` en paramètre d'URL non validé** : `deleteCD` utilise `req.params.id` directement dans la requête paramétrée (donc pas d'injection SQL), mais un `id` non numérique retourne aussi un 500 plutôt qu'un 400/404. Un CD inexistant ne renvoie pas non plus de 404 (la suppression "réussit" silencieusement même si 0 ligne est affectée).
5. **Configuration/sécurité** : `cors()` est utilisé sans restriction d'origine (`app.use(cors())`), ce qui autorise n'importe quel domaine à appeler l'API. À restreindre à l'origine du frontend en production.
6. **Fichiers `.env`** : `server/.env` et `client/.env` sont vides/factices ici mais suivis par git (aucun des deux n'est dans un `.gitignore`). Il serait préférable de fournir un `.env.example` documenté et d'ignorer les vrais fichiers `.env`.

## Points bonus non exécutés faute d'outillage

L'environnement utilisé pour préparer ce rendu n'a pas de démon Docker actif ni d'accès à un serveur SonarQube/ZAP hébergé. En conséquence :
- **SonarQube** : configuration (`sonar-project.properties`) et rapports de couverture (LCOV) prêts et vérifiés ; l'analyse elle-même (nécessite un serveur SonarQube) n'a pas pu être lancée.
- **Docker Scout** : script prêt (`security/docker-scout.sh`) ; le scan réel n'a pas pu être exécuté (pas de démon Docker). Revue manuelle fournie ci-dessus en remplacement.
- **OWASP ZAP** : script prêt (`security/zap-baseline.sh`) ; le scan réel n'a pas pu être exécuté (nécessite Docker + l'application démarrée).

Ces trois éléments sont directement exécutables dans un environnement disposant de Docker (celui du professeur, notamment).
