import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Team, TeamPayload } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

const categoryNames = [
  'Sub 12 Femenino',
  'Sub 12 Masculino',
  'Sub 14 Femenino',
  'Sub 14 Masculino',
  'Sub 16 Femenino',
  'Sub 16 Masculino',
  'Sub 18 Femenino',
  'Sub 18 Masculino',
  'Sub 21 Femenino',
  'Sub 21 Masculino',
  'Primera División Femenino',
  'Primera División Masculino',
  'Maxivoley Femenino',
  'Maxivoley Masculino',
] as const satisfies readonly TranslationKey[];

const apiErrors: Record<string, TranslationKey> = {
  'Team name is required': 'El nombre del equipo es obligatorio',
  'Team name must not exceed 100 characters': 'El nombre no puede superar 100 caracteres',
  'A team with this name already exists': 'Ya existe un equipo con ese nombre',
  'Team category is required': 'La categoría es obligatoria',
  'Team category is not supported': 'Selecciona una categoría habilitada',
  'Team must have at least 6 players': 'El equipo debe tener al menos 6 jugadores',
};

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './team-form.html',
  styleUrl: './team-form.css',
})
export class TeamForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);
  private readonly router = inject(Router);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly categoryOptions = categoryNames;
  readonly teamId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly isEditing = computed(() => this.teamId() !== null);
  readonly saving = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    category: ['', [Validators.required, Validators.maxLength(50)]],
    coach: [''],
    playerCount: [
      6,
      [Validators.required, Validators.min(6), Validators.max(30), Validators.pattern(/^\d+$/)],
    ],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.teamId.set(id);

    if (id) {
      this.loadTeam(id);
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

    const rawValue = this.form.getRawValue();
    const teamData: TeamPayload = {
      name: rawValue.name.trim().replace(/\s+/g, ' '),
      category: rawValue.category,
      coach: rawValue.coach.trim(),
      playerCount: rawValue.playerCount,
    };

    this.form.controls.name.setValue(teamData.name);
    this.saving.set(true);
    this.errorMessage.set(null);

    const id = this.teamId();
    const request$ = id
      ? this.voleyService.updateTeam(id, teamData)
      : this.voleyService.createTeam(teamData);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/teams']),
      error: (error: unknown) => this.errorMessage.set(this.getApiError(error)),
    });
  }

  private loadTeam(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .getTeam(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (team) => {
          this.form.patchValue({
            name: team.name,
            category: team.category,
            coach: team.coach ?? '',
            playerCount: team.playerCount,
          });
        },
        error: () => {
          this.loadFailed.set(true);
          this.errorMessage.set('No se pudo cargar el equipo');
        },
      });
  }

  private getApiError(error: unknown): TranslationKey {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.error;
      if (typeof message === 'string') {
        if (apiErrors[message]) return apiErrors[message];
        if (message.startsWith('Team category cannot be changed')) {
          return 'No se puede cambiar la categoría por las inscripciones activas';
        }
      }
    }

    return this.isEditing()
      ? 'No se pudo actualizar el equipo. Revisa los datos e intenta nuevamente.'
      : 'No se pudo crear el equipo. Revisa los datos e intenta nuevamente.';
  }
}
