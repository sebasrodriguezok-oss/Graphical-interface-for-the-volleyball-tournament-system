import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Team } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-list.html',
  styleUrl: './team-list.css',
})
export class TeamList implements OnInit {
  private readonly voleyService = inject(VoleyService);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly dataSource = signal<Team[]>([]);
  readonly searchTerm = signal('');
  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  readonly actionErrorMessage = signal<TranslationKey | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);
  readonly filteredTeams = computed(() => {
    const query = this.searchTerm().trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (!query) return this.dataSource();

    return this.dataSource().filter((team) =>
      [team.name, team.category, team.coach ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    );
  });

  ngOnInit(): void {
    this.loadTeams();
  }

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.i18n.setLanguage(target.value);
    }
  }

  onSearch(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchTerm.set(target.value);
    }
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  deleteTeam(team: Team): void {
    if (this.deletingIds().has(team.id)) return;
    if (!window.confirm(this.i18n.t('¿Seguro que quieres eliminar el equipo {name}?', { name: team.name }))) {
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
        next: () => this.dataSource.update((teams) => teams.filter((item) => item.id !== team.id)),
        error: (error: unknown) => this.actionErrorMessage.set(this.getDeleteError(error)),
      });
  }

  private loadTeams(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTeams()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (teams) => this.dataSource.set(teams),
        error: () =>
          this.errorMessage.set('No se pudieron cargar los equipos. Intenta nuevamente más tarde.'),
      });
  }

  private getDeleteError(error: unknown): TranslationKey {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.error;
      if (message === 'Team cannot be deleted while it has active enrollments') {
        return 'No se puede eliminar el equipo porque tiene inscripciones activas';
      }
      if (message === 'Team cannot be deleted because it has played matches') {
        return 'No se puede eliminar el equipo porque tiene partidos disputados';
      }
    }

    return 'No se pudo eliminar el equipo. Intenta nuevamente.';
  }
}
