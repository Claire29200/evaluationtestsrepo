const pool = require("../configs/db");

// Récupérer tous les CD
exports.getAllCDs = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cds ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Ajouter un CD
exports.addCD = async (req, res) => {
  const { title, artist, year } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO cds (title, artist, year) VALUES ($1, $2, $3) RETURNING *",
      [title, artist, year]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supprimer un CD
exports.deleteCD = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM cds WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};