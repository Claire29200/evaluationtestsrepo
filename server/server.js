require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
