import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslationKey } from '../shared/i18n/translations';
import { Enrollment, Team, Tournament } from '../shared/voley';
import { VoleyService } from '../shared/voley.service';

interface TeamEnrollmentDetails {
  enrollment: Enrollment;
  tournament: Tournament | undefined;
}

@Component({
  selector: 'app-team-details',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-details.html',
  styleUrl: './team-details.css',
})
export class TeamDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly voleyService = inject(VoleyService);

  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();
  readonly team = signal<Team | null>(null);
  readonly enrollments = signal<TeamEnrollmentDetails[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Error de carga de equipo');
      return;
    }

    this.loading.set(true);
    forkJoin({
      team: this.voleyService.getTeam(id),
      enrollments: this.voleyService.getEnrollmentsByTeam(id),
      tournaments: this.voleyService.getTournaments(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ team, enrollments, tournaments }) => {
          const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
          this.team.set(team);
          this.enrollments.set(
            enrollments.map((enrollment) => ({
              enrollment,
              tournament: tournamentsById.get(enrollment.tournamentId),
            })),
          );
        },
        error: () => this.errorMessage.set('Error de carga de equipo'),
      });
  }

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.i18n.setLanguage(target.value);
    }
  }

  formatEnrollmentDate(value: Date | string): string {
    return this.i18n.date(String(value));
  }
}
