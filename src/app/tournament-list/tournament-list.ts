import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, timeout } from 'rxjs';
import { Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    RouterLink,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
})
export class TournamentList implements OnInit {
  readonly dataSource = signal<Tournament[]>([]);
  readonly displayedColumns: string[] = [
    'name',
    'type',
    'category',
    'startDate',
    'endDate',
    'teamCount',
    'status',
    'actions',
  ];
  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  readonly actionErrorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(private readonly voleyService: VoleyService) {}

  ngOnInit() {
    this.loadTournaments();
  }

  loadTournaments() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTournaments()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (tournaments) => {
          this.dataSource.set(tournaments);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los torneos. Intenta nuevamente más tarde.');
        },
      });
  }

  deleteTournament(tournament: Tournament): void {
    if (this.deletingIds().has(tournament.id)) return;
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el torneo ${tournament.name}?`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingIds.update((ids) => new Set(ids).add(tournament.id));
    this.actionErrorMessage.set(null);

    this.voleyService
      .deleteTournament(tournament.id)
      .pipe(
        finalize(() =>
          this.deletingIds.update((ids) => {
            const remaining = new Set(ids);
            remaining.delete(tournament.id);
            return remaining;
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.dataSource.update((tournaments) =>
            tournaments.filter((item) => item.id !== tournament.id),
          );
        },
        error: () => {
          this.actionErrorMessage.set(`No se pudo eliminar el torneo ${tournament.name}. Intenta nuevamente.`);
        },
      });
  }
}
