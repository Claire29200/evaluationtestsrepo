import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CDItem from "../CDItem";

describe("CDItem", () => {
  const cd = { id: 1, title: "OK Computer", artist: "Radiohead", year: 1997 };

  it("affiche le titre, l'artiste et l'année du CD", () => {
    render(<CDItem cd={cd} onDelete={vi.fn()} />);

    expect(screen.getByText("OK Computer - Radiohead (1997)")).toBeInTheDocument();
  });

  it("appelle onDelete avec l'id du CD au clic sur le bouton supprimer", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<CDItem cd={cd} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /supprimer/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
