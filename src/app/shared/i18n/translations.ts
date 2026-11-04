export const en = {
  'Inicio | Ace Tournaments': 'Home | Ace Tournaments',
  Inicio: 'Home',
  'Menú principal': 'Main menu',
  Idioma: 'Language',
  'Seleccionar idioma': 'Select language',
  'Ace Tournaments, inicio': 'Ace Tournaments, home',

  'Creador de torneos de voley': 'Volleyball Tournament Creator',
  'Organizá tu torneo, generá el fixture, cargá los resultados y consultá las posiciones.':
    'Organize your tournament, generate the schedule, enter results and check the standings.',
  'Comienza tu torneo': 'Start your tournament',
  'Ver torneos': 'View tournaments',

  Producto: 'Product',
  'Crear torneo': 'Create tournament',
  'Buscar torneo': 'Find a tournament',
  Contacto: 'Contact',
  'Todos los derechos reservados': 'All rights reserved',
} as const;

export type TranslationKey = keyof typeof en;
export type Language = 'es' | 'en';