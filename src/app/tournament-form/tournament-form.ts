import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Tournament, TournamentPayload } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

const dateOrderValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (typeof startDate !== 'string' || typeof endDate !== 'string' || !startDate || !endDate) {
    return null;
  }

  return endDate >= startDate ? null : { dateOrder: true };
};

@Component({
  selector: 'app-tournament-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatProgressSpinnerModule,
  ],
  templateUrl: './tournament-form.html',
  styleUrl: './tournament-form.css',
})
export class TournamentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);
  private readonly router = inject(Router);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly tournamentId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly isEditing = computed(() => this.tournamentId() !== null);
  readonly saving = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);
  readonly originalStartDate = signal<string | null>(null);
  readonly today = this.getLocalDate();

  private readonly startDateValidator: ValidatorFn = (control) => {
    const value = control.value;
    if (typeof value !== 'string' || !value) return null;
    if (value >= this.today) return null;
    return this.isEditing() && value === this.originalStartDate()
      ? null
      : { pastDate: true };
  };

  readonly categoryOptions = [
    { value: 'Sub 12 Femenino', label: 'Sub 12 Femenino' },
    { value: 'Sub 12 Masculino', label: 'Sub 12 Masculino' },
    { value: 'Sub 14 Femenino', label: 'Sub 14 Femenino' },
    { value: 'Sub 14 Masculino', label: 'Sub 14 Masculino' },
    { value: 'Sub 16 Femenino', label: 'Sub 16 Femenino' },
    { value: 'Sub 16 Masculino', label: 'Sub 16 Masculino' },
    { value: 'Sub 18 Femenino', label: 'Sub 18 Femenino' },
    { value: 'Sub 18 Masculino', label: 'Sub 18 Masculino' },
    { value: 'Sub 21 Femenino', label: 'Sub 21 Femenino' },
    { value: 'Sub 21 Masculino', label: 'Sub 21 Masculino' },
    { value: 'Primera División Femenino', label: 'Primera División Femenino' },
    { value: 'Primera División Masculino', label: 'Primera División Masculino' },
    { value: 'Maxivoley Femenino', label: 'Maxivoley Femenino' },
    { value: 'Maxivoley Masculino', label: 'Maxivoley Masculino' },
  ] as const satisfies readonly { value: string; label: TranslationKey }[];

  readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      type: this.formBuilder.nonNullable.control<Tournament['type']>('round_robin', [
        Validators.required,
      ]),
      category: ['', [Validators.required, Validators.maxLength(50)]],
      startDate: ['', [
        Validators.required,
        Validators.pattern(/^\d{4}-\d{2}-\d{2}$/),
        this.startDateValidator,
      ]],
      endDate: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      teamCount: this.formBuilder.control<number | null>(
        null,
        [
          Validators.required,
          Validators.min(2),
          Validators.max(16),
          Validators.pattern(/^\d+$/),
        ],
      ),
    },
    { validators: dateOrderValidator },
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.tournamentId.set(id);

    if (id) {
      this.loadTournament(id);
    }
  }

  onLanguageChange(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLSelectElement) {
      this.i18n.setLanguage(target.value);
    }
  }

  submit(): void {
    if (this.saving() || this.loading() || this.loadFailed()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);

    const id = this.tournamentId();
    const formValue = this.form.getRawValue();
    if (formValue.teamCount === null) {
      this.form.markAllAsTouched();
      return;
    }

    const tournamentData: TournamentPayload = {
      ...formValue,
      teamCount: formValue.teamCount,
    };

    this.saving.set(true);
    this.voleyService
      .getTournaments()
      .subscribe({
        next: (tournaments) => {
          const normalizedName = this.normalizeName(tournamentData.name);
          const duplicate = tournaments.some(
            (tournament) =>
              tournament.id !== id && this.normalizeName(tournament.name) === normalizedName,
          );
          if (duplicate) {
            this.form.controls.name.setErrors({
              ...this.form.controls.name.errors,
              tournamentExists: true,
            });
            this.form.controls.name.markAsTouched();
            this.saving.set(false);
            return;
          }
          this.saveTournament(id, tournamentData);
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('No se pudieron verificar los torneos. Intenta nuevamente.');
        },
      });
  }

  startDateMin(): string {
    const startDate = this.originalStartDate();
    return startDate && startDate < this.today && this.form.controls.startDate.value === startDate
      ? startDate
      : this.today;
  }

  private saveTournament(id: string | null, data: TournamentPayload): void {
    this.saving.set(true);
    const request$ = id
      ? this.voleyService.updateTournament(id, data)
      : this.voleyService.createTournament(data);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/tournaments']),
      error: (error) => {
        this.errorMessage.set(this.getApiErrorMessage(error, id));
      },
    });
  }

  private loadTournament(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTournament(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tournament) => {
          const startDate = this.toInputDate(tournament.startDate);
          this.originalStartDate.set(startDate);
          this.form.patchValue({
            name: tournament.name,
            type: tournament.type,
            category: tournament.category,
            startDate,
            endDate: this.toInputDate(tournament.endDate),
            teamCount: tournament.teamCount,
          });
        },
        error: () => {
          this.loadFailed.set(true);
          this.errorMessage.set('No se pudo cargar el torneo.');
        },
      });
  }

  private normalizeName(name: string): string {
      return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  }

  private toInputDate(value: Date | string): string {
      return value instanceof Date
        ? value.toISOString().substring(0, 10)
        : String(value).substring(0, 10);
  }

  private getLocalDate(): string {
      const now = new Date();
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
      return localDate.toISOString().substring(0, 10);
  }

  private getApiErrorMessage(error: unknown, id: string | null): TranslationKey {
      const message = error instanceof HttpErrorResponse
        ? error.error?.error
        : null;
      const messages: Record<string, TranslationKey> = {
        'A tournament with that name already exists': 'Ya existe un torneo con ese nombre',
        'Tournament name is required': 'El nombre es obligatorio',
        'End date must be equal to or after the start date': 'La fecha de finalización debe ser igual o posterior al inicio',
        'Tournament team count must be an integer between 2 and 16': 'La cantidad debe estar entre 2 y 16',
        'Team count cannot be lower than the number of enrolled teams': 'No se puede reducir la cantidad por debajo de los equipos inscriptos',
        'Tournament structure cannot be changed after it has started': 'No se puede modificar la estructura de un torneo iniciado',
        'Tournament structure cannot be changed after the fixture is generated or the tournament has started': 'No se puede modificar la estructura de un torneo con fixture',
        'Tournament category cannot change while teams are enrolled': 'No se puede cambiar la categoría mientras haya equipos inscriptos',
        'Tournament dates cannot exclude scheduled matches': 'Las fechas dejarían partidos fuera del período del torneo',
        'Tournament type must be round_robin': 'Solo se permite la modalidad todos contra todos (Round Robin)',
        'Tournament category is required': 'La categoría es obligatoria',
        'Start date must use a valid YYYY-MM-DD date': 'La fecha de inicio no es válida',
        'End date must use a valid YYYY-MM-DD date': 'La fecha de finalización no es válida',
      };
      if (typeof message === 'string' && messages[message]) return messages[message];
      return id
        ? 'No se pudo actualizar el torneo. Revisa los datos e intenta nuevamente.'
        : 'No se pudo crear el torneo. Revisa los datos e intenta nuevamente.';
  }
}
