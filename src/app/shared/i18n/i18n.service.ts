import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { en, Language, TranslationKey } from './translations';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly currentLanguage = signal<Language>('es');
  readonly language = this.currentLanguage.asReadonly();

  constructor() {
    let language: Language = 'es';

    try {
      if (
        this.document.defaultView?.localStorage.getItem('ace-tournaments.language') === 'en'
      ) {
        language = 'en';
      }
    } catch {
      // El cambio de idioma sigue funcionando aunque el navegador bloquee el almacenamiento.
    }

    this.setLanguage(language);
  }

  setLanguage(language: string): void {
    if (language !== 'es' && language !== 'en') {
      return;
    }

    this.currentLanguage.set(language);
    this.document.documentElement.lang = language;
    this.document.title = this.t('Inicio | Ace Tournaments');

    try {
      this.document.defaultView?.localStorage.setItem('ace-tournaments.language', language);
    } catch {
      // El idioma sigue cambiando aunque no pueda guardarse la preferencia.
    }
  }

  t(key: TranslationKey, params: Record<string, string | number> = {}): string {
    const message = this.language() === 'en' ? en[key] : key;

    return message.replace(/\{(\w+)\}/g, (match, name: string) =>
      String(params[name] ?? match),
    );
  }

  number(value: number): string {
    return new Intl.NumberFormat(this.language()).format(value);
  }

  date(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(this.language(), {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}