import { Routes } from '@angular/router';
import { TournamentList } from './tournament-list/tournament-list';
import { TournamentForm } from './tournament-form/tournament-form';
import { TeamList } from './team-list/team-list';
import { TeamForm } from './team-form/team-form';
import { EnrollmentForm } from './enrollment-form/enrollment-form';
import { MatchesList } from './matches-list/matches-list';
import { StandingsList } from './standings-list/standings-list';

export const routes: Routes = [
  { path: 'tournaments', component: TournamentList },
  { path: 'tournaments/new', component: TournamentForm },
  { path: 'tournaments/:id/edit', component: TournamentForm },
  { path: 'teams', component: TeamList },
  { path: 'teams/new', component: TeamForm },
  { path: 'teams/:id/edit', component: TeamForm },
  { path: 'enroll', component: EnrollmentForm },
  { path: 'matches/:tournamentId', component: MatchesList },
  { path: 'standings/:tournamentId', component: StandingsList },
  { path: '', redirectTo: '/tournaments', pathMatch: 'full' },
];
