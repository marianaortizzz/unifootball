import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import TournamentsPage from '../pages/TournamentsPage'
import { AuthProvider } from '../context/AuthContext'
import client from '../api/client'

// Unit tests de componentes (aislados): la API se mockea por completo.
vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const mockedClient = vi.mocked(client, true)

function renderApp(ui: ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  )
}

const setUser = (role: 'admin' | 'player') => {
  localStorage.setItem('token', 'tok')
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 'u1', name: 'Demo', email: 'd@uni.edu', role }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedClient.get.mockResolvedValue({ data: [] })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('LoginPage — validación de campos requeridos (TC-UNIT-008)', () => {
  it('el campo email es required', () => {
    // Arrange + Act
    renderApp(<LoginPage />)
    // Assert
    const email = screen.getByTestId('login-email') as HTMLInputElement
    expect(email.required).toBe(true)
  })

  it('el campo password es required', () => {
    // Arrange + Act
    renderApp(<LoginPage />)
    // Assert
    const password = screen.getByTestId('login-password') as HTMLInputElement
    expect(password.required).toBe(true)
  })
})

describe('TournamentsPage — gateo de rol en el frontend (TC-UNIT-009)', () => {
  it('un admin SÍ ve el botón "+ Nuevo torneo"', async () => {
    // Arrange
    setUser('admin')
    // Act
    renderApp(<TournamentsPage />)
    await screen.findByTestId('tournaments-title')
    // Assert
    expect(screen.queryByTestId('new-tournament-btn')).not.toBeNull()
  })

  it('un jugador NO ve el botón "+ Nuevo torneo"', async () => {
    // Arrange
    setUser('player')
    // Act
    renderApp(<TournamentsPage />)
    await screen.findByTestId('tournaments-title')
    // Assert
    expect(screen.queryByTestId('new-tournament-btn')).toBeNull()
  })
})
