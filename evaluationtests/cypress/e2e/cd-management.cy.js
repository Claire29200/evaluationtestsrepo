describe("Gestion des CD Audio (E2E)", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("affiche la page d'accueil avec le formulaire d'ajout et la section liste", () => {
    cy.contains("h1", "Gestion des CD").should("be.visible");
    cy.contains("h2", "Ajouter un CD").should("be.visible");
    cy.contains("h2", "Liste des CD").should("be.visible");
  });

  it("permet d'ajouter un CD, de le voir apparaître dans la liste, puis de le supprimer", () => {
    const cd = {
      title: `CD E2E ${Date.now()}`,
      artist: "Testcypress",
      year: "2024",
    };

    // 1. Ajout d'un CD
    cy.get('input[name="title"]').type(cd.title);
    cy.get('input[name="artist"]').type(cd.artist);
    cy.get('input[name="year"]').type(cd.year);
    cy.contains("button", "Ajouter").click();

    // AddCD déclenche un window.location.reload() après ajout : on attend
    // que la page se recharge puis que la liste soit rafraîchie.
    cy.contains("h1", "Gestion des CD").should("be.visible");

    // 2. Affichage du CD nouvellement ajouté dans la liste
    cy.contains("li", cd.title, { timeout: 10000 }).within(() => {
      cy.contains(`${cd.title} - ${cd.artist} (${cd.year})`).should("be.visible");
    });

    // 3. Suppression du CD
    cy.contains("li", cd.title)
      .find("button.delete-btn")
      .click();

    cy.contains("li", cd.title).should("not.exist");
  });
});
