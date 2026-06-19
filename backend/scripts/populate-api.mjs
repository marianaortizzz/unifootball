/**
 * Llena la API desplegada en Render con un torneo completo.
 *
 *   node scripts/populate-api.mjs
 *
 * No crea partidos/stages porque la API no expone un endpoint para stages.
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
const REFEREE_NAMES = ['Arturo Silva', 'Pedro Navas', 'Luisa Campos'];
const PLAYERS_PER_TEAM = 9;

const deburr = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let token = null;

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function register(name, email, role) {
  return api('POST', '/auth/register', { name, email, password: PASSWORD, role });
}

async function login(email) {
  return api('POST', '/auth/login', { email, password: PASSWORD });
}

async function main() {
  console.log(`Apuntando a ${BASE}`);

  // -------- Admin --------
  console.log('\n[1/6] Admin');
  let admin;
  try {
    admin = await register('Admin UniFootball', 'admin@unifootball.com', 'admin');
    console.log('  admin creado');
  } catch (e) {
    console.log('  admin ya existe, hago login');
    admin = await login('admin@unifootball.com');
  }
  token = admin.accessToken ?? admin.access_token ?? admin.token;
  if (!token) throw new Error(`No se obtuvo token: ${JSON.stringify(admin)}`);
  console.log('  token OK');

  // -------- Referees --------
  console.log('\n[2/6] Arbitros');
  const referees = [];
  for (let i = 0; i < REFEREE_NAMES.length; i++) {
    const email = `referee${i + 1}@unifootball.com`;
    try {
      const r = await register(REFEREE_NAMES[i], email, 'referee');
      referees.push(r.user ?? r);
      console.log(`  + ${REFEREE_NAMES[i]}`);
    } catch (e) {
      console.log(`  = ${REFEREE_NAMES[i]} (ya existia)`);
    }
  }

  // -------- Players --------
  console.log('\n[3/6] Jugadores');
  let nameIdx = 0;
  const nextName = () => {
    const first = FIRST[nameIdx % FIRST.length];
    const last = LAST[(nameIdx * 3 + Math.floor(nameIdx / LAST.length)) % LAST.length];
    nameIdx++;
    return { first, last };
  };
  const playersByTeam = []; // array[teamIdx] -> array of {id,name,email}
  for (let t = 0; t < TEAM_NAMES.length; t++) {
    const list = [];
    for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
      const { first, last } = nextName();
      const idx = t * PLAYERS_PER_TEAM + p;
      const email = `${deburr(first)}.${deburr(last)}${idx}@uni.edu`;
      const name = `${first} ${last}`;
      try {
        const r = await register(name, email, 'player');
        const user = r.user ?? r;
        list.push({ id: user.id, name, email });
      } catch (e) {
        // Si ya existe, hago login para obtener su id
        const l = await login(email);
        const user = l.user ?? l;
        list.push({ id: user.id, name, email });
      }
    }
    playersByTeam.push(list);
    console.log(`  equipo ${t + 1}/${TEAM_NAMES.length}: ${list.length} jugadores`);
  }
  // -------- Tournament --------
  console.log('\n[4/6] Torneo');
  const tournament = await api('POST', '/tournaments', {
    name: 'Liga Universitaria 2026',
    sport: 'football',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    format: 'league',
    status: 'active',
  });
  console.log(`  torneo creado: ${tournament.id}`);

  // -------- Teams + memberships + inscripcion al torneo --------
  console.log('\n[5/6] Equipos, plantillas e inscripciones');
  const teams = [];
  for (let t = 0; t < TEAM_NAMES.length; t++) {
    const name = TEAM_NAMES[t];
    const team = await api('POST', '/teams', {
      name,
      logoUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
      description: `Equipo universitario ${name}.`,
    });
    teams.push(team);
    console.log(`  + ${name}`);

    // inscribir al torneo
    await api('POST', `/tournaments/${tournament.id}/teams`, { teamId: team.id });

    // agregar jugadores
    const roster = playersByTeam[t];
    for (let p = 0; p < roster.length; p++) {
      const role = p === 0 ? 'captain' : p === 1 ? 'goalkeeper' : 'player';
      await api('POST', `/teams/${team.id}/members`, {
        userId: roster[p].id,
        jerseyNumber: p + 1,
        role,
      });
    }
    console.log(`    ${roster.length} miembros agregados`);
  }

  // -------- Notificaciones (bienvenida) --------
  console.log('\n[6/6] Notificaciones de bienvenida');
  let notifCount = 0;
  for (let t = 0; t < teams.length; t++) {
    for (const player of playersByTeam[t]) {
      await api('POST', '/notify', {
        userId: player.id,
        title: 'Bienvenido a la Liga Universitaria 2026',
        body: 'Tu equipo ya esta inscrito. Mucho exito!',
      });
      notifCount++;
    }
    // capitan
    await api('POST', '/notify', {
      userId: playersByTeam[t][0].id,
      title: 'Eres capitan',
      body: `Como capitan de ${teams[t].name}, confirma la alineacion antes de cada partido.`,
    });
    notifCount++;
  }
  console.log(`  ${notifCount} notificaciones`);

  console.log('\nResumen:');
  console.table({
    torneo: tournament.name,
    equipos: teams.length,
    arbitros: REFEREE_NAMES.length,
    jugadores: playersByTeam.flat().length,
    notificaciones: notifCount,
    'partidos/stages': 'omitidos (no hay endpoint publico)',
  });
  console.log('\nCredenciales:');
  console.log(`  admin@unifootball.com  / ${PASSWORD}`);
  console.log(`  referee1@unifootball.com / ${PASSWORD}`);
  console.log(`  ${playersByTeam[0][0].email} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
