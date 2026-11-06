import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Team, Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './enrollment-form.html',
  styleUrl: './enrollment-form.css',
})
export class EnrollmentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly voleyService = inject(VoleyService);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly tournaments = signal<Tournament[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly selectedTournamentId = signal('');
  readonly selectedTeamId = signal('');
  readonly enrolledTeamIds = signal<ReadonlySet<string>>(new Set());
  readonly loading = signal(false);
  readonly checkingTournament = signal(false);
  readonly checkingTeam = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<TranslationKey | null>(null);
  readonly errorMessage = signal<TranslationKey | null>(null);
  readonly apiErrorMessage = signal<string | null>(null);
  readonly tournamentEligibilityError = signal<TranslationKey | null>(null);
  readonly teamEligibilityError = signal<TranslationKey | null>(null);
  readonly tournamentEligibilityChecked = signal(false);
  readonly teamEligibilityChecked = signal(false);
  readonly activeEnrollmentCount = signal(0);
  readonly tournamentHasFixture = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    tournamentId: ['', [Validators.required]],
    teamId: [{ value: '', disabled: true }, [Validators.required]],
  });

  readonly availableTournaments = computed(() =>
    this.tournaments().filter((tournament) =>
      tournament.status === 'pending' || tournament.id === this.contextualTournamentId,
    ),
  );
  readonly selectedTournament = computed(() =>
    this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null,
  );
  readonly availableTeams = computed(() => {
    const tournament = this.selectedTournament();
    if (!tournament) return [];
    return this.teams().filter(
      (team) => team.category === tournament.category && !this.enrolledTeamIds().has(team.id),
    );
  });
  readonly canSubmit = computed(() => {
    const tournament = this.selectedTournament();
    const teamId = this.selectedTeamId();
    return this.form.valid &&
      !this.loading() &&
      !this.checkingTournament() &&
      !this.checkingTeam() &&
      !this.saving() &&
      !!tournament &&
      tournament.status === 'pending' &&
      this.tournamentEligibilityChecked() &&
      !this.tournamentEligibilityError() &&
      !this.tournamentHasFixture() &&
      this.activeEnrollmentCount() < tournament.teamCount &&
      this.teamEligibilityChecked() &&
      !this.teamEligibilityError() &&
      this.availableTeams().some((team) => team.id === teamId);
  });

  private contextualTournamentId: string | null = null;
  private tournamentValidationSequence = 0;
  private teamValidationSequence = 0;

  ngOnInit(): void {
    this.contextualTournamentId = this.route.snapshot.paramMap.get('tournamentId');
    this.loadData();
  }

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.i18n.setLanguage(target.value);
  }

  onTournamentChange(): void {
    const sequence = ++this.tournamentValidationSequence;
    this.checkingTournament.set(false);
    const tournamentId = this.form.controls.tournamentId.value;
    this.selectedTournamentId.set(tournamentId);
    this.selectedTeamId.set('');
    this.form.controls.teamId.reset('');
    this.form.controls.teamId.disable();
    this.resetTeamEligibility();
    this.enrolledTeamIds.set(new Set());
    this.tournamentEligibilityChecked.set(false);
    this.tournamentEligibilityError.set(null);
    this.tournamentHasFixture.set(false);
    this.activeEnrollmentCount.set(0);
    this.apiErrorMessage.set(null);

    const tournament = this.selectedTournament();
    if (!tournamentId || !tournament) return;
    if (tournament.status !== 'pending') {
      this.tournamentEligibilityError.set('Solo se permiten inscripciones en torneos pendientes');
      this.tournamentEligibilityChecked.set(true);
      return;
    }

    this.checkingTournament.set(true);
    forkJoin({
      enrollments: this.voleyService.getEnrollmentsByTournament(tournamentId),
      matches: this.voleyService.getMatchesByTournament(tournamentId),
    })
      .pipe(finalize(() => {
        if (sequence === this.tournamentValidationSequence) this.checkingTournament.set(false);
      }))
      .subscribe({
        next: ({ enrollments, matches }) => {
          if (sequence !== this.tournamentValidationSequence) return;
          this.activeEnrollmentCount.set(enrollments.length);
          this.enrolledTeamIds.set(new Set(enrollments.map((enrollment) => enrollment.teamId)));
          this.tournamentHasFixture.set(matches.length > 0);
          if (matches.length > 0) {
            this.tournamentEligibilityError.set('No se puede inscribir después de generar el fixture');
          } else if (enrollments.length >= tournament.teamCount) {
            this.tournamentEligibilityError.set('El torneo alcanzó su capacidad máxima de equipos');
          } else {
            this.form.controls.teamId.enable();
          }
          this.tournamentEligibilityChecked.set(true);
        },
        error: () => {
          if (sequence !== this.tournamentValidationSequence) return;
          this.apiErrorMessage.set(this.i18n.t('No se pudieron verificar las inscripciones. Intenta nuevamente.'));
        },
      });
  }

  onTeamChange(): void {
    const sequence = ++this.teamValidationSequence;
    const teamId = this.form.controls.teamId.value;
    this.selectedTeamId.set(teamId);
    const tournamentId = this.form.controls.tournamentId.value;
    this.teamEligibilityChecked.set(false);
    this.teamEligibilityError.set(null);
    this.checkingTeam.set(false);
    this.apiErrorMessage.set(null);
    if (!teamId || !tournamentId) return;

    const team = this.teams().find((item) => item.id === teamId);
    const tournament = this.selectedTournament();
    if (!team || !tournament) return;
    if (team.category !== tournament.category) {
      this.teamEligibilityError.set('La categoría del equipo no coincide con la del torneo');
      this.teamEligibilityChecked.set(true);
      return;
    }
    if (this.enrolledTeamIds().has(teamId)) {
      this.teamEligibilityError.set('El equipo ya está inscripto en este torneo');
      this.teamEligibilityChecked.set(true);
      return;
    }

    this.checkingTeam.set(true);
    this.voleyService
      .getEnrollmentsByTeam(teamId)
      .pipe(finalize(() => {
        if (sequence === this.teamValidationSequence) this.checkingTeam.set(false);
      }))
      .subscribe({
        next: (enrollments) => {
          if (sequence !== this.teamValidationSequence) return;
          if (enrollments.some((enrollment) => enrollment.tournamentId === tournamentId)) {
            this.teamEligibilityError.set('El equipo ya está inscripto en este torneo');
          }
          this.teamEligibilityChecked.set(true);
        },
        error: () => {
          if (sequence !== this.teamValidationSequence) return;
          this.apiErrorMessage.set(this.i18n.t('No se pudo verificar el historial del equipo. Intenta nuevamente.'));
        },
      });
  }

  cancelLink(): string[] {
    const tournamentId = this.contextualTournamentId;
    return tournamentId ? ['/tournaments', tournamentId] : ['/tournaments'];
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const { tournamentId, teamId } = this.form.getRawValue();
    this.saving.set(true);
    this.apiErrorMessage.set(null);

    this.voleyService
      .enrollTeam({ tournamentId, teamId })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/tournaments', tournamentId]);
        },
        error: (error: unknown) => {
          this.apiErrorMessage.set(this.getApiErrorMessage(error));
        },
      });
  }

  private loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      tournaments: this.voleyService.getTournaments(),
      teams: this.voleyService.getTeams(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ tournaments, teams }) => {
          this.tournaments.set(tournaments);
          this.teams.set(teams);
          if (this.contextualTournamentId) {
            const tournamentExists = tournaments.some(
              (tournament) => tournament.id === this.contextualTournamentId,
            );
            if (!tournamentExists) {
              this.loadError.set('Torneo no encontrado');
              return;
            }
            this.form.controls.tournamentId.setValue(this.contextualTournamentId);
            this.selectedTournamentId.set(this.contextualTournamentId);
            this.onTournamentChange();
          }
        },
        error: () => {
          this.loadError.set('No se pudieron cargar los datos de inscripción. Intenta nuevamente.');
        },
      });
  }

  private resetTeamEligibility(): void {
    this.teamValidationSequence++;
    this.checkingTeam.set(false);
    this.teamEligibilityChecked.set(false);
    this.teamEligibilityError.set(null);
  }

  private getApiErrorMessage(error: unknown): string {
    const message = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
      ? error.error.error
      : '';
    const knownMessages: Record<string, TranslationKey> = {
      'Tournament not found': 'Torneo no encontrado',
      'Team not found': 'Equipo no encontrado',
      'Tournament is not open for enrollment': 'Solo se permiten inscripciones en torneos pendientes',
      'Enrollments cannot be changed after the fixture is generated':
        'No se puede inscribir después de generar el fixture',
      'Tournament has reached its maximum team capacity': 'El torneo alcanzó su capacidad máxima de equipos',
      'Team is already enrolled in this tournament': 'El equipo ya está inscripto en este torneo',
    };
    if (knownMessages[message]) return this.i18n.t(knownMessages[message]);
    if (message.startsWith('Team category (')) {
      return this.i18n.t('La categoría del equipo no coincide con la del torneo');
    }
    return message || this.i18n.t('No se pudo realizar la inscripción. Intenta nuevamente.');
  }
}
