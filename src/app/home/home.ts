import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../shared/i18n/i18n.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly i18n = inject(I18nService);
  readonly currentYear = new Date().getFullYear();

  onLanguageChange(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLSelectElement) {
      this.i18n.setLanguage(target.value);
    }
  }
}