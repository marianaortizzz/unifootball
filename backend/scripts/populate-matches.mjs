/**
 * Llena partidos, resultados, eventos, player stats y standings del torneo
 * que ya se creó con populate-api.mjs.
 *
 *   node scripts/populate-matches.mjs
 *
 * Congruencia:
 *  - los eventos 'goal' de un partido suman exactamente al marcador
 *  - las stats por jugador suman al marcador de su equipo
 *  - los eventos 'yellow_card' / 'red_card' coinciden con las stats
 *  - la tabla de posiciones se recalcula desde los resultados PLAYED
 */

const BASE = process.env.API_BASE ?? 'https://unifootball.onrender.com';
const PASSWORD = 'Password123';

const FIRST = [
  'Carlos', 'Luis', 'Miguel', 'Jose', 'Juan', 'Diego', 'Andres', 'Fernando',
  'Ricardo', 'Javier', 'Sergio', 'Pablo', 'Alberto', 'Daniel', 'Roberto',
  'Hugo', 'Mario', 'Ivan', 'Oscar', 'Raul', 'Emiliano', 'Santiago', 'Mateo',
  'Adrian', 'Cesar', 'Gabriel', 'Hector', 'Rodrigo', 'Tomas', 'Bruno',
];
const LAST = [
  'Garcia', 'Martinez', 'Lopez', 'Hernandez', 'Gonzalez', 'Rodriguez',
  'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez',
  'Diaz', 'Cruz', 'Morales', 'Ortiz', 'Gutierrez', 'Chavez', 'Ramos',
  'Vargas', 'Castillo', 'Jimenez', 'Mendoza', 'Romero', 'Reyes', 'Aguilar',
  'Medina', 'Guerrero', 'Rojas',
];
const TEAM_NAMES = [
  'Aguilas FC',
  'Pumas United',
  'Toros Rojos',
  'Halcones Negros',
  'Lobos Grises',
  'Tiburones Azules',
];
const VENUES = ['Estadio Central', 'Cancha Norte', 'Complejo Sur', 'Campo Olimpico'];
const PLAYERS_PER_TEAM = 9;
const ROUND_DATES = [
  '2026-04-18T16:00:00.000Z',
  '2026-04-25T16:00:00.000Z',
  '2026-05-02T16:00:00.000Z',
  '2026-05-09T16:00:00.000Z',
  '2026-06-06T16:00:00.000Z',
];
const PLAYED_ROUNDS = 4;

const deburr = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const chance = (p) => Math.random() < p;

let token = null;

async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${BASE}${path}`;
  // pequeño retry para hipos de Render
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        const err = new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
        err.status = res.status;
        // 4xx no se reintenta
        if (res.status < 500) throw err;
        lastErr = err;
        continue;
      }
      return data;
    } catch (e) {
      if (e.status && e.status < 500) throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function login(email) {
  return api('POST', '/auth/login', { email, password: PASSWORD });
}

// round-robin (método del círculo); alterna local/visitante por jornada
function roundRobin(n) {
  const rounds = [];
  let list = Array.from({ length: n }, (_, i) => i);
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      round.push(
        r % 2 === 0
          ? [list[i], list[n - 1 - i]]
          : [list[n - 1 - i], list[i]],
      );
    }
    rounds.push(round);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }
  return rounds;
}

async function main() {
  console.log(`Apuntando a ${BASE}`);

  // ---- 1. Login admin ----
  console.log('\n[1/8] Login admin');
  const admin = await login('admin@unifootball.com');
  token = admin.accessToken;
  console.log('  ok');

  // ---- 2. Encontrar torneo ----
  console.log('\n[2/8] Buscar torneo');
  const tournaments = await api('GET', '/tournaments');
  const tournament = tournaments.find((t) => t.name === 'Liga Universitaria 2026');
  if (!tournament) throw new Error('Torneo "Liga Universitaria 2026" no encontrado');
  console.log(`  ${tournament.name} (${tournament.id})`);

  // ---- 3. Equipos por nombre ----
  console.log('\n[3/8] Equipos');
  const allTeams = await api('GET', '/teams');
  const teams = TEAM_NAMES.map((name) => {
    const t = allTeams.find((x) => x.name === name);
    if (!t) throw new Error(`Equipo "${name}" no encontrado`);
    return t;
  });
  console.log(`  ${teams.length} equipos resueltos`);

  // ---- 4. Login arbitros y jugadores ----
  console.log('\n[4/8] Login arbitros y plantillas');
  const referees = [];
  for (let i = 0; i < 3; i++) {
    const r = await login(`referee${i + 1}@unifootball.com`);
    referees.push(r.user);
  }
  console.log(`  arbitros: ${referees.length}`);

  let nameIdx = 0;
  const nextName = () => {
    const first = FIRST[nameIdx % FIRST.length];
    const last = LAST[(nameIdx * 3 + Math.floor(nameIdx / LAST.length)) % LAST.length];
    nameIdx++;
    return { first, last };
  };
  const playersByTeam = [];
  for (let t = 0; t < TEAM_NAMES.length; t++) {
    const list = [];
    for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
      const { first, last } = nextName();
      const idx = t * PLAYERS_PER_TEAM + p;
      const email = `${deburr(first)}.${deburr(last)}${idx}@uni.edu`;
      const l = await login(email);
      list.push({ id: l.user.id, name: l.user.name, email });
    }
    playersByTeam.push(list);
    process.stdout.write(`  equipo ${t + 1}/${TEAM_NAMES.length} ok\r`);
  }
  console.log(`\n  ${playersByTeam.flat().length} jugadores resueltos`);

  // ---- 5. Crear stage ----
  console.log('\n[5/8] Crear fase');
  let stage;
  const existingStages = await api('GET', `/tournaments/${tournament.id}/stages`);
  const found = existingStages.find((s) => s.name === 'Fase Regular');
  if (found) {
    stage = found;
    console.log(`  fase ya existe: ${stage.id}`);
  } else {
    stage = await api('POST', `/tournaments/${tournament.id}/stages`, {
      name: 'Fase Regular',
      type: 'groups',
      order: 1,
    });
    console.log(`  fase creada: ${stage.id}`);
  }

  // ---- 6. Calendario y partidos ----
  console.log('\n[6/8] Crear partidos, resultados, eventos y stats');
  const schedule = roundRobin(teams.length);

  // Si el script ya corrió, evitamos duplicar matches: pedimos los existentes.
  const existingMatches = await api(
    'GET',
    `/matches?tournament_id=${tournament.id}`,
  );
  const matchKey = (homeId, awayId, scheduledAt) =>
    `${homeId}|${awayId}|${new Date(scheduledAt).toISOString()}`;
  const existingByKey = new Map(
    existingMatches.map((m) => [
      matchKey(m.homeTeamId, m.awayTeamId, m.scheduledAt),
      m,
    ]),
  );

  let refIdx = 0;
  let venueIdx = 0;
  const summary = {
    matches: 0,
    played: 0,
    pending: 0,
    events: 0,
    playerStatsRows: 0,
    totalGoals: 0,
  };

  for (let r = 0; r < schedule.length; r++) {
    const played = r < PLAYED_ROUNDS;
    for (const [hi, ai] of schedule[r]) {
      const home = teams[hi];
      const away = teams[ai];
      const scheduledAt = ROUND_DATES[r];
      const venue = VENUES[venueIdx++ % VENUES.length];
      const referee = referees[refIdx++ % referees.length];

      const key = matchKey(home.id, away.id, scheduledAt);
      let match = existingByKey.get(key);
      if (!match) {
        match = await api('POST', '/matches', {
          stageId: stage.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          refereeId: referee.id,
          scheduledAt,
          venue,
        });
      }
      summary.matches++;

      if (!played) {
        summary.pending++;
        continue;
      }

      const homeScore = rand(0, 4);
      const awayScore = rand(0, 3);
      await api('PATCH', `/matches/${match.id}/result`, {
        homeScore,
        awayScore,
        status: 'played',
      });
      summary.played++;
      summary.totalGoals += homeScore + awayScore;

      const homeRoster = playersByTeam[hi];
      const awayRoster = playersByTeam[ai];

      // stats por jugador (inicial = 90 min, ceros)
      const stats = new Map();
      for (const roster of [homeRoster, awayRoster]) {
        for (const p of roster) {
          stats.set(p.id, {
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            minutesPlayed: 90,
          });
        }
      }

      // goles -> eventos + stats por equipo
      for (const [teamObj, roster, goals] of [
        [home, homeRoster, homeScore],
        [away, awayRoster, awayScore],
      ]) {
        for (let g = 0; g < goals; g++) {
          const scorer = pick(roster);
          const minute = rand(1, 90);
          stats.get(scorer.id).goals++;
          await api('POST', '/stats/match-events', {
            matchId: match.id,
            type: 'goal',
            minute,
            playerId: scorer.id,
            teamId: teamObj.id,
            description: 'Gol',
          });
          summary.events++;
          // asistencia (60%) de un compañero distinto
          if (chance(0.6)) {
            const mates = roster.filter((p) => p.id !== scorer.id);
            const assist = pick(mates);
            stats.get(assist.id).assists++;
          }
        }
      }

      // amarillas (0-3) — cada jugador máximo 1 por partido para evitar 2-amarillas-implican-roja
      const yellowCount = rand(0, 3);
      const yellowedThisMatch = new Set();
      for (let y = 0; y < yellowCount; y++) {
        const side = chance(0.5) ? 'home' : 'away';
        const teamObj = side === 'home' ? home : away;
        const roster = side === 'home' ? homeRoster : awayRoster;
        const candidates = roster.filter((p) => !yellowedThisMatch.has(p.id));
        if (candidates.length === 0) break;
        const player = pick(candidates);
        yellowedThisMatch.add(player.id);
        stats.get(player.id).yellowCards = 1;
        await api('POST', '/stats/match-events', {
          matchId: match.id,
          type: 'yellow_card',
          minute: rand(20, 90),
          playerId: player.id,
          teamId: teamObj.id,
          description: 'Tarjeta amarilla',
        });
        summary.events++;
      }

      // roja (25%) — un jugador distinto a los amarilleados
      if (chance(0.25)) {
        const side = chance(0.5) ? 'home' : 'away';
        const teamObj = side === 'home' ? home : away;
        const roster = side === 'home' ? homeRoster : awayRoster;
        const candidates = roster.filter((p) => stats.get(p.id).redCards === 0);
        if (candidates.length > 0) {
          const player = pick(candidates);
          stats.get(player.id).redCards = 1;
          await api('POST', '/stats/match-events', {
            matchId: match.id,
            type: 'red_card',
            minute: rand(40, 90),
            playerId: player.id,
            teamId: teamObj.id,
            description: 'Tarjeta roja',
          });
          summary.events++;
        }
      }

      // upsert player stats (18 jugadores del partido)
      for (const [userId, s] of stats) {
        await api('POST', '/stats/players', {
          matchId: match.id,
          userId,
          ...s,
        });
        summary.playerStatsRows++;
      }

      process.stdout.write(
        `  jornada ${r + 1} - ${home.name} ${homeScore}-${awayScore} ${away.name}\n`,
      );
    }
  }

  // ---- 7. Recalcular standings ----
  console.log('\n[7/8] Recalcular tabla de posiciones');
  const standings = await api(
    'POST',
    `/stats/standings/${tournament.id}/recalculate`,
  );
  console.log(`  ${standings.length} filas`);

  // ---- 8. Resumen ----
  console.log('\n[8/8] Resumen');
  console.table(summary);

  // Imprimir tabla
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const tableRows = [...standings]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst),
    )
    .map((s, i) => ({
      pos: i + 1,
      equipo: teamName.get(s.teamId) ?? s.teamId,
      pj: s.played,
      g: s.won,
      e: s.drawn,
      p: s.lost,
      gf: s.goalsFor,
      gc: s.goalsAgainst,
      dif: s.goalsFor - s.goalsAgainst,
      pts: s.points,
    }));
  console.log('\nTabla:');
  console.table(tableRows);
}

main().catch((e) => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
