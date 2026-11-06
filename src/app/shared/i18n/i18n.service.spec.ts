import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('cambia el idioma y actualiza la preferencia y los metadatos', () => {
    const service = TestBed.inject(I18nService);

    expect(service.t('Crear tu torneo')).toBe('Crear tu torneo');

    service.setLanguage('en');

    expect(service.t('Crear tu torneo')).toBe('Create your tournament');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Home | Ace Tournaments');
    expect(localStorage.getItem('ace-tournaments.language')).toBe('en');

    service.setLanguage('idioma-invalido');
    expect(service.language()).toBe('en');
  });

  it('recupera el idioma guardado y formatea números', () => {
    localStorage.setItem('ace-tournaments.language', 'en');

    const service = TestBed.inject(I18nService);

    expect(service.language()).toBe('en');
    expect(service.number(12345)).toBe(new Intl.NumberFormat('en').format(12345));
  });
});