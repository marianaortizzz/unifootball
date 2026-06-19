import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import TeamsPage from '../pages/TeamsPage'
import { AuthProvider } from '../context/AuthContext'
import client from '../api/client'

// TC-SEC-006 — A03 (Injection / XSS): los datos del usuario deben mostrarse
// ESCAPADOS en el frontend. React escapa todo el texto por defecto (y el
// proyecto no usa dangerouslySetInnerHTML), así que un payload malicioso
// guardado como dato (ej. el nombre de un equipo) se renderiza como texto
// plano y nunca se ejecuta.

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const mockedClient = vi.mocked(client, true)

// Payload clásico de XSS almacenado: si NO se escapara, el navegador crearía
// un <img> y dispararía onerror.
const XSS_PAYLOAD = '<img src=x onerror="document.title=\'hacked-by-xss\'">'

function renderApp(ui: ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('token', 'tok')
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 'u1',
      name: 'Demo',
      email: 'd@uni.edu',
      role: 'player',
    }),
  )
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.title = ''
})

describe('Seguridad — A03 XSS (escape de datos del usuario en el frontend)', () => {
  it('TC-SEC-006: un nombre de equipo con HTML malicioso se muestra como texto y NO se ejecuta', async () => {
    mockedClient.get.mockResolvedValue({
      data: [{ id: 't1', name: XSS_PAYLOAD, logoUrl: null, description: null }],
    })

    const { container } = renderApp(<TeamsPage />)

    // 1) El payload aparece como TEXTO literal (escapado), no interpretado.
    expect(await screen.findByText(XSS_PAYLOAD)).toBeDefined()

    // 2) React NO creó un elemento <img> a partir del dato del usuario.
    expect(container.querySelector('img')).toBeNull()

    // 3) El onerror nunca se ejecutó: el título no fue alterado.
    expect(document.title).not.toBe('hacked-by-xss')
  })
})
