import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CDList from "../CDList";
import { getCDs, deleteCD } from "../../services/cdService";

vi.mock("../../services/cdService", () => ({
  getCDs: vi.fn(),
  deleteCD: vi.fn(),
}));

describe("CDList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche 'Aucun CD disponible' quand la liste est vide", async () => {
    getCDs.mockResolvedValue([]);

    render(<CDList />);

    expect(await screen.findByText("Aucun CD disponible")).toBeInTheDocument();
  });

  it("affiche la liste des CD récupérés au montage", async () => {
    getCDs.mockResolvedValue([
      { id: 1, title: "OK Computer", artist: "Radiohead", year: 1997 },
      { id: 2, title: "Discovery", artist: "Daft Punk", year: 2001 },
    ]);

    render(<CDList />);

    expect(await screen.findByText("OK Computer - Radiohead (1997)")).toBeInTheDocument();
    expect(screen.getByText("Discovery - Daft Punk (2001)")).toBeInTheDocument();
    expect(getCDs).toHaveBeenCalledTimes(1);
  });

  it("supprime un CD et rafraîchit la liste", async () => {
    getCDs
      .mockResolvedValueOnce([{ id: 1, title: "OK Computer", artist: "Radiohead", year: 1997 }])
      .mockResolvedValueOnce([]);
    deleteCD.mockResolvedValue();
    const user = userEvent.setup();

    render(<CDList />);

    await screen.findByText("OK Computer - Radiohead (1997)");
    await user.click(screen.getByRole("button", { name: /supprimer/i }));

    expect(deleteCD).toHaveBeenCalledWith(1);
    await waitFor(() => expect(getCDs).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Aucun CD disponible")).toBeInTheDocument();
  });
});
