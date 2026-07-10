// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { createServer } from "http";
import { createRequire } from "module";

// Ce test vérifie l'intégration réelle entre la couche service du frontend
// (cdService.js, celle utilisée par AddCD/CDList via axios) et l'API Express
// réelle (routes + contrôleur), en ne remplaçant que le driver PostgreSQL par
// un magasin en mémoire. Cela valide le contrat HTTP (routes, méthodes,
// codes de statut, formes JSON) réellement consommé par le frontend.
const require = createRequire(import.meta.url);

describe("Intégration frontend (cdService) <-> API Express", () => {
  let server;
  let baseUrl;
  let getCDs;
  let addCD;
  let deleteCD;
  let store;

  beforeAll(async () => {
    const dbPath = require.resolve("../../../../server/configs/db.js");

    const fakePool = {
      query: vi.fn(async (sql, params = []) => {
        if (sql.startsWith("SELECT")) {
          return { rows: [...store].sort((a, b) => a.id - b.id) };
        }
        if (sql.startsWith("INSERT")) {
          const [title, artist, year] = params;
          const row = { id: store.length ? Math.max(...store.map((c) => c.id)) + 1 : 1, title, artist, year };
          store.push(row);
          return { rows: [row] };
        }
        if (sql.startsWith("DELETE")) {
          const [id] = params;
          store = store.filter((cd) => String(cd.id) !== String(id));
          return {};
        }
        throw new Error(`Requête SQL inattendue dans le test: ${sql}`);
      }),
    };

    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: fakePool,
    };

    const appPath = require.resolve("../../../../server/app.js");
    delete require.cache[appPath];
    const app = require("../../../../server/app.js");

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/cds`;

    vi.stubEnv("VITE_API_URL", baseUrl);
    ({ getCDs, addCD, deleteCD } = await import("../cdService.js"));
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    store = [];
  });

  it("getCDs() récupère la liste vide initiale depuis l'API réelle", async () => {
    const cds = await getCDs();
    expect(cds).toEqual([]);
  });

  it("addCD() puis getCDs() reflète le CD ajouté via l'API réelle", async () => {
    const created = await addCD({ title: "Nevermind", artist: "Nirvana", year: 1991 });
    expect(created).toMatchObject({ title: "Nevermind", artist: "Nirvana", year: 1991 });
    expect(created.id).toBeDefined();

    const cds = await getCDs();
    expect(cds).toHaveLength(1);
    expect(cds[0]).toMatchObject({ title: "Nevermind", artist: "Nirvana", year: 1991 });
  });

  it("deleteCD() supprime bien le CD via l'API réelle", async () => {
    const created = await addCD({ title: "Rumours", artist: "Fleetwood Mac", year: 1977 });

    await deleteCD(created.id);

    const cds = await getCDs();
    expect(cds).toEqual([]);
  });
});
