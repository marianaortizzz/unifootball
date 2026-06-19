import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import client from '../api/client'

interface Team {
  id: string
  name: string
  logoUrl: string | null
  description: string | null
}

interface AppUser {
  id: string
  name: string
  email: string
  role: string
}

interface Member {
  id: string
  userId: string
  jerseyNumber: number | null
  role: 'player' | 'captain' | 'goalkeeper'
  user: { id: string; name: string; email: string }
}

const MEMBER_ROLE_LABEL: Record<Member['role'], string> = {
  captain: 'Capitán',
  goalkeeper: 'Portero',
  player: 'Jugador',
}

export default function TeamsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Team | null>(null)

  // crear equipo
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamForm, setTeamForm] = useState({
    name: '',
    logoUrl: '',
    description: '',
  })
  const [savingTeam, setSavingTeam] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  const loadTeams = () => {
    setLoading(true)
    client
      .get('/teams')
      .then((res) => setTeams(res.data))
      .catch(() => setError('Error al cargar equipos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTeams()
  }, [])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamError(null)
    if (teamForm.name.trim().length < 2) {
      setTeamError('El nombre debe tener al menos 2 caracteres')
      return
    }
    const payload: Record<string, string> = { name: teamForm.name.trim() }
    if (teamForm.logoUrl.trim()) payload.logoUrl = teamForm.logoUrl.trim()
    if (teamForm.description.trim())
      payload.description = teamForm.description.trim()

    setSavingTeam(true)
    try {
      await client.post('/teams', payload)
      setShowTeamModal(false)
      setTeamForm({ name: '', logoUrl: '', description: '' })
      loadTeams()
    } catch {
      setTeamError('No se pudo crear el equipo (¿logo con URL válida?)')
    } finally {
      setSavingTeam(false)
    }
  }

  return (
    <>
      <Navbar back={{ label: 'Dashboard', to: '/dashboard' }} />
      <div className="page">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div className="section-title" style={{ fontSize: 36, margin: 0 }}>
            EQUIPOS
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setTeamForm({ name: '', logoUrl: '', description: '' })
                setTeamError(null)
                setShowTeamModal(true)
              }}
            >
              + Nuevo equipo
            </button>
          )}
        </div>

        {loading && <div className="state-loading">Cargando equipos...</div>}
        {error && <div className="state-error">{error}</div>}
        {!loading && !error && teams.length === 0 && (
          <div className="state-empty">
            No hay equipos. {isAdmin ? 'Crea el primero.' : ''}
          </div>
        )}

        <div className="tournament-grid">
          {teams.map((t) => (
            <div
              key={t.id}
              className="tournament-item"
              onClick={() => setSelected(t)}
            >
              <div style={{ flex: 1 }}>
                <div className="tournament-name">{t.name}</div>
                {t.description && (
                  <div className="tournament-meta">{t.description}</div>
                )}
              </div>
              <button
                className="btn btn-ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(t)
                }}
              >
                Ver plantilla
              </button>
            </div>
          ))}
        </div>
      </div>

      {showTeamModal && (
        <div
          className="modal-overlay"
          onClick={() => !savingTeam && setShowTeamModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Nuevo equipo</div>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label className="form-label" htmlFor="team-name">
                  Nombre
                </label>
                <input
                  id="team-name"
                  className="form-input"
                  autoFocus
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, name: e.target.value })
                  }
                  placeholder="Los Pumas FC"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="team-logo">
                  Logo (URL, opcional)
                </label>
                <input
                  id="team-logo"
                  className="form-input"
                  value={teamForm.logoUrl}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, logoUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="team-desc">
                  Descripción (opcional)
                </label>
                <input
                  id="team-desc"
                  className="form-input"
                  value={teamForm.description}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, description: e.target.value })
                  }
                />
              </div>
              {teamError && <div className="login-error">{teamError}</div>}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowTeamModal(false)}
                  disabled={savingTeam}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingTeam}
                >
                  {savingTeam ? 'Guardando...' : 'Crear equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <RosterModal
          team={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ---------- Plantilla de un equipo ----------
function RosterModal({
  team,
  isAdmin,
  onClose,
}: {
  team: Team
  isAdmin: boolean
  onClose: () => void
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [players, setPlayers] = useState<AppUser[]>([])
  const [form, setForm] = useState({
    userId: '',
    jerseyNumber: '',
    role: 'player',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadMembers = () => {
    setLoading(true)
    client
      .get(`/teams/${team.id}/members`)
      .then((res) => setMembers(res.data))
      .catch(() => setError('Error al cargar la plantilla'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMembers()
    if (isAdmin) {
      client
        .get('/auth/users', { params: { role: 'player' } })
        .then((res) => setPlayers(res.data))
        .catch(() => {})
    }
  }, [team.id])

  const takenIds = new Set(members.map((m) => m.userId))
  const available = players.filter((p) => !takenIds.has(p.id))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.userId) {
      setFormError('Elige un jugador')
      return
    }
    const payload: Record<string, unknown> = {
      userId: form.userId,
      role: form.role,
    }
    if (form.jerseyNumber) payload.jerseyNumber = Number(form.jerseyNumber)
    setSaving(true)
    try {
      await client.post(`/teams/${team.id}/members`, payload)
      setForm({ userId: '', jerseyNumber: '', role: 'player' })
      loadMembers()
    } catch {
      setFormError(
        'No se pudo agregar (¿dorsal repetido o jugador ya inscrito?)',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{team.name} · Plantilla</div>

        {loading && <div className="state-loading">Cargando...</div>}
        {error && <div className="state-error">{error}</div>}

        {!loading &&
          !error &&
          (members.length === 0 ? (
            <div className="state-empty">Sin jugadores aún.</div>
          ) : (
            <table className="uf-table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="rank">{m.jerseyNumber ?? '-'}</td>
                    <td className="team-name">{m.user?.name ?? m.userId}</td>
                    <td>{MEMBER_ROLE_LABEL[m.role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {isAdmin && !loading && (
          <form
            onSubmit={handleAdd}
            style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}
          >
            <div className="form-label" style={{ marginBottom: 8 }}>
              Agregar jugador
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="form-input"
                style={{ flex: 2 }}
                aria-label="Jugador"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">— Jugador —</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                style={{ flex: 1 }}
                type="number"
                min={1}
                max={99}
                placeholder="#"
                aria-label="Dorsal"
                value={form.jerseyNumber}
                onChange={(e) =>
                  setForm({ ...form, jerseyNumber: e.target.value })
                }
              />
              <select
                className="form-input"
                style={{ flex: 1 }}
                aria-label="Rol en el equipo"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="player">Jugador</option>
                <option value="captain">Capitán</option>
                <option value="goalkeeper">Portero</option>
              </select>
            </div>
            {formError && <div className="login-error">{formError}</div>}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 12,
              }}
            >
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cerrar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || available.length === 0}
              >
                {saving ? 'Agregando...' : '+ Agregar'}
              </button>
            </div>
          </form>
        )}

        {!isAdmin && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <button className="btn btn-ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
