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
import { Tournament, Team, Enrollment } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

@Component({
  selector: 'app-enrollment-form',
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
  templateUrl: './enrollment-form.html',
  styleUrl: './enrollment-form.css',
})
export class EnrollmentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly tournaments = signal<Tournament[]>([]);
  readonly teams = signal<Team[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    tournamentId: ['', [Validators.required]],
    teamId: ['', [Validators.required]],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly voleyService: VoleyService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.form.patchValue({ tournamentId });
    }
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    // Cargamos torneos y equipos en paralelo
    this.voleyService.getTournaments().subscribe({
      next: (t) => this.tournaments.set(t),
      error: () => this.errorMessage.set('Error al cargar los torneos.')
    });

    this.voleyService.getTeams().subscribe({
      next: (teams) => this.teams.set(teams),
      error: () => this.errorMessage.set('Error al cargar los equipos.'),
      complete: () => this.loading.set(false)
    });
  }

  submit(): void {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.voleyService
      .enrollTeam(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          // Redirigimos al torneo seleccionado para ver la inscripción
          const tId = this.form.getRawValue().tournamentId;
          this.router.navigate(['/tournaments', tId]);
        },
        error: () => {
          this.errorMessage.set('No se pudo realizar la inscripción. El equipo podría ya estar inscrito.');
        },
      });
  }
}
