jest.mock("../../configs/db");

const pool = require("../../configs/db");
const cdController = require("../../Controllers/cdController");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("cdController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllCDs", () => {
    it("renvoie la liste des CD avec un statut 200 implicite", async () => {
      const rows = [
        { id: 1, title: "OK Computer", artist: "Radiohead", year: 1997 },
        { id: 2, title: "Discovery", artist: "Daft Punk", year: 2001 },
      ];
      pool.query.mockResolvedValue({ rows });

      const req = {};
      const res = mockResponse();

      await cdController.getAllCDs(req, res);

      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM cds ORDER BY id ASC");
      expect(res.json).toHaveBeenCalledWith(rows);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("renvoie une erreur 500 si la requête échoue", async () => {
      pool.query.mockRejectedValue(new Error("boom"));

      const req = {};
      const res = mockResponse();

      await cdController.getAllCDs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "boom" });
    });
  });

  describe("addCD", () => {
    it("insère un CD et renvoie un statut 201 avec le CD créé", async () => {
      const created = { id: 1, title: "OK Computer", artist: "Radiohead", year: 1997 };
      pool.query.mockResolvedValue({ rows: [created] });

      const req = { body: { title: "OK Computer", artist: "Radiohead", year: 1997 } };
      const res = mockResponse();

      await cdController.addCD(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        "INSERT INTO cds (title, artist, year) VALUES ($1, $2, $3) RETURNING *",
        ["OK Computer", "Radiohead", 1997]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("renvoie une erreur 500 si l'insertion échoue", async () => {
      pool.query.mockRejectedValue(new Error("insert failed"));

      const req = { body: { title: "X", artist: "Y", year: 2000 } };
      const res = mockResponse();

      await cdController.addCD(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "insert failed" });
    });
  });

  describe("deleteCD", () => {
    it("supprime un CD et renvoie un statut 204", async () => {
      pool.query.mockResolvedValue({});

      const req = { params: { id: "1" } };
      const res = mockResponse();

      await cdController.deleteCD(req, res);

      expect(pool.query).toHaveBeenCalledWith("DELETE FROM cds WHERE id = $1", ["1"]);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("renvoie une erreur 500 si la suppression échoue", async () => {
      pool.query.mockRejectedValue(new Error("delete failed"));

      const req = { params: { id: "1" } };
      const res = mockResponse();

      await cdController.deleteCD(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "delete failed" });
    });
  });
});
