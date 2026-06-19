/// <reference types="cypress" />

// TC-E2E-ERRORS — Flujos de error criticos: que ve el usuario cuando el
// servidor falla (rubrica 5.1). Se fuerza la respuesta del servidor con
// cy.intercept (rubrica 5.2: controlar respuestas de red).
describe('Flujos de error del servidor', () => {
  // Se limita el intercept al origen de la API (puerto 3000) para NO capturar
  // tambien la carga de la pagina del SPA (localhost:5173/tournaments).
  const apiTournaments = `${Cypress.env('apiUrl')}/tournaments`

  beforeEach(() => {
    cy.loginAsAdmin()
  })

  it('muestra un mensaje de error si la carga de torneos falla (500)', () => {
    cy.intercept('GET', apiTournaments, {
      statusCode: 500,
      body: { message: 'Internal Server Error' },
    }).as('getTournaments')

    cy.visit('/tournaments')
    cy.wait('@getTournaments')
    cy.getByTestId('tournaments-error').should('contain', 'Error al cargar')
  })

  it('muestra el estado vacio cuando no hay torneos', () => {
    cy.intercept('GET', apiTournaments, { statusCode: 200, body: [] }).as(
      'getEmpty',
    )

    cy.visit('/tournaments')
    cy.wait('@getEmpty')
    cy.contains('No hay torneos registrados').should('be.visible')
  })
})
