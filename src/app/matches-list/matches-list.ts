import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, finalize, timeout } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Match, MatchStatus, Team, Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

interface MatchRound {
  round: number;
  matches: Match[];
}

@Component({
  selector: 'app-matches-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './matches-list.html',
  styleUrl: './matches-list.css',
})
export class MatchesList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);

  readonly i18n = inject(I18nService);
  readonly tournamentId = signal<string | null>(null);
  readonly tournament = signal<Tournament | null>(null);
  readonly matches = signal<Match[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly scoreSelections = signal<Record<string, string>>({});
  readonly savingMatchIds = signal<ReadonlySet<string>>(new Set());
  readonly loading = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);
  readonly actionErrorMessage = signal<string | null>(null);
  readonly actionSuccessMessage = signal<TranslationKey | null>(null);
  readonly scoreOptions = [
    { value: '2-0', winner: 'Local' },
    { value: '2-1', winner: 'Local' },
    { value: '1-2', winner: 'Visitante' },
    { value: '0-2', winner: 'Visitante' },
  ] as const;

  readonly rounds = computed(() => {
    const matchesByRound = new Map<number, Match[]>();
    for (const match of this.matches()) {
      const roundMatches = matchesByRound.get(match.round) ?? [];
      roundMatches.push(match);
      matchesByRound.set(match.round, roundMatches);
    }

    return [...matchesByRound.entries()]
      .sort(([firstRound], [secondRound]) => firstRound - secondRound)
      .map(([round, matches]) => ({ round, matches }));
  });
  readonly completedMatches = computed(
    () => this.matches().filter((match) => match.status === MatchStatus.Finished).length,
  );
  readonly completionPercentage = computed(() =>
    this.matches().length
      ? Math.round((this.completedMatches() / this.matches().length) * 100)
      : 0,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('tournamentId');
    this.tournamentId.set(id);

    if (!id) {
      this.errorMessage.set('No se ha especificado un torneo.');
      return;
    }
    this.loadMatchesAndTeams(id);
  }

  private loadMatchesAndTeams(tournamentId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      tournament: this.voleyService.getTournament(tournamentId),
      teams: this.voleyService.getTeams(),
      matches: this.voleyService.getMatchesByTournament(tournamentId),
    })
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ tournament, teams, matches }) => {
          this.tournament.set(tournament);
          this.teams.set(teams);
          this.matches.set(matches);
          this.scoreSelections.update((selections) => {
            const nextSelections = { ...selections };
            for (const match of matches) {
              nextSelections[match.id] ??=
                match.homeScore !== null && match.awayScore !== null
                  ? `${match.homeScore}-${match.awayScore}`
                  : '';
            }
            return nextSelections;
          });
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'Torneo no encontrado'
              : 'No se pudo cargar el fixture. Intenta nuevamente.',
          );
        },
      });
  }

  setScoreSelection(matchId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.scoreSelections.update((selections) => ({
        ...selections,
        [matchId]: target.value,
      }));
    }
  }

  scoreSelection(match: Match): string {
    return this.scoreSelections()[match.id] ??
      (match.homeScore !== null && match.awayScore !== null
        ? `${match.homeScore}-${match.awayScore}`
        : '');
  }

  saveScore(match: Match): void {
    const tournamentId = this.tournamentId();
    const selectedScore = this.scoreSelection(match);
    const [homeScore, awayScore] = selectedScore.split('-').map(Number);
    if (
      !tournamentId ||
      this.tournament()?.status === 'finished' ||
      !this.scoreOptions.some((option) => option.value === selectedScore) ||
      this.savingMatchIds().has(match.id)
    ) {
      return;
    }

    this.savingMatchIds.update((ids) => new Set(ids).add(match.id));
    this.actionErrorMessage.set(null);
    this.actionSuccessMessage.set(null);

    this.voleyService
      .updateMatchScore(match.id, { homeScore, awayScore })
      .pipe(
        finalize(() =>
          this.savingMatchIds.update((ids) => this.withoutMatchId(ids, match.id)),
        ),
      )
      .subscribe({
        next: () => {
          this.actionSuccessMessage.set('Resultado guardado correctamente.');
          this.loadMatchesAndTeams(tournamentId);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getApiErrorMessage(error));
        },
      });
  }

  getTeamName(teamId: string): string {
    return this.teams().find((team) => team.id === teamId)?.name ??
      this.i18n.t('Equipo no encontrado');
  }

  completedMatchesInRound(round: MatchRound): number {
    return round.matches.filter((match) => match.status === MatchStatus.Finished).length;
  }

  private withoutMatchId(ids: ReadonlySet<string>, matchId: string): Set<string> {
    const remaining = new Set(ids);
    remaining.delete(matchId);
    return remaining;
  }

  private getApiErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      const messages: Record<string, TranslationKey> = {
        'Finished match scores are required': 'El resultado del partido está incompleto',
        'Matches in finalized tournaments cannot be modified':
          'No se pueden modificar partidos de un torneo finalizado',
      };
      const message = error.error.error;
      if (message.startsWith('Invalid score: ')) {
        return this.i18n.t('El resultado debe ser 2-0, 2-1, 1-2 o 0-2');
      }
      return messages[message] ? this.i18n.t(messages[message]) : message;
    }
    return this.i18n.t('No se pudo guardar el resultado. Intenta nuevamente.');
  }
}
