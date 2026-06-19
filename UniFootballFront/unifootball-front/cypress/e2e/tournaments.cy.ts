/// <reference types="cypress" />

// TC-E2E-TOURNAMENTS — Flujo principal del negocio de extremo a extremo
// (rubrica 5.1: "flujo core del producto" + formularios con validacion).
describe('Torneos — flujo principal (CRUD)', () => {
  let createdId: string | null = null

  beforeEach(() => {
    // Login via API (rapido, no por la UI) antes de cada test.
    cy.loginAsAdmin()
    cy.intercept('POST', '**/tournaments').as('createTournament')
    cy.visit('/tournaments')
    cy.getByTestId('tournaments-title').should('be.visible')
  })

  afterEach(() => {
    // Limpieza: borra el torneo creado para no ensuciar la BD.
    if (createdId) {
      cy.deleteTournamentByApi(createdId)
      createdId = null
    }
  })

  it('un admin crea un torneo y aparece en la lista', () => {
    cy.fixture('tournament').then((t) => {
      cy.getByTestId('new-tournament-btn').click()
      cy.getByTestId('tournament-name').clear().type(t.name)
      cy.getByTestId('tournament-start').type(t.startDate)
      cy.getByTestId('tournament-end').type(t.endDate)
      cy.getByTestId('tournament-save').click()

      cy.wait('@createTournament').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
        createdId = interception.response?.body.id as string
      })

      cy.getByTestId('tournament-item').contains(t.name).should('exist')
    })
  })

  it('rechaza un nombre de menos de 3 caracteres', () => {
    cy.getByTestId('new-tournament-btn').click()
    cy.getByTestId('tournament-name').clear().type('ab')
    cy.getByTestId('tournament-start').type('2026-09-01')
    cy.getByTestId('tournament-end').type('2026-12-15')
    cy.getByTestId('tournament-save').click()
    cy.getByTestId('tournament-form-error').should('contain', 'al menos 3')
  })

  it('exige las fechas de inicio y fin', () => {
    cy.getByTestId('new-tournament-btn').click()
    cy.getByTestId('tournament-name').clear().type('Copa sin fechas')
    cy.getByTestId('tournament-save').click()
    cy.getByTestId('tournament-form-error').should('contain', 'fechas')
  })

  it('no permite que la fecha de fin sea anterior a la de inicio', () => {
    cy.getByTestId('new-tournament-btn').click()
    cy.getByTestId('tournament-name').clear().type('Copa con fechas invertidas')
    cy.getByTestId('tournament-start').type('2026-12-15')
    cy.getByTestId('tournament-end').type('2026-09-01')
    cy.getByTestId('tournament-save').click()
    cy.getByTestId('tournament-form-error').should('contain', 'anterior')
  })

  it('abre el detalle de un torneo del seed', () => {
    cy.getByTestId('tournament-item')
      .first()
      .find('.tournament-name')
      .click()
    cy.url().should('match', /\/tournaments\/[\w-]+$/)
  })
})
