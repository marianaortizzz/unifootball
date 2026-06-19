import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role ?? 'player'

  const roleHint =
    role === 'admin'
      ? 'Gestiona torneos, equipos, plantillas y partidos.'
      : role === 'referee'
        ? 'Registra resultados y eventos de tus partidos.'
        : 'Sigue torneos, posiciones, partidos en vivo y tus estadísticas.'

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="dashboard-hero">
          <h1>DASHBOARD</h1>
          <p>
            Hola {user?.name ?? ''} · {roleHint}
          </p>
        </div>
        <div className="dashboard-grid">
          <button
            type="button"
            className="dashboard-action"
            onClick={() => navigate('/tournaments')}
          >
            <span className="action-icon" aria-hidden="true">
              🏆
            </span>
            <div className="action-title">Torneos</div>
            <div className="action-desc">
              {role === 'admin'
                ? 'Crea torneos, inscribe equipos y arma el calendario'
                : 'Posiciones, fixture y partidos en vivo'}
            </div>
          </button>

          <button
            type="button"
            className="dashboard-action"
            onClick={() => navigate('/teams')}
          >
            <span className="action-icon" aria-hidden="true">
              ⚽
            </span>
            <div className="action-title">Equipos</div>
            <div className="action-desc">
              {role === 'admin'
                ? 'Crea equipos y arma las plantillas'
                : 'Consulta equipos y plantillas'}
            </div>
          </button>

          <button
            type="button"
            className="dashboard-action"
            onClick={() => navigate(`/players/${user?.id ?? ''}`)}
          >
            <span className="action-icon" aria-hidden="true">
              📊
            </span>
            <div className="action-title">Mis estadísticas</div>
            <div className="action-desc">Goles, asistencias y tarjetas</div>
          </button>

          <button
            type="button"
            className="dashboard-action"
            onClick={() => navigate('/tournaments')}
          >
            <span className="action-icon" aria-hidden="true">
              🔴
            </span>
            <div className="action-title">En vivo</div>
            <div className="action-desc">
              {role === 'referee'
                ? 'Entra a un partido para cargar marcador y eventos'
                : 'Seguimiento de partidos en tiempo real'}
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
