import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Enrollment, Match, Team, Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

interface EnrolledTeam {
  enrollment: Enrollment;
  team: Team | undefined;
}

@Component({
  selector: 'app-tournament-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tournament-details.html',
  styleUrl: './tournament-details.css',
})
export class TournamentDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly tournament = signal<Tournament | null>(null);
  readonly enrolledTeams = signal<EnrolledTeam[]>([]);
  readonly matches = signal<Match[]>([]);
  readonly loading = signal(false);
  readonly loadingAction = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly hasFixture = computed(() => this.matches().length > 0);
  readonly canManageEnrollments = computed(
    () => this.tournament()?.status === 'pending' && !this.hasFixture(),
  );
  readonly canGenerateFixture = computed(() => {
    const tournament = this.tournament();
    const enrolledCount = this.enrolledTeams().length;
    return !!tournament &&
      tournament.status === 'pending' &&
      !this.hasFixture() &&
      enrolledCount >= 2 &&
      enrolledCount === tournament.teamCount;
  });

  private tournamentId: string | null = null;

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('id');
    if (!this.tournamentId) {
      this.errorMessage.set('No se pudo cargar el torneo.');
      return;
    }
    this.loadDetails();
  }

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.i18n.setLanguage(target.value);
  }

  loadDetails(): void {
    const id = this.tournamentId;
    if (!id) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      tournament: this.voleyService.getTournament(id),
      enrollments: this.voleyService.getEnrollmentsByTournament(id),
      teams: this.voleyService.getTeams(),
      matches: this.voleyService.getMatchesByTournament(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ tournament, enrollments, teams, matches }) => {
          const teamsById = new Map(teams.map((team) => [team.id, team]));
          this.tournament.set(tournament);
          this.enrolledTeams.set(
            enrollments.map((enrollment) => ({
              enrollment,
              team: teamsById.get(enrollment.teamId),
            })),
          );
          this.matches.set(matches);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.apiError(error, 'No se pudo cargar el torneo.'));
        },
      });
  }

  generateFixture(): void {
    const id = this.tournamentId;
    if (!id || !this.canGenerateFixture() || this.loadingAction()) return;

    this.loadingAction.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.voleyService
      .generateFixture(id)
      .pipe(finalize(() => this.loadingAction.set(false)))
      .subscribe({
        next: (result) => {
          this.actionSuccess.set(
            this.i18n.t('Fixture generado correctamente', {
              matches: result.matches,
              rounds: result.rounds,
            }),
          );
          this.loadDetails();
        },
        error: (error: unknown) => {
          this.actionError.set(this.apiError(error, 'No se pudo generar el fixture.'));
        },
      });
  }

  withdrawTeam(item: EnrolledTeam): void {
    if (!this.canManageEnrollments() || this.loadingAction() || !item.team) return;
    const confirmed = window.confirm(
      this.i18n.t('¿Eliminar al equipo {name} de este torneo?', { name: item.team.name }),
    );
    if (!confirmed) return;

    this.loadingAction.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.voleyService
      .withdrawEnrollment(item.enrollment.id)
      .pipe(finalize(() => this.loadingAction.set(false)))
      .subscribe({
        next: () => {
          this.actionSuccess.set(this.i18n.t('Equipo eliminado de la inscripción'));
          this.loadDetails();
        },
        error: (error: unknown) => {
          this.actionError.set(this.apiError(error, 'No se pudo eliminar la inscripción.'));
        },
      });
  }

  private apiError(error: unknown, fallback: TranslationKey): string {
    const message = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
      ? error.error.error
      : null;
    if (!message) return this.i18n.t(fallback);

    const messages: Record<string, TranslationKey> = {
      'At least two enrolled teams are required to generate a fixture':
        'Al menos dos equipos deben estar inscriptos para generar el fixture',
      'The number of enrolled teams must exactly match the tournament team count':
        'La cantidad de equipos inscriptos debe coincidir con la esperada',
      'All enrolled teams must match the tournament category':
        'Todos los equipos deben pertenecer a la categoría del torneo',
      'Fixture has already been generated': 'Las inscripciones quedan cerradas al generar el fixture.',
      'Enrollments can only be changed for pending tournaments':
        'Las inscripciones quedan cerradas al generar el fixture.',
      'Enrollments cannot be changed after the fixture is generated':
        'Las inscripciones quedan cerradas al generar el fixture.',
    };
    return messages[message] ? this.i18n.t(messages[message]) : message;
  }
}
