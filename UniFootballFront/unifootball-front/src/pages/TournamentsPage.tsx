import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface Tournament {
  id: string
  name: string
  sport: string
  status: string
  format: string
  startDate: string
  endDate: string
}

interface TournamentForm {
  name: string
  sport: string
  format: string
  status: string
  startDate: string
  endDate: string
}

const EMPTY_FORM: TournamentForm = {
  name: '',
  sport: 'football',
  format: 'league',
  status: 'draft',
  startDate: '',
  endDate: '',
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <span className="badge badge-green">Activo</span>
    case 'draft':
      return <span className="badge badge-blue">Borrador</span>
    case 'finished':
      return <span className="badge badge-gray">Finalizado</span>
    default:
      return <span className="badge badge-gray">{status}</span>
  }
}

// fecha ISO -> yyyy-mm-dd (para <input type="date">)
const toDateInput = (value: string) => (value ? value.slice(0, 10) : '')

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // estado del modal de creación/edición
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TournamentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const loadTournaments = () => {
    setLoading(true)
    client
      .get('/tournaments')
      .then((res) => setTournaments(res.data))
      .catch(() => setError('Error al cargar torneos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTournaments()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (t: Tournament) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      sport: t.sport,
      format: t.format,
      status: t.status,
      startDate: toDateInput(t.startDate),
      endDate: toDateInput(t.endDate),
    })
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (form.name.trim().length < 3) {
      setFormError('El nombre debe tener al menos 3 caracteres')
      return
    }
    if (!form.startDate || !form.endDate) {
      setFormError('Indica las fechas de inicio y fin')
      return
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError('La fecha de fin no puede ser anterior a la de inicio')
      return
    }

    const payload = {
      name: form.name.trim(),
      sport: form.sport,
      format: form.format,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
    }

    setSaving(true)
    try {
      if (editingId) {
        await client.patch(`/tournaments/${editingId}`, payload)
      } else {
        await client.post('/tournaments', payload)
      }
      setShowModal(false)
      loadTournaments()
    } catch {
      setFormError('No se pudo guardar el torneo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: Tournament) => {
    if (
      !window.confirm(
        `¿Eliminar el torneo "${t.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }
    try {
      await client.delete(`/tournaments/${t.id}`)
      setTournaments((prev) => prev.filter((x) => x.id !== t.id))
    } catch {
      setError('No se pudo eliminar el torneo')
    }
  }

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
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
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
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div
            className="section-title"
            data-testid="tournaments-title"
            style={{ fontSize: 36, margin: 0 }}
          >
            TORNEOS
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              data-testid="new-tournament-btn"
              onClick={openCreate}
            >
              + Nuevo torneo
            </button>
          )}
        </div>

        {loading && <div className="state-loading">Cargando torneos...</div>}
        {error && (
          <div className="state-error" data-testid="tournaments-error">
            {error}
          </div>
        )}

        {!loading && !error && tournaments.length === 0 && (
          <div className="state-empty">
            No hay torneos registrados. Crea el primero.
          </div>
        )}

        <div className="tournament-grid">
          {tournaments.map((t) => (
            <div key={t.id} className="tournament-item" data-testid="tournament-item">
              <div
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => navigate(`/tournaments/${t.id}`)}
              >
                <div className="tournament-name">{t.name}</div>
                <div className="tournament-meta">
                  {t.sport} ·{' '}
                  {new Date(t.startDate).toLocaleDateString('es-MX')} –{' '}
                  {new Date(t.endDate).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(t.status)}
                {isAdmin && (
                  <button className="btn btn-ghost" onClick={() => openEdit(t)}>
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(t)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editingId ? 'Editar torneo' : 'Nuevo torneo'}
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  className="form-input"
                  data-testid="tournament-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Liga Universitaria 2026"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Deporte</label>
                  <input
                    className="form-input"
                    value={form.sport}
                    onChange={(e) =>
                      setForm({ ...form, sport: e.target.value })
                    }
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Formato</label>
                  <select
                    className="form-input"
                    value={form.format}
                    onChange={(e) =>
                      setForm({ ...form, format: e.target.value })
                    }
                  >
                    <option value="league">Liga</option>
                    <option value="knockout">Eliminación</option>
                    <option value="groups">Grupos</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Inicio</label>
                  <input
                    className="form-input"
                    data-testid="tournament-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Fin</label>
                  <input
                    className="form-input"
                    data-testid="tournament-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>

              {formError && (
                <div className="login-error" data-testid="tournament-form-error">
                  {formError}
                </div>
              )}

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
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  data-testid="tournament-save"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Crear torneo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
