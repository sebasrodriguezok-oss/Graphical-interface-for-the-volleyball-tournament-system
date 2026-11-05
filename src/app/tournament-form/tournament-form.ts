import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

  return endDate > startDate ? null : { dateOrder: true };
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

  readonly statusOptions: {
    value: Tournament['status'];
    label: TranslationKey;
  }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En curso' },
    { value: 'finished', label: 'Finalizado' },
  ];

  readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      type: this.formBuilder.nonNullable.control<Tournament['type']>('round_robin', [
        Validators.required,
      ]),
      category: ['', [Validators.required, Validators.maxLength(50)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      teamCount: this.formBuilder.control<number | null>(
        null,
        [
          Validators.required,
          Validators.min(2),
          Validators.max(20),
          Validators.pattern(/^\d+$/),
        ],
      ),
      status: this.formBuilder.nonNullable.control<Tournament['status'] | ''>('', [
        Validators.required,
      ]),
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

    this.saving.set(true);
    this.errorMessage.set(null);

    const id = this.tournamentId();
    const formValue = this.form.getRawValue();
    if (formValue.teamCount === null || formValue.status === '') {
      this.form.markAllAsTouched();
      return;
    }

    const tournamentData: TournamentPayload = {
      ...formValue,
      teamCount: formValue.teamCount,
      status: formValue.status,
    };
    const request$ = id
      ? this.voleyService.updateTournament(id, tournamentData)
      : this.voleyService.createTournament(tournamentData);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/tournaments']),
      error: () => {
        this.errorMessage.set(
          id
            ? 'No se pudo actualizar el torneo. Revisa los datos e intenta nuevamente.'
            : 'No se pudo crear el torneo. Revisa los datos e intenta nuevamente.',
        );
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
          this.form.patchValue({
            name: tournament.name,
            type: tournament.type,
            category: tournament.category,
            startDate: tournament.startDate instanceof Date
              ? tournament.startDate.toISOString().substring(0, 10)
              : String(tournament.startDate).substring(0, 10),
            endDate: tournament.endDate instanceof Date
              ? tournament.endDate.toISOString().substring(0, 10)
              : String(tournament.endDate).substring(0, 10),
            teamCount: tournament.teamCount,
            status: tournament.status,
          });
        },
        error: () => {
          this.loadFailed.set(true);
          this.errorMessage.set('No se pudo cargar el torneo.');
        },
      });
  }
}
