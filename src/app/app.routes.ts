import { Home } from './home/home';
import { Routes } from '@angular/router';
import { TournamentList } from './tournament-list/tournament-list';
import { TournamentForm } from './tournament-form/tournament-form';
import { TournamentDetails } from './tournament-details/tournament-details';
import { TeamList } from './team-list/team-list';
import { TeamForm } from './team-form/team-form';
import { TeamDetails } from './team-details/team-details';
import { EnrollmentForm } from './enrollment-form/enrollment-form';
import { MatchesList } from './matches-list/matches-list';
import { StandingsList } from './standings-list/standings-list';

export const routes: Routes = [
  { path: 'tournaments', component: TournamentList },
  { path: 'tournaments/new', component: TournamentForm },
  { path: 'tournaments/:id/edit', component: TournamentForm },
  { path: 'tournaments/:id', component: TournamentDetails },
  { path: 'teams', component: TeamList },
  { path: 'teams/new', component: TeamForm },
  { path: 'teams/:id/edit', component: TeamForm },
  { path: 'teams/:id', component: TeamDetails },
  { path: 'enroll', component: EnrollmentForm },
  { path: 'enroll/:tournamentId', component: EnrollmentForm },
  { path: 'matches/:tournamentId', component: MatchesList },
  { path: 'standings/:tournamentId', component: StandingsList },
  { path: '', component: Home, pathMatch: 'full' },
];
