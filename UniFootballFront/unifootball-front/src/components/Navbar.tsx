import { useNavigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  referee: 'Árbitro',
  player: 'Jugador',
}

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'badge-green',
  referee: 'badge-blue',
  player: 'badge-gray',
}

interface NavbarProps {
  /** Botón opcional a la izquierda (ej. "← Volver"). */
  back?: { label: string; to: number | string }
}

export default function Navbar({ back }: NavbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <nav className="navbar">
      <button
        type="button"
        className="navbar-brand"
        onClick={() => navigate('/dashboard')}
      >
        UNI<span>FOOTBALL</span>
      </button>
      <div className="navbar-actions" style={{ alignItems: 'center' }}>
        {back && (
          <button
            className="btn btn-ghost"
            onClick={() =>
              typeof back.to === 'number'
                ? navigate(back.to)
                : navigate(back.to)
            }
          >
            {back.label}
          </button>
        )}
        {user && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text2)',
            }}
          >
            {user.name}
            <span className={`badge ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABEL[user.role]}
            </span>
          </span>
        )}
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
  )
}
