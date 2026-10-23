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
import { Team } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-team-list',
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
  templateUrl: './team-list.html',
  styleUrl: './team-list.css',
})
export class TeamList implements OnInit {
  readonly dataSource = signal<Team[]>([]);
  readonly displayedColumns: string[] = [
    'name',
    'category',
    'coach',
    'playerCount',
    'actions',
  ];
  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  readonly actionErrorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(private readonly voleyService: VoleyService) {}

  ngOnInit() {
    this.loadTeams();
  }

  loadTeams() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTeams()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (teams) => {
          this.dataSource.set(teams);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los equipos. Intenta nuevamente más tarde.');
        },
      });
  }

  deleteTeam(team: Team): void {
    if (this.deletingIds().has(team.id)) return;
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el equipo ${team.name}?`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingIds.update((ids) => new Set(ids).add(team.id));
    this.actionErrorMessage.set(null);

    this.voleyService
      .deleteTeam(team.id)
      .pipe(
        finalize(() =>
          this.deletingIds.update((ids) => {
            const remaining = new Set(ids);
            remaining.delete(team.id);
            return remaining;
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.dataSource.update((teams) =>
            teams.filter((item) => item.id !== team.id),
          );
        },
        error: () => {
          this.actionErrorMessage.set(`No se pudo eliminar el equipo ${team.name}. Intenta nuevamente.`);
        },
      });
  }
}
