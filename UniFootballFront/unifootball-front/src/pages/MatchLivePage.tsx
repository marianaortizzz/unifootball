import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import client from '../api/client'

interface MatchEvent {
  _id: string
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'foul'
  minute: number
  playerName: string
  teamName: string
  description?: string | null
}

interface MatchResult {
  homeScore: number
  awayScore: number
  status: string
}

interface LiveData {
  homeTeamName?: string
  awayTeamName?: string
  events: MatchEvent[]
  result: MatchResult | null
}

interface MatchInfo {
  homeTeamId: string
  awayTeamId: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
}

interface Member {
  userId: string
  user: { id: string; name: string }
}
interface PlayerOpt {
  userId: string
  name: string
  teamId: string
  teamName: string
}

const EVENT_ICON: Record<MatchEvent['type'], string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  foul: '⚠️',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  played: 'Finalizado',
  cancelled: 'Cancelado',
}

export default function MatchLivePage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { user } = useAuth()
  const canEdit = user?.role === 'referee' || user?.role === 'admin'

  const [data, setData] = useState<LiveData>({ events: [], result: null })
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [players, setPlayers] = useState<PlayerOpt[]>([])
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLive = useCallback(() => {
    client
      .get(`/matches/${matchId}/live`)
      .then((res) =>
        setData({
          homeTeamName: res.data.homeTeamName,
          awayTeamName: res.data.awayTeamName,
          events: res.data.events ?? [],
          result: res.data.result ?? null,
        }),
      )
      .catch(() => setError('Error al cargar el partido'))
  }, [matchId])

  useEffect(() => {
    fetchLive()
    intervalRef.current = setInterval(fetchLive, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchLive])

  // info del partido + plantillas (para los formularios del árbitro)
  useEffect(() => {
    if (!canEdit) return
    client
      .get(`/matches/${matchId}`)
      .then((res) => {
        const m: MatchInfo = res.data
        setMatch(m)
        Promise.all([
          client.get(`/teams/${m.homeTeamId}/members`),
          client.get(`/teams/${m.awayTeamId}/members`),
        ])
          .then(([h, a]) => {
            const map = (
              members: Member[],
              teamId: string,
              teamName: string,
            ): PlayerOpt[] =>
              members.map((mb) => ({
                userId: mb.userId,
                name: mb.user?.name ?? mb.userId,
                teamId,
                teamName,
              }))
            setPlayers([
              ...map(h.data, m.homeTeamId, m.homeTeam.name),
              ...map(a.data, m.awayTeamId, m.awayTeam.name),
            ])
          })
          .catch(() => {})
      })
      .catch(() => {})
  }, [matchId, canEdit])

  const { result, events, homeTeamName, awayTeamName } = data
  const isLive = result?.status === 'in_progress'

  return (
    <>
      <Navbar back={{ label: '← Volver', to: -1 }} />
      <div className="page">
        <div
          className="section-title"
          style={{ fontSize: 36, marginBottom: 24 }}
        >
          {isLive && <span className="live-dot" />}
          {isLive ? 'EN VIVO' : 'PARTIDO'}
        </div>

        {error && <div className="state-error">{error}</div>}

        {result && (
          <div className="scoreboard">
            <div className="scoreboard-score">
              {result.homeScore} — {result.awayScore}
            </div>
            <div className="scoreboard-teams">
              <span>{homeTeamName ?? 'Local'}</span>
              <span
                className="badge badge-gray"
                style={{ alignSelf: 'center' }}
              >
                {STATUS_LABEL[result.status] ?? result.status}
              </span>
              <span>{awayTeamName ?? 'Visitante'}</span>
            </div>
          </div>
        )}

        {canEdit && match && (
          <RefereePanel
            matchId={matchId!}
            result={result}
            players={players}
            homeTeam={{ id: match.homeTeamId, name: match.homeTeam.name }}
            awayTeam={{ id: match.awayTeamId, name: match.awayTeam.name }}
            onChange={fetchLive}
          />
        )}

        <div className="section-title" style={{ marginBottom: 16 }}>
          EVENTOS
        </div>
        {events.length === 0 ? (
          <div className="state-empty">Sin eventos aún...</div>
        ) : (
          <div className="event-list">
            {[...events]
              .sort((a, b) => a.minute - b.minute)
              .map((e) => (
                <div key={e._id} className="event-item">
                  <span className="event-minute">{e.minute}'</span>
                  <span className="event-icon">{EVENT_ICON[e.type]}</span>
                  <div>
                    <div className="event-text">{e.playerName}</div>
                    <div className="event-team">{e.teamName}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  )
}

// ---------- Panel del árbitro ----------
function RefereePanel({
  matchId,
  result,
  players,
  homeTeam,
  awayTeam,
  onChange,
}: {
  matchId: string
  result: MatchResult | null
  players: PlayerOpt[]
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  onChange: () => void
}) {
  const [tab, setTab] = useState<'result' | 'event' | 'stats'>('result')

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${tab === 'result' ? 'active' : ''}`}
          style={{ fontSize: 15 }}
          onClick={() => setTab('result')}
        >
          MARCADOR
        </button>
        <button
          className={`tab ${tab === 'event' ? 'active' : ''}`}
          style={{ fontSize: 15 }}
          onClick={() => setTab('event')}
        >
          EVENTO
        </button>
        <button
          className={`tab ${tab === 'stats' ? 'active' : ''}`}
          style={{ fontSize: 15 }}
          onClick={() => setTab('stats')}
        >
          STATS
        </button>
      </div>
      {tab === 'result' && (
        <ResultForm matchId={matchId} result={result} onChange={onChange} />
      )}
      {tab === 'event' && (
        <EventForm
          matchId={matchId}
          players={players}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onChange={onChange}
        />
      )}
      {tab === 'stats' && <StatsForm matchId={matchId} players={players} />}
    </div>
  )
}

function ResultForm({
  matchId,
  result,
  onChange,
}: {
  matchId: string
  result: MatchResult | null
  onChange: () => void
}) {
  const [home, setHome] = useState(String(result?.homeScore ?? 0))
  const [away, setAway] = useState(String(result?.awayScore ?? 0))
  const [status, setStatus] = useState(result?.status ?? 'in_progress')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setSaving(true)
    try {
      await client.patch(`/matches/${matchId}/result`, {
        homeScore: Number(home),
        awayScore: Number(away),
        status,
      })
      setMsg('✓ Marcador actualizado')
      onChange()
    } catch {
      setMsg('✗ No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Local</label>
          <input
            className="form-input"
            type="number"
            min={0}
            value={home}
            onChange={(e) => setHome(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Visitante</label>
          <input
            className="form-input"
            type="number"
            min={0}
            value={away}
            onChange={(e) => setAway(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1.5 }}>
          <label className="form-label">Estado</label>
          <select
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="pending">Pendiente</option>
            <option value="in_progress">En curso</option>
            <option value="played">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={saving}
          style={{ marginBottom: 16 }}
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
      {msg && <div className="event-team">{msg}</div>}
    </form>
  )
}

function EventForm({
  matchId,
  players,
  homeTeam,
  awayTeam,
  onChange,
}: {
  matchId: string
  players: PlayerOpt[]
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  onChange: () => void
}) {
  const [teamId, setTeamId] = useState(homeTeam.id)
  const [type, setType] = useState('goal')
  const [minute, setMinute] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const teamPlayers = players.filter((p) => p.teamId === teamId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!playerId || minute === '') {
      setMsg('✗ Elige jugador y minuto')
      return
    }
    setSaving(true)
    try {
      await client.post('/stats/match-events', {
        matchId,
        type,
        minute: Number(minute),
        playerId,
        teamId,
      })
      setMsg('✓ Evento registrado')
      setMinute('')
      setPlayerId('')
      onChange()
    } catch {
      setMsg('✗ No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Equipo</label>
          <select
            className="form-input"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value)
              setPlayerId('')
            }}
          >
            <option value={homeTeam.id}>{homeTeam.name}</option>
            <option value={awayTeam.id}>{awayTeam.name}</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Tipo</label>
          <select
            className="form-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="goal">Gol</option>
            <option value="yellow_card">Amarilla</option>
            <option value="red_card">Roja</option>
            <option value="substitution">Cambio</option>
          </select>
        </div>
        <div className="form-group" style={{ width: 90 }}>
          <label className="form-label">Minuto</label>
          <input
            className="form-input"
            type="number"
            min={0}
            max={130}
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Jugador</label>
        <select
          className="form-input"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        >
          <option value="">— Selecciona —</option>
          {teamPlayers.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="event-team">{msg}</span>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? '...' : '+ Registrar evento'}
        </button>
      </div>
    </form>
  )
}

function StatsForm({
  matchId,
  players,
}: {
  matchId: string
  players: PlayerOpt[]
}) {
  const [userId, setUserId] = useState('')
  const [f, setF] = useState({
    goals: '0',
    assists: '0',
    yellowCards: '0',
    redCards: '0',
    minutesPlayed: '90',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!userId) {
      setMsg('✗ Elige un jugador')
      return
    }
    setSaving(true)
    try {
      await client.post('/stats/players', {
        matchId,
        userId,
        goals: Number(f.goals),
        assists: Number(f.assists),
        yellowCards: Number(f.yellowCards),
        redCards: Number(f.redCards),
        minutesPlayed: Number(f.minutesPlayed),
      })
      setMsg('✓ Estadística guardada')
    } catch {
      setMsg('✗ No se pudo guardar (revisa límites)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label className="form-label">Jugador</label>
        <select
          className="form-input"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">— Selecciona —</option>
          {players.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name} · {p.teamName}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(
          [
            ['goals', 'Goles', 99],
            ['assists', 'Asist.', 99],
            ['yellowCards', 'Amar.', 2],
            ['redCards', 'Rojas', 1],
            ['minutesPlayed', 'Min.', 120],
          ] as const
        ).map(([key, label, max]) => (
          <div className="form-group" key={key} style={{ flex: 1 }}>
            <label className="form-label">{label}</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={max}
              value={f[key]}
              onChange={(e) => setF({ ...f, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="event-team">{msg}</span>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? '...' : 'Guardar stats'}
        </button>
      </div>
    </form>
  )
}
