import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-tournament-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './tournament-form.html',
  styleUrl: './tournament-form.css',
})
export class TournamentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly tournamentId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly isEditing = computed(() => this.tournamentId() !== null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\\S/), Validators.maxLength(100)]],
    type: ['round_robin', [Validators.required]],
    category: ['', [Validators.required, Validators.maxLength(50)]],
    startDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    endDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    teamCount: [4, [Validators.required, Validators.min(2), Validators.max(64)]],
    status: ['pending', [Validators.required]],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly voleyService: VoleyService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.tournamentId.set(id);

    if (id) {
      this.loadTournament(id);
    }
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

  submit(): void {
    if (this.saving() || this.loading() || this.loadFailed()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const id = this.tournamentId();
    const request$ = id
      ? this.voleyService.updateTournament(id, this.form.getRawValue() as any)
      : this.voleyService.createTournament(this.form.getRawValue() as any);


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
}
