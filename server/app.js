const express = require("express");
const cors = require("cors");
const cdRoutes = require("./Routes/cdRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", cdRoutes);

module.exports = app;
