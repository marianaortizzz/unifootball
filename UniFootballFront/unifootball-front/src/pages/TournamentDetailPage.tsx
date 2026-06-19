import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import client from '../api/client'

interface Standing {
  id: string
  teamId: string
  team: { name: string }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface Match {
  id: string
  scheduledAt: string
  venue: string | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  result?: { homeScore: number; awayScore: number; status: string }
}

interface Tournament {
  id: string
  name: string
}
interface Team {
  id: string
  name: string
}
interface TournamentTeam {
  id: string
  teamId: string
  team: Team
}
interface Stage {
  id: string
  name: string
  type: string
  order: number
}
interface Referee {
  id: string
  name: string
}

type Tab = 'standings' | 'fixture' | 'teams'

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('standings')

  // datos para gestión (admin)
  const [tTeams, setTTeams] = useState<TournamentTeam[]>([])
  const [stages, setStages] = useState<Stage[]>([])

  const loadCore = useCallback(() => {
    Promise.all([
      client.get(`/tournaments/${id}`),
      client.get(`/stats/standings/${id}`),
      client.get(`/matches?tournament_id=${id}`),
    ])
      .then(([tRes, sRes, mRes]) => {
        setTournament(tRes.data)
        setStandings(sRes.data)
        setMatches(mRes.data)
      })
      .catch(() => setError('Error al cargar el torneo'))
      .finally(() => setLoading(false))
  }, [id])

  const loadTeamsAndStages = useCallback(() => {
    Promise.all([
      client.get(`/tournaments/${id}/teams`),
      client.get(`/tournaments/${id}/stages`),
    ])
      .then(([ttRes, stRes]) => {
        setTTeams(ttRes.data)
        setStages(stRes.data)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    loadCore()
  }, [loadCore])
  useEffect(() => {
    loadTeamsAndStages()
  }, [loadTeamsAndStages])

  const recalc = async () => {
    try {
      const res = await client.post(`/stats/standings/${id}/recalculate`)
      setStandings(res.data)
    } catch {
      setError('No se pudo recalcular la tabla')
    }
  }

  // modales
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showStage, setShowStage] = useState(false)
  const [showMatch, setShowMatch] = useState(false)

  return (
    <>
      <Navbar back={{ label: '← Torneos', to: '/tournaments' }} />
      <div className="page">
        {loading && <div className="state-loading">Cargando...</div>}
        {error && <div className="state-error">{error}</div>}

        {!loading && !error && (
          <>
            <div
              className="section-title"
              style={{ fontSize: 36, marginBottom: 24 }}
            >
              {tournament?.name ?? 'TORNEO'}
            </div>

            <div className="tabs">
              <button
                className={`tab ${tab === 'standings' ? 'active' : ''}`}
                onClick={() => setTab('standings')}
              >
                POSICIONES
              </button>
              <button
                className={`tab ${tab === 'fixture' ? 'active' : ''}`}
                onClick={() => setTab('fixture')}
              >
                FIXTURE
              </button>
              <button
                className={`tab ${tab === 'teams' ? 'active' : ''}`}
                onClick={() => setTab('teams')}
              >
                EQUIPOS
              </button>
            </div>

            {/* ---------- POSICIONES ---------- */}
            {tab === 'standings' && (
              <>
                {isAdmin && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: 12,
                    }}
                  >
                    <button className="btn btn-ghost" onClick={recalc}>
                      ↻ Recalcular tabla
                    </button>
                  </div>
                )}
                {standings.length === 0 ? (
                  <div className="state-empty">
                    Sin datos de posiciones aún.
                  </div>
                ) : (
                  <div
                    className="card"
                    style={{ padding: 0, overflow: 'hidden' }}
                  >
                    <table className="uf-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Equipo</th>
                          <th>PJ</th>
                          <th>G</th>
                          <th>E</th>
                          <th>P</th>
                          <th>GF</th>
                          <th>GC</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...standings]
                          .sort(
                            (a, b) =>
                              b.points - a.points ||
                              b.goalsFor -
                                b.goalsAgainst -
                                (a.goalsFor - a.goalsAgainst),
                          )
                          .map((s, i) => (
                            <tr key={s.id}>
                              <td className="rank">{i + 1}</td>
                              <td className="team-name">{s.team.name}</td>
                              <td>{s.played}</td>
                              <td>{s.won}</td>
                              <td>{s.drawn}</td>
                              <td>{s.lost}</td>
                              <td>{s.goalsFor}</td>
                              <td>{s.goalsAgainst}</td>
                              <td className="pts">{s.points}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ---------- FIXTURE ---------- */}
            {tab === 'fixture' && (
              <>
                {isAdmin && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: 12,
                    }}
                  >
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowMatch(true)}
                      disabled={stages.length === 0 || tTeams.length < 2}
                    >
                      + Nuevo partido
                    </button>
                  </div>
                )}
                {isAdmin && (stages.length === 0 || tTeams.length < 2) && (
                  <div className="state-empty">
                    Para crear partidos primero inscribe al menos 2 equipos y
                    crea una fase (pestaña EQUIPOS).
                  </div>
                )}
                {matches.length === 0 ? (
                  <div className="state-empty">Sin partidos programados.</div>
                ) : (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    {matches.map((m) => (
                      <div
                        key={m.id}
                        className="match-card"
                        onClick={() => navigate(`/matches/${m.id}/live`)}
                      >
                        <div className="match-teams">
                          <span>{m.homeTeam.name}</span>
                        </div>
                        {m.result && m.result.status === 'played' ? (
                          <div className="match-score">
                            {m.result.homeScore} - {m.result.awayScore}
                          </div>
                        ) : (
                          <div className="match-vs">VS</div>
                        )}
                        <div
                          className="match-teams"
                          style={{ justifyContent: 'flex-end' }}
                        >
                          <span>{m.awayTeam.name}</span>
                        </div>
                        <div className="match-meta">
                          {new Date(m.scheduledAt).toLocaleDateString('es-MX')}
                          {m.venue && (
                            <>
                              <br />
                              {m.venue}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ---------- EQUIPOS ---------- */}
            {tab === 'teams' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <div className="form-label" style={{ margin: 0 }}>
                      Equipos inscritos
                    </div>
                    {isAdmin && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowAddTeam(true)}
                      >
                        + Inscribir equipo
                      </button>
                    )}
                  </div>
                  {tTeams.length === 0 ? (
                    <div className="state-empty">
                      Aún no hay equipos inscritos.
                    </div>
                  ) : (
                    <div className="tournament-grid">
                      {tTeams.map((tt) => (
                        <div
                          key={tt.id}
                          className="tournament-item"
                          style={{ cursor: 'default' }}
                        >
                          <div
                            className="tournament-name"
                            style={{ fontSize: 18 }}
                          >
                            {tt.team.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <div className="form-label" style={{ margin: 0 }}>
                      Fases
                    </div>
                    {isAdmin && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => setShowStage(true)}
                      >
                        + Nueva fase
                      </button>
                    )}
                  </div>
                  {stages.length === 0 ? (
                    <div className="state-empty">
                      Sin fases.{' '}
                      {isAdmin ? 'Crea una para poder programar partidos.' : ''}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {stages.map((s) => (
                        <span key={s.id} className="badge badge-blue">
                          {s.order}. {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddTeam && (
        <AddTeamModal
          tournamentId={id!}
          enrolled={tTeams}
          onClose={() => setShowAddTeam(false)}
          onDone={() => {
            setShowAddTeam(false)
            loadTeamsAndStages()
          }}
        />
      )}
      {showStage && (
        <StageModal
          tournamentId={id!}
          nextOrder={(stages.at(-1)?.order ?? 0) + 1}
          onClose={() => setShowStage(false)}
          onDone={() => {
            setShowStage(false)
            loadTeamsAndStages()
          }}
        />
      )}
      {showMatch && (
        <MatchModal
          stages={stages}
          teams={tTeams}
          onClose={() => setShowMatch(false)}
          onDone={() => {
            setShowMatch(false)
            loadCore()
          }}
        />
      )}
    </>
  )
}

// ---------- Inscribir equipo ----------
function AddTeamModal({
  tournamentId,
  enrolled,
  onClose,
  onDone,
}: {
  tournamentId: string
  enrolled: TournamentTeam[]
  onClose: () => void
  onDone: () => void
}) {
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    client
      .get('/teams')
      .then((r) => setAllTeams(r.data))
      .catch(() => {})
  }, [])
  const enrolledIds = new Set(enrolled.map((e) => e.teamId))
  const options = allTeams.filter((t) => !enrolledIds.has(t.id))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId) {
      setErr('Elige un equipo')
      return
    }
    setSaving(true)
    try {
      await client.post(`/tournaments/${tournamentId}/teams`, { teamId })
      onDone()
    } catch {
      setErr('No se pudo inscribir el equipo')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Inscribir equipo</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Equipo</label>
            <select
              className="form-input"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {options.length === 0 && (
            <div className="state-empty">
              Todos los equipos ya están inscritos. Crea más en la sección
              Equipos.
            </div>
          )}
          {err && <div className="login-error">{err}</div>}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 8,
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || options.length === 0}
            >
              {saving ? 'Inscribiendo...' : 'Inscribir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Crear fase ----------
function StageModal({
  tournamentId,
  nextOrder,
  onClose,
  onDone,
}: {
  tournamentId: string
  nextOrder: number
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'groups',
    order: String(nextOrder),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.name.trim().length < 2) {
      setErr('Nombre muy corto')
      return
    }
    setSaving(true)
    try {
      await client.post(`/tournaments/${tournamentId}/stages`, {
        name: form.name.trim(),
        type: form.type,
        order: Number(form.order),
      })
      onDone()
    } catch {
      setErr('No se pudo crear la fase (¿order repetido?)')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Nueva fase</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              className="form-input"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Fase Regular"
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tipo</label>
              <select
                className="form-input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="groups">Grupos</option>
                <option value="knockout">Eliminación</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Orden</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
              />
            </div>
          </div>
          {err && <div className="login-error">{err}</div>}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 8,
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear fase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Crear partido ----------
function MatchModal({
  stages,
  teams,
  onClose,
  onDone,
}: {
  stages: Stage[]
  teams: TournamentTeam[]
  onClose: () => void
  onDone: () => void
}) {
  const [referees, setReferees] = useState<Referee[]>([])
  const [form, setForm] = useState({
    stageId: stages[0]?.id ?? '',
    homeTeamId: '',
    awayTeamId: '',
    refereeId: '',
    scheduledAt: '',
    venue: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    client
      .get('/auth/users', { params: { role: 'referee' } })
      .then((r) => setReferees(r.data))
      .catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (
      !form.stageId ||
      !form.homeTeamId ||
      !form.awayTeamId ||
      !form.scheduledAt
    ) {
      setErr('Completa fase, equipos y fecha')
      return
    }
    if (form.homeTeamId === form.awayTeamId) {
      setErr('Local y visitante deben ser distintos')
      return
    }
    const payload: Record<string, unknown> = {
      stageId: form.stageId,
      homeTeamId: form.homeTeamId,
      awayTeamId: form.awayTeamId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    }
    if (form.refereeId) payload.refereeId = form.refereeId
    if (form.venue.trim()) payload.venue = form.venue.trim()
    setSaving(true)
    try {
      await client.post('/matches', payload)
      onDone()
    } catch {
      setErr('No se pudo crear el partido')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Nuevo partido</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Fase</label>
            <select
              className="form-input"
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Local</label>
              <select
                className="form-input"
                value={form.homeTeamId}
                onChange={(e) =>
                  setForm({ ...form, homeTeamId: e.target.value })
                }
              >
                <option value="">—</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Visitante</label>
              <select
                className="form-input"
                value={form.awayTeamId}
                onChange={(e) =>
                  setForm({ ...form, awayTeamId: e.target.value })
                }
              >
                <option value="">—</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Árbitro (opcional)</label>
            <select
              className="form-input"
              value={form.refereeId}
              onChange={(e) => setForm({ ...form, refereeId: e.target.value })}
            >
              <option value="">— Sin asignar —</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha y hora</label>
              <input
                className="form-input"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Sede (opcional)</label>
              <input
                className="form-input"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Estadio Central"
              />
            </div>
          </div>
          {err && <div className="login-error">{err}</div>}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 8,
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear partido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
