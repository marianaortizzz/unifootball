/// <reference types="cypress" />
import 'cypress-axe'

// ---------------------------------------------------------------------------
// Comandos personalizados (rubrica 5.2: "custom commands para acciones
// repetidas" + "beforeEach hace login via API directamente, no por la UI").
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'referee' | 'player'
}

const api = () => Cypress.env('apiUrl') as string

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Selector estable por data-testid (nunca clases CSS). */
      getByTestId(id: string): Chainable<JQuery<HTMLElement>>
      /** Inicia sesion contra la API y deja el token en localStorage. */
      loginByApi(email: string, password: string): Chainable<SessionUser>
      /** Atajo: inicia sesion como el admin del seed. */
      loginAsAdmin(): Chainable<SessionUser>
      /** Inicia sesion por la UI (flujo real de formulario). */
      loginByUi(email: string, password: string): Chainable<void>
      /** Registra un jugador nuevo (email unico) y devuelve sus credenciales. */
      registerPlayer(): Chainable<{ email: string; password: string }>
      /** Borra un torneo por id (limpieza entre tests). */
      deleteTournamentByApi(id: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('getByTestId', (id: string) =>
  cy.get(`[data-testid="${id}"]`),
)

Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  return cy
    .request('POST', `${api()}/auth/login`, { email, password })
    .then((res) => {
      expect(res.status).to.eq(200)
      const { accessToken, user } = res.body
      // Inyecta el token en el origen de la app (localhost) ANTES de que
      // React monte, para que AuthProvider arranque autenticado. El
      // localStorage persiste en los cy.visit posteriores del mismo test.
      cy.visit('/login', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', accessToken)
          win.localStorage.setItem('user', JSON.stringify(user))
        },
      })
      return cy.wrap(user as SessionUser, { log: false })
    })
})

Cypress.Commands.add('loginAsAdmin', () =>
  cy.loginByApi(Cypress.env('adminEmail'), Cypress.env('password')),
)

Cypress.Commands.add('loginByUi', (email: string, password: string) => {
  cy.visit('/login')
  cy.getByTestId('login-email').type(email)
  cy.getByTestId('login-password').type(password, { log: false })
  cy.getByTestId('login-submit').click()
})

Cypress.Commands.add('registerPlayer', () => {
  const email = `e2e-player-${Date.now()}@uni.edu`
  const password = 'Password123'
  return cy
    .request('POST', `${api()}/auth/register`, {
      email,
      name: 'E2E Player',
      password,
      role: 'player',
    })
    .then((res) => {
      expect(res.status).to.be.oneOf([200, 201])
      return { email, password }
    })
})

Cypress.Commands.add('deleteTournamentByApi', (id: string) => {
  const token = window.localStorage.getItem('token')
  cy.request({
    method: 'DELETE',
    url: `${api()}/tournaments/${id}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    failOnStatusCode: false,
  })
})
