/**
 * engine/index.js — punto d'ingresso unico del motore.
 *
 *   import { calcolaPunteggioTotale, classificaGirone, formulito } from '@prono/engine';
 *
 * Le funzioni sono pure: nessuna dipendenza da Firebase né dal browser, quindi lo
 * stesso codice gira nell'app, nelle funzioni server e nei test.
 */
export * from './ranking.js';
export * from './punteggi.js';
export * from './ordinamenti.js';
export * from './bonus.js';
export * from './bracket.js';
export * from './ko.js';
export * from './classifica.js';
export * from './partite.js';
export * from './speciali.js';

export { formulito, formulitoSprint } from './descrittori/formulito.js';
export { championsito } from './descrittori/championsito.js';
export { litalianoSerieA } from './descrittori/litaliano-serie-a.js';
export { wimbledino, medusino } from './descrittori/tennis.js';
