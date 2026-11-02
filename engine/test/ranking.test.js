import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificaGirone } from '../ranking.js';
import {
  partiteGironeA, squadreGironeA,
  partiteGironeB, squadreGironeB,
  puntiPartita, criteriRanking,
} from './fixtures/mini-torneo.js';

test('girone A: nessuna parità, ordina per punti/differenza reti', () => {
  const { ordine, stats, gruppiParitari } = classificaGirone({
    partiteGirone: partiteGironeA,
    squadre: squadreGironeA,
    criteriRanking,
    puntiPartita,
  });

  // ITA: 3 vittorie -> 9pt; BRA: 1V 1N 1P -> 4pt; GER: 2N 1P -> 2pt; JPN: 1N 2P -> 1pt
  assert.deepEqual(ordine, ['ITA', 'BRA', 'GER', 'JPN']);
  assert.equal(stats.ITA.punti, 9);
  assert.equal(gruppiParitari.length, 0, 'nessuna parità attesa in questo girone');
});

test('girone B: parità di punti fra due squadre, risolta dalla differenza reti (no scontri diretti necessari)', () => {
  const { ordine, gruppiParitari } = classificaGirone({
    partiteGirone: partiteGironeB,
    squadre: squadreGironeB,
    criteriRanking,
    puntiPartita,
  });

  assert.deepEqual(ordine, ['FRA', 'SEN', 'MAR', 'KOR']);
  assert.equal(gruppiParitari.length, 0, 'FRA e SEN hanno 7pt ciascuna ma differenza reti diversa: nessuna parità reale');
});

test('tripla parità ciclica (P batte R, R batte Q, Q batte P): scontri diretti non risolvono, serve ordine manuale', () => {
  const criteriSemplici = ['punti', 'scontriDiretti', 'ordineManuale'];
  const partite = [
    { casa: 'P', trasferta: 'R', valoreCasa: 2, valoreTrasferta: 0 },
    { casa: 'R', trasferta: 'Q', valoreCasa: 1, valoreTrasferta: 0 },
    { casa: 'Q', trasferta: 'P', valoreCasa: 1, valoreTrasferta: 0 },
  ];

  const senzaManuale = classificaGirone({
    partiteGirone: partite,
    squadre: ['P', 'Q', 'R'],
    criteriRanking: criteriSemplici,
    puntiPartita,
  });

  assert.equal(senzaManuale.stats.P.punti, 3);
  assert.equal(senzaManuale.stats.Q.punti, 3);
  assert.equal(senzaManuale.stats.R.punti, 3);
  assert.equal(senzaManuale.gruppiParitari.length, 1, 'le tre squadre restano in un unico gruppo paritario');
  assert.deepEqual(new Set(senzaManuale.gruppiParitari[0]), new Set(['P', 'Q', 'R']));

  const conManuale = classificaGirone({
    partiteGirone: partite,
    squadre: ['P', 'Q', 'R'],
    criteriRanking: criteriSemplici,
    puntiPartita,
    ordineManuale: ['R', 'P', 'Q'],
  });
  assert.deepEqual(conManuale.ordine, ['R', 'P', 'Q'], 'l\'ordine manuale, se copre tutto il gruppo pari, decide');

  const conManualeParziale = classificaGirone({
    partiteGirone: partite,
    squadre: ['P', 'Q', 'R'],
    criteriRanking: criteriSemplici,
    puntiPartita,
    ordineManuale: ['R', 'P'], // non copre Q: deve decadere, non applicarsi
  });
  assert.deepEqual(
    conManualeParziale.ordine,
    senzaManuale.ordine,
    'un ordine manuale che non copre tutto il gruppo pari viene ignorato (regola di decadenza)'
  );
});
