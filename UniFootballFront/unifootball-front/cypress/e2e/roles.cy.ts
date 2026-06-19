/// <reference types="cypress" />

// TC-E2E-ROLES — Roles y permisos: admin vs jugador (rubrica 5.1).
// El gateo de permisos es del frontend (el backend no valida rol): el admin
// ve las acciones de gestion y el jugador no.
describe('Roles y permisos', () => {
  it('el admin ve las acciones de administracion', () => {
    cy.loginAsAdmin()
    cy.visit('/tournaments')
    cy.getByTestId('new-tournament-btn').should('exist')
    cy.visit('/teams')
    cy.getByTestId('new-team-btn').should('exist')
  })

  it('un jugador NO ve las acciones de administracion', () => {
    // Registra un jugador nuevo via API y entra con esa cuenta.
    cy.registerPlayer().then(({ email, password }) => {
      cy.loginByApi(email, password)

      cy.visit('/tournaments')
      cy.getByTestId('tournaments-title').should('be.visible')
      cy.getByTestId('new-tournament-btn').should('not.exist')

      cy.visit('/teams')
      cy.getByTestId('teams-title').should('be.visible')
      cy.getByTestId('new-team-btn').should('not.exist')
    })
  })
})
