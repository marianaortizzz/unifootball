/// <reference types="cypress" />

// TC-E2E-AUTH — Login / Logout con credenciales validas e invalidas (rubrica 5.1)
// + verificacion de accesibilidad basica en un flujo critico (rubrica 5.2).
describe('Autenticacion (login/logout)', () => {
  it('inicia sesion con credenciales validas y entra al dashboard', () => {
    cy.loginByUi(Cypress.env('adminEmail'), Cypress.env('password'))
    cy.url().should('include', '/dashboard')
    cy.getByTestId('dashboard-title').should('be.visible')
    cy.getByTestId('navbar-user').should('contain', 'Administrador')
  })

  it('muestra error con credenciales invalidas y permanece en login', () => {
    cy.loginByUi(Cypress.env('adminEmail'), 'contrasena-incorrecta')
    cy.getByTestId('login-error').should('contain', 'Credenciales inválidas')
    cy.url().should('include', '/login')
  })

  it('no envia el formulario si faltan campos requeridos (validacion HTML5)', () => {
    cy.visit('/login')
    cy.getByTestId('login-submit').click()
    // El navegador bloquea el submit: seguimos en /login y sin error de API.
    cy.url().should('include', '/login')
    cy.getByTestId('login-email').then(($el) => {
      expect(($el[0] as HTMLInputElement).validationMessage).to.not.be.empty
    })
  })

  it('la pagina de login no tiene violaciones de accesibilidad criticas', () => {
    cy.visit('/login')
    cy.injectAxe()
    cy.checkA11y(undefined, { includedImpacts: ['critical', 'serious'] })
  })
})
