import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await client.post('/auth/login', { email, password })
      login(res.data.accessToken, res.data.user)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          UNI<span>FOOTBALL</span>
        </div>
        <div className="login-sub">Torneos universitarios</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              data-testid="login-email"
              className="form-input"
              type="email"
              placeholder="usuario@universidad.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              data-testid="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <button
            className="btn-login"
            type="submit"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
          {error && (
            <div
              className="login-error"
              id="login-error"
              role="alert"
              data-testid="login-error"
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </main>
  )
}
