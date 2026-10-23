import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Match, Team } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-matches-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    RouterLink,
  ],
  templateUrl: './matches-list.html',
  styleUrl: './matches-list.css',
})
export class MatchesList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);

  readonly tournamentId = signal<string | null>(null);
  readonly matches = signal<Match[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly displayedColumns: string[] = [
    'round',
    'homeTeam',
    'homeScore',
    'vs',
    'awayScore',
    'awayTeam',
    'date',
    'status',
    'actions',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('tournamentId');
    this.tournamentId.set(id);

    if (id) {
      this.loadMatchesAndTeams(id);
    } else {
      this.errorMessage.set('No se ha especificado un torneo.');
    }
  }

  private loadMatchesAndTeams(tournamentId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Cargamos equipos primero para poder resolver los nombres en la tabla
    this.voleyService.getTeams().pipe(
      finalize(() => {
        // Una vez cargados los equipos, cargamos los partidos
        this.loadMatches(tournamentId);
      })
    ).subscribe({
      next: (teams) => this.teams.set(teams),
      error: () => this.errorMessage.set('Error al cargar los equipos.')
    });
  }

  private loadMatches(tournamentId: string): void {
    this.voleyService
      .getMatchesByTournament(tournamentId)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (matches) => this.matches.set(matches),
        error: () => this.errorMessage.set('No se pudieron cargar los partidos.')
      });
  }

  updateScore(match: Match): void {
    const score = prompt('Ingresa el marcador (ej. 2-1):');
    if (!score) return;

    const [home, away] = score.split('-').map(Number);
    if (isNaN(home) || isNaN(away)) {
      alert('Formato inválido. Usa: Local-Visitante');
      return;
    }

    this.voleyService.updateMatchScore(match.id, { homeScore: home, awayScore: away })
      .subscribe({
        next: () => this.loadMatches(this.tournamentId()!),
        error: () => alert('Error al actualizar el marcador')
      });
  }

  getTeamName(teamId: string): string {
    const team = this.teams().find(t => t.id === teamId);
    return team ? team.name : 'Cargando...';
  }
}
