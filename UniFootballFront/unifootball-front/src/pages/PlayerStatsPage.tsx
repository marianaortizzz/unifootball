import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface PlayerTotals {
  playerId: string
  matchesPlayed: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  minutesPlayed: number
}

const EMPTY_TOTALS: PlayerTotals = {
  playerId: '',
  matchesPlayed: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  minutesPlayed: 0,
}

export default function PlayerStatsPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [totals, setTotals] = useState<PlayerTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client
      .get(`/stats/players/${userId}`)
      .then((res) => setTotals(res.data))
      .catch(() => setError('Error al cargar estadísticas'))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <>
      <nav className="navbar">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => navigate('/dashboard')}
        >
          UNI<span>FOOTBALL</span>
        </button>
        <div className="navbar-actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Salir
          </button>
        </div>
      </nav>
      <div className="page">
        <div
          className="section-title"
          style={{ fontSize: 36, marginBottom: 24 }}
        >
          ESTADÍSTICAS
        </div>

        {loading && <div className="state-loading">Cargando...</div>}
        {error && <div className="state-error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{totals.goals}</div>
                <div className="stat-label">Goles</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent2)' }}>
                  {totals.assists}
                </div>
                <div className="stat-label">Asistencias</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--yellow)' }}>
                  {totals.yellowCards}
                </div>
                <div className="stat-label">T. Amarillas</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--red)' }}>
                  {totals.redCards}
                </div>
                <div className="stat-label">T. Rojas</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: 28 }}>
                  {totals.minutesPlayed}
                </div>
                <div className="stat-label">Minutos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: 28 }}>
                  {totals.matchesPlayed}
                </div>
                <div className="stat-label">Partidos</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
