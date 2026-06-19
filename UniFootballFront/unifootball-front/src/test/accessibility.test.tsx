import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import TeamsPage from '../pages/TeamsPage'
import TournamentsPage from '../pages/TournamentsPage'
import Navbar from '../components/Navbar'
import { AuthProvider } from '../context/AuthContext'
import client from '../api/client'

// El cliente HTTP se mockea: las páginas no pegan a ninguna API real.
vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const mockedClient = vi.mocked(client, true)

// Solo evaluamos reglas oficiales WCAG 2.1 A/AA (no "best-practice"),
// que es lo que pide la rúbrica 8.1.
const axeWcag = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
}

type Role = 'admin' | 'referee' | 'player'
function login(role: Role = 'player') {
  localStorage.setItem('token', 'tok')
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 'u1', name: 'Demo', email: 'd@uni.edu', role }),
  )
}

function renderApp(ui: ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedClient.get.mockResolvedValue({ data: [] })
  mockedClient.post.mockResolvedValue({ data: {} })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Accesibilidad WCAG 2.1 (axe + consultas accesibles)', () => {
  // ---------- LoginPage ----------

  it('LoginPage: sin violaciones WCAG (axe)', async () => {
    const { container } = renderApp(<LoginPage />)
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })

  it('LoginPage: los inputs tienen label asociado (P4 WCAG 1.3.1/4.1.2)', () => {
    renderApp(<LoginPage />)
    expect(screen.getByLabelText('Email')).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText('Contraseña')).toHaveProperty(
      'tagName',
      'INPUT',
    )
  })

  it('LoginPage: el error se anuncia (role=alert) y se asocia a los inputs (P5)', async () => {
    mockedClient.post.mockRejectedValueOnce(new Error('401'))
    renderApp(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@uni.edu' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Credenciales inválidas')
    // El input queda enlazado al mensaje de error (aria-describedby).
    expect(
      screen.getByLabelText('Email').getAttribute('aria-describedby'),
    ).toBe('login-error')
  })

  it('LoginPage: existe landmark principal <main>', () => {
    renderApp(<LoginPage />)
    expect(screen.getByRole('main')).toBeDefined()
  })

  // ---------- Navbar ----------

  it('Navbar: sin violaciones WCAG (axe)', async () => {
    login()
    const { container } = renderApp(
      <Navbar back={{ label: '← Volver', to: -1 }} />,
    )
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })

  it('Navbar: el logo es operable por teclado (button, P2 WCAG 2.1.1)', () => {
    login()
    renderApp(<Navbar />)
    expect(screen.getByRole('button', { name: /unifootball/i })).toBeDefined()
  })

  // ---------- DashboardPage ----------

  it('DashboardPage: sin violaciones WCAG (axe)', async () => {
    login()
    const { container } = renderApp(<DashboardPage />)
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })

  it('DashboardPage: las 4 acciones son botones operables por teclado (P2)', () => {
    login()
    const { container } = renderApp(<DashboardPage />)
    const cards = Array.from(container.querySelectorAll('.dashboard-action'))
    expect(cards).toHaveLength(4)
    // Cada tarjeta debe ser un <button> (focuseable y activable con teclado),
    // no un <div onClick>.
    cards.forEach((el) => expect(el.tagName).toBe('BUTTON'))
  })

  // ---------- TeamsPage ----------

  it('TeamsPage: sin violaciones WCAG en el estado vacío (axe)', async () => {
    login('player')
    const { container } = renderApp(<TeamsPage />)
    await screen.findByText(/No hay equipos/i)
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })

  it('TeamsPage: ninguna imagen sin atributo alt (P1 WCAG 1.1.1)', async () => {
    login('player')
    const { container } = renderApp(<TeamsPage />)
    await screen.findByText(/No hay equipos/i)
    container.querySelectorAll('img').forEach((img) => {
      expect(img.getAttribute('alt')).not.toBeNull()
    })
  })

  it('TeamsPage: el formulario "Nuevo equipo" tiene labels asociados (P4)', async () => {
    login('admin')
    const { container } = renderApp(<TeamsPage />)
    fireEvent.click(
      await screen.findByRole('button', { name: /nuevo equipo/i }),
    )

    expect(screen.getByLabelText('Nombre')).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(/Logo/i)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(/Descripción/i)).toHaveProperty(
      'tagName',
      'INPUT',
    )
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })

  // ---------- TournamentsPage ----------

  it('TournamentsPage: sin violaciones WCAG en el estado vacío (axe)', async () => {
    login('player')
    const { container } = renderApp(<TournamentsPage />)
    await waitFor(() => {
      expect(screen.getByText(/No hay torneos/i)).toBeDefined()
    })
    const results = await axe(container, axeWcag)
    expect(results.violations).toEqual([])
  })
})
