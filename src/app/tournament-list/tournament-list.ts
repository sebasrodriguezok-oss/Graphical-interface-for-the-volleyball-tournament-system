import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
})
export class TournamentList implements OnInit {
  private readonly voleyService = inject(VoleyService);
  private readonly router = inject(Router);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly dataSource = signal<Tournament[]>([]);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | Tournament['status']>('all');
  readonly filteredTournaments = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('es');
    return this.dataSource().filter((tournament) => {
      const matchesQuery = !query || tournament.name.toLocaleLowerCase('es').includes(query);
      const matchesStatus =
        this.statusFilter() === 'all' || tournament.status === this.statusFilter();
      return matchesQuery && matchesStatus;
    });
  });
  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  readonly finishingIds = signal<ReadonlySet<string>>(new Set());
  readonly actionErrorMessage = signal<string | null>(null);
  readonly actionSuccessMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  ngOnInit(): void {
    this.loadTournaments();
  }

  setSearchQuery(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) this.searchQuery.set(input.value);
  }

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.i18n.setLanguage(target.value);
  }

  loadTournaments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTournaments()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (tournaments) => this.dataSource.set(tournaments),
        error: () => {
          this.errorMessage.set('No se pudieron cargar los torneos. Intenta nuevamente más tarde.');
        },
      });
  }

  deleteTournament(tournament: Tournament): void {
    if (tournament.status !== 'pending' || this.deletingIds().has(tournament.id)) return;
    const confirmed = window.confirm(
      this.i18n.t('Confirmar eliminación de torneo', { name: tournament.name }),
    );
    if (!confirmed) return;

    this.deletingIds.update((ids) => new Set(ids).add(tournament.id));
    this.actionErrorMessage.set(null);
    this.actionSuccessMessage.set(null);

    this.voleyService
      .deleteTournament(tournament.id)
      .pipe(finalize(() => this.deletingIds.update((ids) => this.withoutId(ids, tournament.id))))
      .subscribe({
        next: () => {
          this.dataSource.update((tournaments) =>
            tournaments.filter((item) => item.id !== tournament.id),
          );
          this.actionSuccessMessage.set(this.i18n.t('El torneo se eliminó correctamente'));
          void this.router.navigate(['/tournaments']);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getApiErrorMessage(error, 'delete'));
        },
      });
  }

  finishTournament(tournament: Tournament): void {
    if (tournament.status !== 'in_progress' || this.finishingIds().has(tournament.id)) return;
    if (!window.confirm(this.i18n.t('¿Finalizar el torneo {name}?', { name: tournament.name }))) return;

    this.finishingIds.update((ids) => new Set(ids).add(tournament.id));
    this.actionErrorMessage.set(null);
    this.actionSuccessMessage.set(null);

    this.voleyService
      .finishTournament(tournament.id)
      .pipe(finalize(() => this.finishingIds.update((ids) => this.withoutId(ids, tournament.id))))
      .subscribe({
        next: (updatedTournament) => {
          this.dataSource.update((tournaments) =>
            tournaments.map((item) => item.id === updatedTournament.id ? updatedTournament : item),
          );
          this.actionSuccessMessage.set(this.i18n.t('El torneo se finalizó correctamente'));
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getApiErrorMessage(error, 'finish'));
        },
      });
  }

  private withoutId(ids: ReadonlySet<string>, id: string): Set<string> {
    const remaining = new Set(ids);
    remaining.delete(id);
    return remaining;
  }

  private getApiErrorMessage(error: unknown, action: 'delete' | 'finish'): string {
    const message = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
      ? error.error.error
      : '';
    const knownMessages: Record<string, TranslationKey> = {
      'Only pending tournaments can be deleted': 'Solo se pueden eliminar torneos pendientes',
      'Tournament has played matches or recorded results and cannot be deleted':
        'No se puede eliminar un torneo con partidos disputados o resultados',
      'Tournament cannot be finalized while matches remain unresolved':
        'No se puede finalizar un torneo con partidos sin resolver',
    };
    if (knownMessages[message]) return this.i18n.t(knownMessages[message]);
    return message
      ? `${this.i18n.t(action === 'delete' ? 'No se pudo eliminar el torneo' : 'No se pudo finalizar el torneo')}: ${message}`
      : this.i18n.t(action === 'delete' ? 'No se pudo eliminar el torneo' : 'No se pudo finalizar el torneo');
  }
}
