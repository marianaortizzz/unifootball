/// <reference types="cypress" />

// TC-E2E-TEAMS — Gestion de equipos (crear equipo + ver plantilla).
// Nota: la API no expone DELETE /teams/:id, por eso cada equipo se crea con
// un nombre unico. Para resetear todo: cd backend && npm run seed.
describe('Equipos — gestion de equipos', () => {
  beforeEach(() => {
    cy.loginAsAdmin()
    cy.visit('/teams')
    cy.getByTestId('teams-title').should('be.visible')
  })

  it('un admin crea un equipo nuevo y aparece en la lista', () => {
    const name = `Equipo E2E ${Date.now()}`
    cy.intercept('POST', '**/teams').as('createTeam')

    cy.getByTestId('new-team-btn').click()
    cy.getByTestId('team-name').type(name)
    cy.getByTestId('team-save').click()

    cy.wait('@createTeam').its('response.statusCode').should('eq', 201)
    cy.getByTestId('team-item').contains(name).should('exist')
  })

  it('rechaza un nombre de equipo de menos de 2 caracteres', () => {
    cy.getByTestId('new-team-btn').click()
    cy.getByTestId('team-name').type('a')
    cy.getByTestId('team-save').click()
    cy.getByTestId('team-form-error').should('contain', 'al menos 2')
  })

  it('abre la plantilla de un equipo del seed', () => {
    cy.getByTestId('team-item').first().click()
    cy.contains('Plantilla').should('be.visible')
  })
})
