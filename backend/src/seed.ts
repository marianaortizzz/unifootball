/**
 * Seed de datos consistente (Postgres + MongoDB).
 *
 * Genera 1 liga universitaria completa: equipos, jugadores, calendario
 * round-robin, resultados, eventos en vivo, estadísticas, posiciones,
 * sanciones, notificaciones y feed de actividad.
 *
 * Las cifras cuadran entre sí: los goles de los eventos suman el marcador,
 * las estadísticas por jugador suman el marcador del equipo y la tabla de
 * posiciones se CALCULA a partir de los resultados (no se inventa).
 *
 * Uso:  npm run seed
 */
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './app.module';
import { User, UserRole } from './auth/entities/user.entity';
import {
  Tournament,
  TournamentFormat,
  TournamentStatus,
} from './tournaments/entities/tournament.entity';
import { Team } from './tournaments/entities/team.entity';
import {
  TeamMember,
  TeamMemberRole,
} from './tournaments/entities/team-member.entity';
import { TournamentTeam } from './tournaments/entities/tournament-team.entity';
import { Stage, StageType } from './tournaments/entities/stage.entity';
import { Match } from './matches/entities/match.entity';
import {
  MatchResult,
  MatchResultStatus,
} from './matches/entities/match-result.entity';
import { Sanction, SanctionType } from './matches/entities/sanction.entity';
import { Venue } from './matches/entities/venue.entity';
import { PlayerStats } from './stats/entities/player-stats.entity';
import { Standing } from './stats/entities/standing.entity';

// ---------- utilidades ----------
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const chance = (p: number) => Math.random() < p;
const deburr = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FIRST = [
  'Carlos',
  'Luis',
  'Miguel',
  'Jose',
  'Juan',
  'Diego',
  'Andres',
  'Fernando',
  'Ricardo',
  'Javier',
  'Sergio',
  'Pablo',
  'Alberto',
  'Daniel',
  'Roberto',
  'Hugo',
  'Mario',
  'Ivan',
  'Oscar',
  'Raul',
  'Emiliano',
  'Santiago',
  'Mateo',
  'Adrian',
  'Cesar',
  'Gabriel',
  'Hector',
  'Rodrigo',
  'Tomas',
  'Bruno',
];
const LAST = [
  'Garcia',
  'Martinez',
  'Lopez',
  'Hernandez',
  'Gonzalez',
  'Rodriguez',
  'Perez',
  'Sanchez',
  'Ramirez',
  'Torres',
  'Flores',
  'Rivera',
  'Gomez',
  'Diaz',
  'Cruz',
  'Morales',
  'Ortiz',
  'Gutierrez',
  'Chavez',
  'Ramos',
  'Vargas',
  'Castillo',
  'Jimenez',
  'Mendoza',
  'Romero',
  'Reyes',
  'Aguilar',
  'Medina',
  'Guerrero',
  'Rojas',
];
const TEAM_NAMES = [
  'Aguilas FC',
  'Pumas United',
  'Toros Rojos',
  'Halcones Negros',
  'Lobos Grises',
  'Tiburones Azules',
];
const VENUES = [
  { name: 'Estadio Central', location: 'Campus Principal', capacity: 2000 },
  { name: 'Cancha Norte', location: 'Facultad de Ingenieria', capacity: 800 },
  { name: 'Complejo Sur', location: 'Ciudad Universitaria', capacity: 1200 },
  { name: 'Campo Olimpico', location: 'Zona Deportiva', capacity: 1500 },
];

// round-robin (método del círculo): cada equipo juega una vez por jornada
function roundRobin(n: number): [number, number][][] {
  const rounds: [number, number][][] = [];
  let list = Array.from({ length: n }, (_, i) => i);
  for (let r = 0; r < n - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      // alterna local/visitante por jornada para que sea más justo
      round.push(
        r % 2 === 0 ? [list[i], list[n - 1 - i]] : [list[n - 1 - i], list[i]],
      );
    }
    rounds.push(round);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop() as number);
    list = [fixed, ...rest];
  }
  return rounds;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const ds = app.get(DataSource);
  const mongo = app.get<Connection>(getConnectionToken());

  console.log('🧹 Limpiando datos previos...');
  await ds.query(
    `TRUNCATE TABLE
       "players_stats","standings","match_results","sanctions","matches",
       "stages","tournament_teams","team_members","teams","tournaments",
       "venues","users"
     RESTART IDENTITY CASCADE`,
  );
  await Promise.all([
    mongo.collection('match_events').deleteMany({}),
    mongo.collection('notifications').deleteMany({}),
    mongo.collection('activity_feed').deleteMany({}),
  ]);

  // repos
  const userRepo = ds.getRepository(User);
  const tournamentRepo = ds.getRepository(Tournament);
  const teamRepo = ds.getRepository(Team);
  const memberRepo = ds.getRepository(TeamMember);
  const tournamentTeamRepo = ds.getRepository(TournamentTeam);
  const stageRepo = ds.getRepository(Stage);
  const matchRepo = ds.getRepository(Match);
  const resultRepo = ds.getRepository(MatchResult);
  const sanctionRepo = ds.getRepository(Sanction);
  const venueRepo = ds.getRepository(Venue);
  const statsRepo = ds.getRepository(PlayerStats);
  const standingRepo = ds.getRepository(Standing);

  // todas las cuentas usan la misma contraseña (demo). Se hashea una vez.
  const PASSWORD = 'Password123';
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---------- usuarios ----------
  console.log('👥 Creando usuarios...');
  let nameIdx = 0;
  const nextName = () => {
    // combina nombre y apellido desplazados para variar las parejas
    const first = FIRST[nameIdx % FIRST.length];
    const last =
      LAST[(nameIdx * 3 + Math.floor(nameIdx / LAST.length)) % LAST.length];
    nameIdx++;
    return { first, last };
  };

  const makeUser = (name: string, email: string, role: UserRole) =>
    userRepo.create({ name, email, password: passwordHash, role });

  await userRepo.save(
    makeUser('Admin UniFootball', 'admin@unifootball.com', UserRole.ADMIN),
  );

  const referees = await userRepo.save(
    ['Arturo Silva', 'Pedro Navas', 'Luisa Campos'].map((n, i) =>
      makeUser(n, `referee${i + 1}@unifootball.com`, UserRole.REFEREE),
    ),
  );

  // jugadores: 9 por equipo
  const PLAYERS_PER_TEAM = 9;
  const playerEntities: User[] = [];
  for (let t = 0; t < TEAM_NAMES.length; t++) {
    for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
      const { first, last } = nextName();
      const idx = t * PLAYERS_PER_TEAM + p;
      const email = `${deburr(first)}.${deburr(last)}${idx}@uni.edu`;
      playerEntities.push(makeUser(`${first} ${last}`, email, UserRole.PLAYER));
    }
  }
  const players = await userRepo.save(playerEntities);

  // ---------- venues ----------
  console.log('🏟️  Creando sedes...');
  const venues = await venueRepo.save(
    VENUES.map((v) => venueRepo.create({ ...v, isAvailable: true })),
  );

  // ---------- equipos + miembros ----------
  console.log('⚽ Creando equipos y plantillas...');
  const teams = await teamRepo.save(
    TEAM_NAMES.map((name) =>
      teamRepo.create({
        name,
        logoUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
        description: `Equipo universitario ${name}.`,
      }),
    ),
  );

  // userIds por equipo (para asignar goleadores/tarjetas)
  const teamPlayers: Record<string, string[]> = {};
  const members: TeamMember[] = [];
  teams.forEach((team, t) => {
    teamPlayers[team.id] = [];
    for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
      const user = players[t * PLAYERS_PER_TEAM + p];
      teamPlayers[team.id].push(user.id);
      const role =
        p === 0
          ? TeamMemberRole.CAPTAIN
          : p === 1
            ? TeamMemberRole.GOALKEEPER
            : TeamMemberRole.PLAYER;
      members.push(
        memberRepo.create({
          userId: user.id,
          teamId: team.id,
          jerseyNumber: p + 1,
          role,
        }),
      );
    }
  });
  await memberRepo.save(members);

  // ---------- torneo ----------
  console.log('🏆 Creando torneo y calendario...');
  const tournament = await tournamentRepo.save(
    tournamentRepo.create({
      name: 'Liga Universitaria 2026',
      sport: 'football',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-30'),
      format: TournamentFormat.LEAGUE,
      status: TournamentStatus.ACTIVE,
    }),
  );

  await tournamentTeamRepo.save(
    teams.map((team) =>
      tournamentTeamRepo.create({
        tournamentId: tournament.id,
        teamId: team.id,
      }),
    ),
  );

  const stage = await stageRepo.save(
    stageRepo.create({
      tournamentId: tournament.id,
      name: 'Fase Regular',
      type: StageType.GROUPS,
      order: 1,
    }),
  );

  // ---------- partidos ----------
  // 6 equipos -> 5 jornadas de 3 partidos. Las 4 primeras ya jugadas,
  // la última queda programada (futura).
  const schedule = roundRobin(teams.length);
  const ROUND_DATES = [
    '2026-04-18T16:00:00Z',
    '2026-04-25T16:00:00Z',
    '2026-05-02T16:00:00Z',
    '2026-05-09T16:00:00Z',
    '2026-06-06T16:00:00Z', // futura -> pendiente
  ];
  const PLAYED_ROUNDS = 4;

  type PlayedMatch = {
    match: Match;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
  };
  const playedMatches: PlayedMatch[] = [];
  const matchEvents: Record<string, unknown>[] = [];
  const statsMap = new Map<string, PlayerStats>(); // `${matchId}:${userId}`
  const sanctions: Sanction[] = [];
  const activityFeed: Record<string, unknown>[] = [];
  const yellowsByPlayer = new Map<string, number>(); // acumulado en el torneo

  let refIdx = 0;
  for (let r = 0; r < schedule.length; r++) {
    const played = r < PLAYED_ROUNDS;
    for (const [hi, ai] of schedule[r]) {
      const homeTeam = teams[hi];
      const awayTeam = teams[ai];
      const venue = venues[refIdx % venues.length];
      const match = await matchRepo.save(
        matchRepo.create({
          stageId: stage.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          refereeId: referees[refIdx % referees.length].id,
          scheduledAt: new Date(ROUND_DATES[r]),
          venue: venue.name,
        }),
      );
      refIdx++;

      if (!played) {
        // partido programado: resultado pendiente, sin eventos
        await resultRepo.save(
          resultRepo.create({
            matchId: match.id,
            homeScore: 0,
            awayScore: 0,
            status: MatchResultStatus.PENDING,
          }),
        );
        continue;
      }

      const homeScore = rand(0, 4);
      const awayScore = rand(0, 3);
      await resultRepo.save(
        resultRepo.create({
          matchId: match.id,
          homeScore,
          awayScore,
          status: MatchResultStatus.PLAYED,
        }),
      );
      playedMatches.push({
        match,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore,
        awayScore,
      });

      // inicializa stats (90 min) para los 18 jugadores del partido
      for (const teamId of [homeTeam.id, awayTeam.id]) {
        for (const userId of teamPlayers[teamId]) {
          statsMap.set(
            `${match.id}:${userId}`,
            statsRepo.create({
              matchId: match.id,
              userId,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              minutesPlayed: 90,
            }),
          );
        }
      }

      // goles -> eventos + stats (suman el marcador)
      const goalSpecs: [string, number][] = [
        [homeTeam.id, homeScore],
        [awayTeam.id, awayScore],
      ];
      for (const [teamId, goals] of goalSpecs) {
        for (let g = 0; g < goals; g++) {
          const scorerId = pick(teamPlayers[teamId]);
          const minute = rand(1, 90);
          const scorer = statsMap.get(`${match.id}:${scorerId}`)!;
          scorer.goals++;
          matchEvents.push({
            matchId: match.id,
            type: 'goal',
            minute,
            playerId: scorerId,
            teamId,
            description: 'Gol',
            createdAt: new Date(ROUND_DATES[r]),
          });
          // asistencia (60%) de un compañero distinto
          if (chance(0.6)) {
            const mates = teamPlayers[teamId].filter((id) => id !== scorerId);
            const assistId = pick(mates);
            statsMap.get(`${match.id}:${assistId}`)!.assists++;
          }
        }
      }

      // tarjetas amarillas (0-3) y rojas (0-1)
      const yellows = rand(0, 3);
      for (let y = 0; y < yellows; y++) {
        const teamId = pick([homeTeam.id, awayTeam.id]);
        const playerId = pick(teamPlayers[teamId]);
        statsMap.get(`${match.id}:${playerId}`)!.yellowCards++;
        yellowsByPlayer.set(playerId, (yellowsByPlayer.get(playerId) ?? 0) + 1);
        matchEvents.push({
          matchId: match.id,
          type: 'yellow_card',
          minute: rand(20, 90),
          playerId,
          teamId,
          description: 'Tarjeta amarilla',
          createdAt: new Date(ROUND_DATES[r]),
        });
      }
      if (chance(0.25)) {
        const teamId = pick([homeTeam.id, awayTeam.id]);
        const playerId = pick(teamPlayers[teamId]);
        statsMap.get(`${match.id}:${playerId}`)!.redCards++;
        matchEvents.push({
          matchId: match.id,
          type: 'red_card',
          minute: rand(40, 90),
          playerId,
          teamId,
          description: 'Tarjeta roja',
          createdAt: new Date(ROUND_DATES[r]),
        });
        // roja -> sanción de 1 partido (consistente con el evento)
        sanctions.push(
          sanctionRepo.create({
            playerId,
            tournamentId: tournament.id,
            type: SanctionType.RED,
            reason: 'Expulsion directa',
            matchesSuspended: 1,
          }),
        );
      }

      // feed de actividad por resultado
      activityFeed.push({
        tournamentId: tournament.id,
        type: 'match_result',
        title: `${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name}`,
        description: `Jornada ${r + 1} de la Liga Universitaria 2026.`,
        createdAt: new Date(ROUND_DATES[r]),
      });
    }
  }

  // sanciones por acumulación de amarillas (>=2 -> suspensión)
  for (const [playerId, count] of yellowsByPlayer) {
    if (count >= 2) {
      sanctions.push(
        sanctionRepo.create({
          playerId,
          tournamentId: tournament.id,
          type: SanctionType.SUSPENSION,
          reason: `Acumulacion de ${count} tarjetas amarillas`,
          matchesSuspended: 1,
        }),
      );
    }
  }

  console.log('📊 Guardando estadísticas, sanciones y posiciones...');
  await statsRepo.save([...statsMap.values()]);
  if (sanctions.length) await sanctionRepo.save(sanctions);

  // ---------- posiciones (calculadas desde los resultados) ----------
  const table: Record<string, Standing> = {};
  for (const team of teams) {
    table[team.id] = standingRepo.create({
      tournamentId: tournament.id,
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }
  for (const pm of playedMatches) {
    const h = table[pm.homeTeamId];
    const a = table[pm.awayTeamId];
    h.played++;
    a.played++;
    h.goalsFor += pm.homeScore;
    h.goalsAgainst += pm.awayScore;
    a.goalsFor += pm.awayScore;
    a.goalsAgainst += pm.homeScore;
    if (pm.homeScore > pm.awayScore) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (pm.homeScore < pm.awayScore) {
      a.won++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
    }
  }
  await standingRepo.save(Object.values(table));

  // ---------- MongoDB: eventos, feed, notificaciones ----------
  console.log('🍃 Insertando documentos en MongoDB...');
  if (matchEvents.length) {
    await mongo.collection('match_events').insertMany(matchEvents);
  }

  activityFeed.unshift({
    tournamentId: tournament.id,
    type: 'tournament_created',
    title: 'Arranca la Liga Universitaria 2026',
    description: `${teams.length} equipos compiten por el título.`,
    createdAt: new Date('2026-03-01T12:00:00Z'),
  });
  await mongo.collection('activity_feed').insertMany(activityFeed);

  // notificaciones: a cada jugador, "bienvenido"; a capitanes, recordatorio
  const notifications: Record<string, unknown>[] = players.map((u) => ({
    userId: u.id,
    title: 'Bienvenido a la Liga Universitaria 2026',
    body: 'Tu equipo ya está inscrito. ¡Mucho éxito!',
    read: false,
    createdAt: new Date('2026-03-02T09:00:00Z'),
  }));
  teams.forEach((team) => {
    const captainId = teamPlayers[team.id][0];
    notifications.push({
      userId: captainId,
      title: 'Eres capitán',
      body: `Como capitán de ${team.name}, confirma la alineación antes de cada partido.`,
      read: false,
      createdAt: new Date('2026-03-02T09:05:00Z'),
    });
  });
  await mongo.collection('notifications').insertMany(notifications);

  // ---------- resumen ----------
  const sorted = Object.values(table).sort(
    (x, y) =>
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst),
  );
  const leader = teams.find((t) => t.id === sorted[0].teamId)!;

  console.log('\n✅ Seed completado. Resumen:');
  console.table({
    usuarios: 1 + referees.length + players.length,
    equipos: teams.length,
    miembros: members.length,
    sedes: venues.length,
    partidos: schedule.flat().length,
    'partidos jugados': playedMatches.length,
    'eventos (mongo)': matchEvents.length,
    sanciones: sanctions.length,
    notificaciones: notifications.length,
    'feed (mongo)': activityFeed.length,
  });
  console.log(`\n🥇 Líder: ${leader.name} con ${sorted[0].points} pts`);
  console.log('\n🔐 Credenciales de acceso (todas con la misma contraseña):');
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Admin:    admin@unifootball.com`);
  console.log(`   Referee:  referee1@unifootball.com`);
  console.log(`   Jugador:  ${players[0].email}`);

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en el seed:', err);
  process.exit(1);
});
