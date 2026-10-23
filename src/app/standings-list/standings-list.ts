import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Standing, Team } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-standings-list',
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
  templateUrl: './standings-list.html',
  styleUrl: './standings-list.css',
})
export class StandingsList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);

  readonly tournamentId = signal<string | null>(null);
  readonly standings = signal<Standing[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly displayedColumns: string[] = [
    'position',
    'teamName',
    'played',
    'wins',
    'losses',
    'setsWon',
    'setsLost',
    'points',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('tournamentId');
    this.tournamentId.set(id);

    if (id) {
      this.loadStandingsAndTeams(id);
    } else {
      this.errorMessage.set('No se ha especificado un torneo.');
    }
  }

  private loadStandingsAndTeams(tournamentId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Primero cargamos los equipos para resolver los nombres
    this.voleyService.getTeams().pipe(
      finalize(() => {
        this.loadStandings(tournamentId);
      })
    ).subscribe({
      next: (teams) => this.teams.set(teams),
      error: () => this.errorMessage.set('Error al cargar los equipos.')
    });
  }

  private loadStandings(tournamentId: string): void {
    this.voleyService
      .getStandings(tournamentId)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (standings) => this.standings.set(standings),
        error: () => this.errorMessage.set('No se pudieron cargar las posiciones.')
      });
  }

  getTeamName(teamId: string): string {
    const team = this.teams().find(t => t.id === teamId);
    return team ? team.name : 'Equipo desconocido';
  }

  getPosition(index: number): string {
    return (index + 1).toString();
  }
}
