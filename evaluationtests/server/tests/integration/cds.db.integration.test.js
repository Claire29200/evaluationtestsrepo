const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const request = require("supertest");
const { PostgreSqlContainer } = require("@testcontainers/postgresql");

jest.setTimeout(120000);

describe("Intégration API <-> PostgreSQL (Testcontainers)", () => {
  let container;
  let app;
  let pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("cd_database")
      .withUsername("user")
      .withPassword("password")
      .start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getPort());
    process.env.DB_USER = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    delete process.env.URI_DB;

    const schema = fs.readFileSync(
      path.join(__dirname, "../../configs/import.sql"),
      "utf-8"
    );
    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await client.connect();
    await client.query(schema);
    await client.end();

    // Requiert les modules après avoir positionné les variables d'env,
    // car configs/db.js construit le Pool au chargement du module.
    jest.resetModules();
    app = require("../../app");
    pool = require("../../configs/db");
  });

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE cds RESTART IDENTITY");
  });

  it("crée un CD via POST /api/cds et le persiste réellement en base", async () => {
    const res = await request(app).post("/api/cds").send({
      title: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      year: 1973,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      year: 1973,
    });
    expect(res.body.id).toBeDefined();

    const dbResult = await pool.query("SELECT * FROM cds WHERE id = $1", [res.body.id]);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].title).toBe("The Dark Side of the Moon");
  });

  it("liste les CD existants via GET /api/cds", async () => {
    await pool.query("INSERT INTO cds (title, artist, year) VALUES ($1,$2,$3)", [
      "Abbey Road",
      "The Beatles",
      1969,
    ]);
    await pool.query("INSERT INTO cds (title, artist, year) VALUES ($1,$2,$3)", [
      "Thriller",
      "Michael Jackson",
      1982,
    ]);

    const res = await request(app).get("/api/cds");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((cd) => cd.title).sort()).toEqual(["Abbey Road", "Thriller"]);
  });

  it("supprime un CD via DELETE /api/cds/:id et le retire réellement de la base", async () => {
    const inserted = await pool.query(
      "INSERT INTO cds (title, artist, year) VALUES ($1,$2,$3) RETURNING *",
      ["Random Access Memories", "Daft Punk", 2013]
    );
    const id = inserted.rows[0].id;

    const res = await request(app).delete(`/api/cds/${id}`);
    expect(res.status).toBe(204);

    const dbResult = await pool.query("SELECT * FROM cds WHERE id = $1", [id]);
    expect(dbResult.rows).toHaveLength(0);
  });

  it("retourne une liste vide quand la table est vide", async () => {
    const res = await request(app).get("/api/cds");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
