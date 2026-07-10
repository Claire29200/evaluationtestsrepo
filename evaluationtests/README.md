# 📌 **Mode d'emploi : Lancer l'Application de Gestion de CD Audio avec Docker**

## 🛠️ **Prérequis**
Avant de commencer, assurez-vous d'avoir installé :
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 🚀 **1. Cloner le projet**
```sh
git clone <adresse repo>
cd <nom du dossier>
```

## 📦 **2. Configuration de l'environnement**
Créez un fichier `.env` dans le dossier **server** et ajoutez :

```ini
DB_USER=user
DB_PASSWORD=password
DB_NAME=cd_database
DB_HOST=postgres
DB_PORT=5432
PORT=5005
```

Modifiez en fonction de votre configuration `docker-compose.prod.yml`ou `docker-compose.dev.yml`

## 🛠️ **3. Lancer l’application avec Docker Compose**
Dans le répertoire racine du projet, exécutez :
Pour un déploiement production :
```sh
docker compose -f docker-compose.prod.yml up -d --build
```

Pour un déploiement de développement (uniquement base de donnée) :
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
La version mise en production est pensée pour tout faire automatiquement

## 🌍 **5. Accéder à l’application**
- **Backend (API REST) :** `http://localhost:5005/api/cds`
- **Frontend (React) :** `http://localhost:3000`

## 📌 **6. Tester l’application**
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
docker logs -f backend
```

## 🛑 **7. Arrêter l’application**
```sh
docker-compose down
```

## 🚀 **7. Création images**
Si vous souhaitez concevoir les images, notamment pour effectuer un docker scout, vous pouvez lancer les commandes suivantes :
```sh
docker build -t cd-audio-backend -f server/Dockerfile ./server
docker build -t cd-audio-frontend -f client/Dockerfile ./client
```

---

🚀 **Votre application est prête et fonctionnelle avec Docker !** 🎉

---

## 🧪 **8. Lancer les tests**

### 8.1. Tests unitaires (backend)
Testent le contrôleur `cdController` avec le pool PostgreSQL mocké (aucune base requise).
```sh
cd server
npm install
npm run test:unit
```

### 8.2. Tests d'intégration (backend)
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

### 8.3. Tests de composants (frontend, bonus)
```sh
cd client
npm install
npm test
```

### 8.4. Tests end-to-end (Cypress)
Nécessitent que le backend (`:5005`) et le frontend (`:3000`) tournent réellement (via Docker Compose prod, ou `npm run dev` dans `server/` et `client/`).
```sh
npm install
npm run cypress:open   # mode interactif
npm run test:e2e       # mode headless (CI)
```
Le scénario couvre : ajout d'un CD, affichage dans la liste, puis suppression.

### 8.5. Tout lancer
| Étage | Commande | Prérequis |
|---|---|---|
| Unitaire (server) | `cd server && npm run test:unit` | aucun |
| Intégration API/DB (server) | `cd server && npm run test:integration` | Docker |
| Intégration API/Frontend (client) | `cd client && npm test -- src/services/__tests__/cdService.integration.test.js` | aucun |
| Composants (client) | `cd client && npm test` | aucun |
| E2E (racine) | `npm run test:e2e` | app démarrée (Docker/`npm run dev`) |

---

## 🏅 **9. Points bonus (qualité & sécurité)**

### 9.1. Couverture de code / SonarQube
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

### 9.2. Docker Scout
```sh
docker build -t cd-audio-backend -f server/Dockerfile ./server
docker build -t cd-audio-frontend -f client/Dockerfile ./client
./security/docker-scout.sh
```
Voir `return.md` pour la revue manuelle des `Dockerfile` et les propositions d'amélioration.

### 9.3. OWASP ZAP (scan baseline)
Avec l'application démarrée (frontend `:3000`, backend `:5005`) :
```sh
./security/zap-baseline.sh
```
Les rapports sont générés dans `zap-reports/`.