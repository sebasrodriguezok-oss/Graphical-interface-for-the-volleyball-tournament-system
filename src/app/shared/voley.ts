export interface Tournament {
  id: string;
  name: string;
  type: 'round_robin' | 'group_stage';
  category: string;
  startDate: Date;
  endDate: Date;
  teamCount: number;
  status: 'pending' | 'in_progress' | 'finished';
}

export interface Team {
  id: string;
  name: string;
  category: string;
  coach?: string;
  playerCount: number;
}

export enum MatchStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Finished = 'finished'
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  matchDate: Date | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Enrollment {
  id: string;
  teamId: string;
  tournamentId: string;
  enrollmentDate: Date;
  status: 'active' | 'withdrawn' | 'cancelled';
}

export interface Standing {
  id: string;
  tournamentId: string;
  teamId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  points: number;
}
