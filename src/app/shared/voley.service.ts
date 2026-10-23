import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Tournament, Team, Match, Enrollment, Standing } from './voley';

@Injectable({
  providedIn: 'root',
})
export class VoleyService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private readonly httpClient: HttpClient) {}

  // Tournaments
  getTournaments(): Observable<Tournament[]> {
    return this.httpClient.get<Tournament[]>(`${this.apiUrl}/tournaments`);
  }

  getTournament(id: string): Observable<Tournament> {
    return this.httpClient.get<Tournament>(`${this.apiUrl}/tournaments/${id}`);
  }

  createTournament(tournament: Partial<Tournament>): Observable<Tournament> {
    return this.httpClient.post<Tournament>(`${this.apiUrl}/tournaments`, tournament);
  }

  updateTournament(id: string, changes: Partial<Tournament>): Observable<Tournament> {
    return this.httpClient.put<Tournament>(`${this.apiUrl}/tournaments/${id}`, changes);
  }

  deleteTournament(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/tournaments/${id}`);
  }

  // Teams
  getTeams(): Observable<Team[]> {
    return this.httpClient.get<Team[]>(`${this.apiUrl}/teams`);
  }

  getTeam(id: string): Observable<Team> {
    return this.httpClient.get<Team>(`${this.apiUrl}/teams/${id}`);
  }

  createTeam(team: Partial<Team>): Observable<Team> {
    return this.httpClient.post<Team>(`${this.apiUrl}/teams`, team);
  }

  updateTeam(id: string, changes: Partial<Team>): Observable<Team> {
    return this.httpClient.put<Team>(`${this.apiUrl}/teams/${id}`, changes);
  }

  deleteTeam(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/teams/${id}`);
  }

  // Enrollments
  enrollTeam(enrollment: Partial<Enrollment>): Observable<Enrollment> {
    return this.httpClient.post<Enrollment>(`${this.apiUrl}/enrollments`, enrollment);
  }

  getEnrollmentsByTournament(tournamentId: string): Observable<Enrollment[]> {
    return this.httpClient.get<Enrollment[]>(`${this.apiUrl}/enrollments/tournament/${tournamentId}`);
  }

  // Matches
  getMatchesByTournament(tournamentId: string): Observable<Match[]> {
    return this.httpClient.get<Match[]>(`${this.apiUrl}/matches/tournament/${tournamentId}`);
  }

  updateMatchScore(id: string, score: { homeScore: number, awayScore: number }): Observable<Match> {
    return this.httpClient.patch<Match>(`${this.apiUrl}/matches/${id}/score`, score);
  }

  // Standings
  getStandings(tournamentId: string): Observable<Standing[]> {
    return this.httpClient.get<Standing[]>(`${this.apiUrl}/standings/tournament/${tournamentId}`);
  }
}
