# 📌 **Mode d'emploi : Lancer l'Application de Gestion de CD Audio avec Docker**

## 🛠️ **Prérequis**
Avant de commencer, assurez-vous d'avoir installé :
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 🚀 **1. Cloner le projet**
```sh
git clone https://github.com/Claire29200/evaluationtestsrepo.git
cd evaluationtestsrepo
```

## 📦 **2. Configuration de l'environnement**
Créez un fichier `.env` dans le dossier **server**. Le contenu dépend du mode de lancement choisi à l'étape 3 :

**Cas A — déploiement complet via Docker (`docker-compose.prod.yml`)** : le backend tourne lui aussi dans un conteneur, donc `DB_HOST` doit être le nom du service Docker `postgres` (résolu via le réseau interne Docker) :
```ini
DB_USER=user
DB_PASSWORD=password
DB_NAME=cd_database
DB_HOST=postgres
DB_PORT=5432
PORT=5005
```

**Cas B — développement local (`docker-compose.dev.yml` pour la base uniquement + `npm run dev` en local)** : le backend tourne hors Docker, sur votre machine, donc `DB_HOST` doit être `localhost` :
```ini
DB_USER=user
DB_PASSWORD=password
DB_NAME=cd_database
DB_HOST=localhost
DB_PORT=5432
PORT=5005
```

Modifiez ces valeurs en fonction de votre configuration si vous adaptez `docker-compose.prod.yml` ou `docker-compose.dev.yml`.

## 🛠️ **3. Lancer l'application avec Docker Compose**
Dans le répertoire racine du projet, exécutez :

Pour un déploiement production (Cas A ci-dessus) :
```sh
docker compose -f docker-compose.prod.yml up -d --build
```

Pour un déploiement de développement (uniquement base de données, Cas B ci-dessus) :
```sh
docker compose -f docker-compose.dev.yml up -d
```
puis lancer le serveur :
```sh
cd server
npm run dev
```
et dans un autre terminal le client :
```sh
cd client
npm run dev
```

Cela va :
- Démarrer une base de données PostgreSQL
- Lancer le serveur backend Express (prod only)
- Démarrer le frontend React avec Vite (prod only)

## 🛠️ **4. Version Production**
La version mise en production est pensée pour tout faire automatiquement : la base de données, le backend et le frontend sont démarrés et connectés entre eux par Docker Compose sans configuration supplémentaire (hormis le `.env`, Cas A).

## 🌍 **5. Accéder à l'application**
- **Backend (API REST) :** `http://localhost:5005/api/cds`
- **Frontend (React) :** `http://localhost:3000`

## 📌 **6. Tester l'application manuellement**
### **6.1. Vérifier la connexion à la base de données**
```sh
docker exec -it cd_db psql -U user -d cd_database -c "SELECT * FROM cds;"
```
*Pensez à adapter le nom du container `cd_db`, le nom de l'utilisateur `user` et de la base de donnée `cd_database` si vous la modifiez*

### **6.2. Effectuer une requête API avec `curl`**
```sh
curl -X POST "http://localhost:5005/api/cds" -H "Content-Type: application/json" \
-d '{"title": "Test CD", "artist": "Test Artist", "year": 2023}'
```

### **6.3. Vérifier les logs**
```sh
docker logs -f cd_backend
```
*(le conteneur backend s'appelle `cd_backend`, cf. `container_name` dans `docker-compose.prod.yml`)*

## 🛑 **7. Arrêter l'application**
```sh
docker compose -f docker-compose.prod.yml down
```
*(remplacez par `docker-compose.dev.yml` si c'est ce fichier que vous aviez utilisé pour démarrer)*

## 🐳 **8. Création des images**
Si vous souhaitez concevoir les images, notamment pour effectuer un Docker Scout, vous pouvez lancer les commandes suivantes :
```sh
docker build -t cd-audio-backend -f server/Dockerfile ./server
docker build -t cd-audio-frontend -f client/Dockerfile ./client
```

---

🚀 **Votre application est prête et fonctionnelle avec Docker !** 🎉

---

## 🧪 **9. Lancer les tests**

### 9.1. Tests unitaires (backend)
Testent le contrôleur `cdController` avec le pool PostgreSQL mocké (aucune base requise).
```sh
cd server
npm install
npm run test:unit
```

### 9.2. Tests d'intégration (backend)
Deux aspects sont couverts :
- **API ↔ Base de données** : un vrai PostgreSQL est démarré via **Testcontainers** (Docker requis), le schéma `configs/import.sql` est appliqué, puis l'API réelle est appelée via `supertest` pour vérifier la persistance en base.
- **API ↔ Frontend** : le service frontend `client/src/services/cdService.js` (celui utilisé par les composants React) est exécuté tel quel contre l'application Express réelle (routes + contrôleur), afin de valider le contrat HTTP consommé par le frontend.

```sh
# API <-> DB (nécessite Docker)
cd server
npm run test:integration

# API <-> Frontend
cd client
npm install
npm test -- src/services/__tests__/cdService.integration.test.js
```

### 9.3. Tests de composants (frontend, bonus)
```sh
cd client
npm install
npm test
```

### 9.4. Tests end-to-end (Cypress)
Nécessitent que le backend (`:5005`) et le frontend (`:3000`) tournent réellement (via Docker Compose prod, ou `npm run dev` dans `server/` et `client/`).
```sh
npm install
npm run cypress:open   # mode interactif
npm run test:e2e       # mode headless (CI)
```
Le scénario couvre : ajout d'un CD, affichage dans la liste, puis suppression.

### 9.5. Tout lancer
| Étage | Commande | Prérequis |
|---|---|---|
| Unitaire (server) | `cd server && npm run test:unit` | aucun |
| Intégration API/DB (server) | `cd server && npm run test:integration` | Docker |
| Intégration API/Frontend (client) | `cd client && npm test -- src/services/__tests__/cdService.integration.test.js` | aucun |
| Composants (client) | `cd client && npm test` | aucun |
| E2E (racine) | `npm run test:e2e` | app démarrée (Docker/`npm run dev`) |

---

## 🏅 **10. Points bonus (qualité & sécurité)**

### 10.1. Couverture de code / SonarQube
Rapports de couverture au format LCOV, consommables par SonarQube/SonarCloud (`sonar-project.properties` à la racine) :
```sh
cd server && npm run test:coverage   # génère server/coverage/lcov.info
cd client && npm run test:coverage   # génère client/coverage/lcov.info
```

Pour lancer une analyse locale (nécessite Docker) :
```sh
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
# une fois SonarQube démarré (http://localhost:9000, admin/admin) :
npx sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=<votre_token>
```

### 10.2. Docker Scout
```sh
docker build -t cd-audio-backend -f server/Dockerfile ./server
docker build -t cd-audio-frontend -f client/Dockerfile ./client
./security/docker-scout.sh
```
Voir `return.md` pour la revue manuelle des `Dockerfile` et les propositions d'amélioration.

### 10.3. OWASP ZAP (scan baseline)
Avec l'application démarrée (frontend `:3000`, backend `:5005`) :
```sh
./security/zap-baseline.sh
```
Les rapports sont générés dans `zap-reports/`.

---

## ⚠️ **Remarque importante : version de l'image PostgreSQL**
Le tag `image: postgres:latest` peut pointer vers une version majeure récente de PostgreSQL dont le format de répertoire de données n'est pas compatible avec un volume déjà initialisé par une version antérieure (erreur observée : *"there appears to be PostgreSQL data in /var/lib/postgresql/data (unused mount/volume)"*, conteneur en boucle de redémarrage). Ce projet fixe donc la version de l'image PostgreSQL à `postgres:16-alpine` dans `docker-compose.prod.yml` pour garantir un démarrage stable et reproductible. En cas de problème similaire après une modification du `docker-compose.yml`, repartez d'un volume propre :
```sh
docker compose -f docker-compose.prod.yml down --volumes --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build
```
