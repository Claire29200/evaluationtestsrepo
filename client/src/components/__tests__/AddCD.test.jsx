import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCD from "../AddCD";
import { addCD } from "../../services/cdService";

vi.mock("../../services/cdService", () => ({
  addCD: vi.fn(),
}));

describe("AddCD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soumet le formulaire et appelle addCD puis onAdd avec les bonnes valeurs", async () => {
    addCD.mockResolvedValue({ id: 1, title: "Nevermind", artist: "Nirvana", year: "1991" });
    const onAdd = vi.fn();
    const user = userEvent.setup();

    render(<AddCD onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText("Titre du CD"), "Nevermind");
    await user.type(screen.getByPlaceholderText("Artiste"), "Nirvana");
    await user.type(screen.getByPlaceholderText("Année"), "1991");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(addCD).toHaveBeenCalledWith({ title: "Nevermind", artist: "Nirvana", year: "1991" });
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("réinitialise le formulaire après un ajout réussi", async () => {
    addCD.mockResolvedValue({ id: 1 });
    const user = userEvent.setup();

    render(<AddCD onAdd={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText("Titre du CD");
    await user.type(titleInput, "Nevermind");
    await user.type(screen.getByPlaceholderText("Artiste"), "Nirvana");
    await user.type(screen.getByPlaceholderText("Année"), "1991");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(titleInput).toHaveValue("");
  });

  it("n'appelle pas addCD si un champ obligatoire est manquant", async () => {
    const user = userEvent.setup();
    render(<AddCD onAdd={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Titre du CD"), "Nevermind");
    await user.type(screen.getByPlaceholderText("Artiste"), "Nirvana");
    // Année volontairement laissée vide.
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(addCD).not.toHaveBeenCalled();
  });
});
