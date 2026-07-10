# Retours et propositions d'amélioration

## Ce qui a été mis en place

- **Tests unitaires (backend)** : `server/tests/unit/cdController.test.js` — le contrôleur `cdController` est testé isolément avec le pool PostgreSQL mocké (`server/configs/__mocks__/db.js`), pour les cas nominaux et les cas d'erreur (500).
- **Tests d'intégration (backend)** :
  - `server/tests/integration/cds.db.integration.test.js` : API ↔ Base de données, avec un vrai PostgreSQL éphémère lancé via **Testcontainers** (point optionnel de l'énoncé réalisé) et le schéma `configs/import.sql` appliqué automatiquement.
  - `client/src/services/__tests__/cdService.integration.test.js` : API ↔ Frontend — la couche `cdService.js` réellement utilisée par les composants React est exécutée contre l'application Express réelle (routes + contrôleur), driver PostgreSQL simulé par un magasin en mémoire, pour valider le contrat HTTP consommé par le frontend.
- **Tests end-to-end (Cypress)** : `cypress/e2e/cd-management.cy.js` — ajout d'un CD, affichage dans la liste, puis suppression, sur l'application réellement démarrée.
- **Tests de composants (bonus)** : `client/src/components/__tests__/` — `AddCD`, `CDItem`, `CDList` testés avec Vitest + React Testing Library (rendu, saisie utilisateur, appels aux services mockés).
- **Refactor minimal** : extraction de l'application Express dans `server/app.js` (séparée de `server.js` qui ne fait plus que l'écoute du port), nécessaire pour pouvoir tester l'API avec `supertest`/`vitest` sans ouvrir un vrai socket.
- **Couverture de code + SonarQube (bonus)** : `sonar-project.properties` à la racine, scripts `npm run test:coverage` (server et client) générant des rapports LCOV réels et vérifiés.
- **Docker Scout (bonus)** : analyse réellement exécutée sur les deux images de production (voir résultats détaillés ci-dessous), ajout de `.dockerignore` (server et client).
- **OWASP ZAP (bonus)** : `security/zap-baseline.sh`, scan baseline prêt à l'emploi contre le frontend et l'API.

## Résultats réels obtenus

- Tests unitaires : **6/6** passent.
- Tests de composants : **8/8** passent.
- Test d'intégration API ↔ Frontend : **3/3** passent.
- Test d'intégration API ↔ DB (Testcontainers) : **4/4** passent (exécuté avec succès contre un vrai conteneur PostgreSQL).
- Test end-to-end (Cypress) : **2/2** passent — parcours complet ajout / affichage / suppression validé sur l'application démarrée via Docker Compose.
- Couverture de code (v8/Jest) :
  - Client : 100 % lignes/fonctions sur `AddCD`, `CDItem`, `CDList`, `cdService.js`.
  - Server : 100 % lignes/fonctions sur `Controllers/cdController.js`.
- `npm audit` :
  - **Client** : 0 vulnérabilité.
  - **Server** : 0 vulnérabilité sur les dépendances de production (`npm audit --omit=dev`). 5 vulnérabilités (4 modérées, 1 haute) existent uniquement dans la chaîne de dépendances internes de `testcontainers` (via `dockerode`/`undici`/`uuid`), un outil de *test*, jamais embarqué dans l'image de production.

## Incident réel rencontré et corrigé pendant les tests

Lors de la vérification finale de l'application via `docker-compose.prod.yml`, le conteneur PostgreSQL (`image: postgres:latest`) entrait en boucle de redémarrage avec l'erreur :
> *"there appears to be PostgreSQL data in /var/lib/postgresql/data (unused mount/volume)"*

**Cause** : le tag `postgres:latest` pointait vers PostgreSQL 18+, qui a changé le format attendu du répertoire de données, incompatible avec le montage `postgres_data:/var/lib/postgresql/data` utilisé dans le compose. C'est une illustration concrète du risque des tags Docker non figés, déjà identifié plus bas dans ce document pour les images `node`/`nginx`.

**Correctif appliqué** : `image: postgres:latest` → `image: postgres:16-alpine` dans `docker-compose.prod.yml`, après suppression du volume corrompu (`docker compose down --volumes`). L'application fonctionne depuis normalement de bout en bout (API, frontend, et test E2E Cypress passant).

## Docker Scout — résultats réels (exécuté avec Docker Desktop)

### Backend (`cd-audio-backend`, base `node:24` détectée — le tag `node:lts` du `Dockerfile` résout actuellement vers Node 24)

| Sévérité | Nombre |
|---|---|
| CRITICAL | 2 |
| HIGH | 24 |
| MEDIUM | 28 |
| LOW | 205 |
| UNSPECIFIED | 93 |
| **Total** | **352 vulnérabilités, 58 packages concernés** |

Image de base actuelle (`node:24`) : 409 MB, 695 packages, dont 2C/21H/23M/203L/93? de vulnérabilités.

**Recommandation Docker Scout (`docker scout recommendations`)** — deux alternatives proposées, toutes deux réduisant drastiquement la surface de vulnérabilités sans régression :

| Tag proposé | Taille | Packages | Vulnérabilités | Gain |
|---|---|---|---|---|
| `node:24-slim` | 80 MB (-313 MB) | 273 (-422) | 1C · 3H · 6M · 28L · 11? | -1C, -18H, -17M, -175L, -82? |
| `node:26-slim` (tag préféré) | 85 MB (-309 MB) | 258 (-437) | 1C · 3H · 4M · 27L · 4? | -1C, -18H, -19M, -176L, -89? |

→ Docker Scout confirme qu'aucune régression fonctionnelle n'est introduite par ce changement ("*introduces no new vulnerability*"), seulement des suppressions de packages inutiles (image `slim`, sans les outils de build/OS complets de l'image Debian par défaut).

**Proposition de `Dockerfile` durci** (non appliquée au fichier original pour ne pas modifier le sujet du professeur, fournie ici à titre de proposition) :
```dockerfile
FROM node:24-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 5005
CMD ["node", "server.js"]
```

Autres points relevés en revue manuelle du `server/Dockerfile` :
| Problème | Risque |
|---|---|
| Pas de `USER` non-root | Le process tourne en `root` dans le conteneur |
| `npm install` au lieu de `npm ci` | Build non déterministe, dérive possible par rapport au lockfile |
| Pas de multi-stage | `devDependencies` (`nodemon`) embarquées dans l'image finale |
| `EXPOSE 5000` alors que l'app écoute sur `5005` (`PORT` par défaut) | Incohérence avec `docker-compose.prod.yml` qui mappe `5005:5005` |
| Pas de `.dockerignore` (corrigé dans ce rendu) | `node_modules` local risquait d'être copié dans l'image |

### Frontend (`cd-audio-frontend`, base `nginx:1`)

| Sévérité | Nombre |
|---|---|
| CRITICAL | 1 |
| HIGH | 6 |
| MEDIUM | 11 |
| LOW | 68 |
| UNSPECIFIED | 29 |

Image de base : 63 MB, 233 packages, runtime nginx 1.31.2, poussée il y a 2 semaines.

**Recommandation Docker Scout** : *"This image version is up to date"* et *"There are no tag recommendations at this time"* — contrairement au backend, l'image `nginx:1` utilisée est déjà la plus récente/optimale disponible ; les vulnérabilités restantes sont inhérentes à cette base et ne peuvent pas être réduites par un simple changement de tag à ce jour.

Points relevés en revue manuelle du `client/Dockerfile` :
| Problème | Risque |
|---|---|
| `FROM node:lts-slim` / `FROM nginx:latest` (tags flottants, non figés à une version précise) | Risque de dérive de CVE ou de rupture (cf. incident PostgreSQL ci-dessus) malgré une image déjà à jour aujourd'hui |
| `npm install` au lieu de `npm ci` | Build non déterministe |
| Pas de `USER` non-root sur l'étage `nginx` | `nginx` tourne en root par défaut |
| Pas de `.dockerignore` (corrigé dans ce rendu) | Idem backend |

Proposition : figer les tags (`node:24-slim`, `nginx:1.31-alpine`), utiliser `npm ci`, et envisager `nginxinc/nginx-unprivileged` pour l'étage final.

## SonarQube — résultats réels (exécuté avec Docker Desktop + `@sonar/scan`)

Analyse lancée localement (SonarQube Community Build en conteneur Docker) via le scanner officiel `@sonar/scan`, en s'appuyant sur `sonar-project.properties` et les rapports de couverture LCOV générés par `npm run test:coverage` (server + client).

| Métrique | Résultat |
|---|---|
| **Quality Gate** | **Passed** |
| Lignes de code analysées | 314 |
| Sécurité | 4 problèmes ouverts (note **D**) |
| Fiabilité | 0 problème (note **A**) |
| Maintenabilité | 2 problèmes (note **A**) |
| Couverture de code | 75,7 % (131 lignes à couvrir) |
| Duplication de code | 0,0 % |

**Les 4 problèmes de sécurité relevés** — ils recoupent et confirment de manière indépendante les points déjà identifiés manuellement dans ce document :

| Fichier | Sévérité | Problème |
|---|---|---|
| `server/Dockerfile` | High | `COPY . .` copie récursivement le contexte de build, risque d'inclure des données sensibles dans l'image |
| `server/app.js` | Medium | `cors()` activé sans restriction d'origine — **confirme le point 5** ci-dessous |
| `server/Dockerfile` | Low | L'image `node` tourne avec l'utilisateur `root` par défaut — **confirme la revue Docker Scout** ci-dessus |
| `server/app.js` | Low | Express expose implicitement sa version via le header `X-Powered-By` par défaut |

→ Le dernier point (header `X-Powered-By`) est une trouvaille supplémentaire, non identifiée lors de la revue manuelle initiale : Express ajoute ce header par défaut, ce qui facilite le fingerprinting technique de l'application par un attaquant. Correctif simple : `app.disable("x-powered-by")` dans `server/app.js`, ou utiliser le middleware `helmet`.

## Propositions d'amélioration sur l'application

1. **Validation des entrées côté API** : `addCD` insère directement `title`, `artist`, `year` sans valider leur présence/type. Un `title`/`artist` manquant ou un `year` non numérique remonte une erreur 500 générique (violation de contrainte `NOT NULL` ou erreur de type PostgreSQL) au lieu d'un 400 explicite. Une validation (ex. `express-validator` ou vérification manuelle) donnerait des messages d'erreur plus clairs au frontend.
2. **Gestion des erreurs trop permissive** : les trois handlers du contrôleur renvoient `error.message` brut au client (`res.status(500).json({ error: error.message })`), ce qui peut exposer des détails internes (structure de requêtes SQL, etc.). Préférer un message générique côté client et logguer le détail côté serveur.
3. **UX du frontend** : `Home.jsx` recharge toute la page (`window.location.reload()`) après l'ajout d'un CD au lieu de simplement rafraîchir la liste comme le fait déjà `CDList` après une suppression. Cela casse l'expérience utilisateur (flash de la page) et complique les tests E2E. Il serait plus cohérent de faire remonter un callback de rafraîchissement local, comme pour la suppression.
4. **`id` en paramètre d'URL non validé** : `deleteCD` utilise `req.params.id` directement dans la requête paramétrée (donc pas d'injection SQL), mais un `id` non numérique retourne aussi un 500 plutôt qu'un 400/404. Un CD inexistant ne renvoie pas non plus de 404 (la suppression "réussit" silencieusement même si 0 ligne est affectée).
5. **Configuration/sécurité** : `cors()` est utilisé sans restriction d'origine (`app.use(cors())`), ce qui autorise n'importe quel domaine à appeler l'API. À restreindre à l'origine du frontend en production. *(confirmé indépendamment par SonarQube — sévérité Medium)*
6. **Fichiers `.env`** : `server/.env` et `client/.env` sont vides/factices ici mais suivis par git (aucun des deux n'est dans un `.gitignore`). Il serait préférable de fournir un `.env.example` documenté et d'ignorer les vrais fichiers `.env`.
7. **Images Docker de base non figées** (`node:lts`, `postgres:latest`, `nginx:latest`) : confirmé en pratique par l'incident PostgreSQL documenté ci-dessus et par les recommandations Docker Scout sur le backend. Figer des tags précis (`node:24-slim`, `postgres:16-alpine`, `nginx:1.31-alpine`) réduit à la fois la surface de vulnérabilités et le risque de rupture inattendue lors d'un simple `docker compose up --build`.
8. **Fingerprinting du framework** : Express expose son header `X-Powered-By` par défaut, révélant la technologie backend utilisée. *(relevé par SonarQube — sévérité Low)*. Correctif simple : `app.disable("x-powered-by")` dans `server/app.js`.

## Points bonus — état final

- **SonarQube** : exécuté réellement (Quality Gate **Passed**, 314 lignes analysées, 75,7 % de couverture, 0 % de duplication, 4 issues de sécurité identifiées et recoupées avec les autres analyses — voir résultats détaillés ci-dessus).
- **Docker Scout** : exécuté réellement (voir résultats détaillés ci-dessus) — 352 vulnérabilités identifiées côté backend avec recommandation concrète et chiffrée (`node:24-slim`/`node:26-slim`, -313 MB, -422 packages, -18 vulnérabilités HIGH), et 115 vulnérabilités côté frontend (image déjà optimale, aucun changement de tag recommandé à ce jour).
- **OWASP ZAP** : script prêt (`security/zap-baseline.sh`) contre le frontend et l'API démarrés.
