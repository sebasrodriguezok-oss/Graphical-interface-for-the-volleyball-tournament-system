import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Team } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './team-form.html',
  styleUrl: './team-form.css',
})
export class TeamForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly teamId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly isEditing = computed(() => this.teamId() !== null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\\S/), Validators.maxLength(100)]],
    category: ['', [Validators.required, Validators.maxLength(50)]],
    coach: [''],
    playerCount: [6, [Validators.required, Validators.min(1), Validators.max(30)]],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly voleyService: VoleyService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.teamId.set(id);

    if (id) {
      this.loadTeam(id);
    }
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
          this.errorMessage.set('No se pudo cargar el equipo.');
        },
      });
  }

  submit(): void {
    if (this.saving() || this.loading() || this.loadFailed()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const id = this.teamId();
    const request$ = id
      ? this.voleyService.updateTeam(id, this.form.getRawValue())
      : this.voleyService.createTeam(this.form.getRawValue());

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/teams']),
      error: () => {
        this.errorMessage.set(
          id
            ? 'No se pudo actualizar el equipo. Revisa los datos e intenta nuevamente.'
            : 'No se pudo crear el equipo. Revisa los datos e intenta nuevamente.',
        );
      },
    });
  }
}
