import { MatchResultStatus } from '../entities/match-result.entity';

export interface LiveMatchEventDto {
  _id: string;
  type: string;
  minute: number;
  playerName: string;
  teamName: string;
  description: string | null;
}

export interface LiveMatchResultDto {
  homeScore: number;
  awayScore: number;
  status: MatchResultStatus;
}

export interface LiveMatchDto {
  matchId: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  result: LiveMatchResultDto | null;
  events: LiveMatchEventDto[];
}
