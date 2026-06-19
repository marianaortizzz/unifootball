/// <reference types="cypress" />

// TC-E2E-SESSION — Gestion de sesion: rutas protegidas, persistencia y logout
// (rubrica 5.1: "recuperacion de contrasena / gestion de sesion").
describe('Gestion de sesion y rutas protegidas', () => {
  it('redirige a /login al entrar a una ruta protegida sin sesion', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/login')
    cy.getByTestId('login-submit').should('be.visible')
  })

  it('permite el acceso a rutas protegidas con sesion activa', () => {
    cy.loginAsAdmin()
    cy.visit('/tournaments')
    cy.getByTestId('tournaments-title').should('be.visible')
    cy.url().should('include', '/tournaments')
  })

  it('mantiene la sesion tras recargar la pagina', () => {
    cy.loginAsAdmin()
    cy.visit('/dashboard')
    cy.reload()
    cy.getByTestId('dashboard-title').should('be.visible')
    cy.url().should('include', '/dashboard')
  })

  it('cierra sesion y bloquea de nuevo las rutas protegidas', () => {
    cy.loginAsAdmin()
    cy.visit('/dashboard')
    cy.getByTestId('logout-btn').click()
    cy.url().should('include', '/login')
    // Tras salir, el dashboard vuelve a estar protegido.
    cy.visit('/dashboard')
    cy.url().should('include', '/login')
  })
})
