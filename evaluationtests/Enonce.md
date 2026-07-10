# Énoncé de l'examen – Environnement de Test

### **Sujet : Tests d’une application de gestion de CD Audio**
Vous êtes chargé(e) d’écrire des tests pour une application web de gestion de CD Audio. L’application repose sur une architecture full-stack avec :

- **Backend** : Node.js avec Express et PostgreSQL
- **Frontend** : React avec Vite
- **Base de données** : PostgreSQL (gérée avec Docker ou via une instance local)
- **Outils de tests** :
  - Tests unitaires : Mocha / Jest
  - Tests d’intégration : Mocha / Jest (optionnellement avec Testcontainers)
  - Tests end-to-end : Cypress / Puppeteer

---

### **Travail demandé**
1. **Tests Unitaires** (Obligatoire)  
   Implémentez des tests unitaires sur les éléments ou cela est possible.

2. **Tests d’Intégration** (Obligatoire)  
   Implémentez des tests d’intégration pour valider l’interaction entre :
   - L’API et la base de données
   - L’API et le frontend

3. **Tests End-to-End (E2E)** (Obligatoire)  
   Rédigez un test e2e simulant :
   - L’ajout d’un CD
   - L’affichage des CD disponibles
   - La suppression d’un CD

4. **(Optionnel)** Utilisation de **Testcontainers** pour un environnement PostgreSQL isolé lors des tests d’intégration.

5. **Points supplémentaire** Des points supplémentaires seront attribué en cas :
- De création de test de composant
- De test SonarQube
- De test DockerScout avec proposition d'amélioration
- De test Owasp Zap basique


*Pour les propositions d'améliorations ou les commentaires remplissez le md : **return.md***