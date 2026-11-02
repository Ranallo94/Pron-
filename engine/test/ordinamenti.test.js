import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaPunteggioOrdinamento } from '../ordinamenti.js';
import { calcolaPunteggioBonus } from '../bonus.js';
import { classificaPartecipanti } from '../classifica.js';
import { risultatoPrevisto } from '../partite.js';
import { classificaGirone } from '../ranking.js';

// ── ordinamenti ─────────────────────────────────────────
test('ordinamento: esatta con array per posizione + resto, vicino a scarto 1', () => {
  const regole = { esatta: [10], esattaResto: 3, vicino: 1 };      // stile qualifiche F1
  const reale = ['A', 'B', 'C', 'D'];
  // A esatta in pole (10), B↔C scambiate (due vicini: 1+1), D esatta (3)
  const r = calcolaPunteggioOrdinamento(['A', 'C', 'B', 'D'], reale, regole);
  assert.equal(r.dettaglio.esatta, 13);
  assert.equal(r.dettaglio.vicino, 2);
  assert.equal(r.totale, 15);
  assert.equal(r.contatori.esatte, 2);
  assert.equal(r.vincitoreOk, true);
});

test('ordinamento: tabella per posizione e bonusPrimi cumulabili (stile gara F1)', () => {
  const regole = { esatta: [25, 18, 15], esattaResto: 0, bonusPrimi: [{ primi: 3, punti: 3 }, { primi: 5, punti: 1 }] };
  const reale = ['A', 'B', 'C', 'D', 'E'];
  const r = calcolaPunteggioOrdinamento(['B', 'A', 'C', 'E', 'D'], reale, regole);
  // C esatta (15); podio: B,A,C tutti nei primi 3 reali → 3 pilota × 3 = 9; primi 5: tutti e 5 → 5 × 1
  assert.equal(r.dettaglio.esatta, 15);
  assert.equal(r.dettaglio.bonusPrimi[0], 9);
  assert.equal(r.dettaglio.bonusPrimi[1], 5);
  assert.equal(r.totale, 29);
  assert.equal(r.vincitoreOk, false);
});

test('ordinamento: elementi assenti dal reale o non compilati non contano', () => {
  const r = calcolaPunteggioOrdinamento(['X', null, 'A'], ['A', 'B', 'C'], { esatta: 5 });
  assert.equal(r.totale, 0);          // X non è nel reale; null saltato; A è in pos 2 vs reale 0
  const r2 = calcolaPunteggioOrdinamento(['A', 'B', 'C'], ['A', 'B', 'C'], { esatta: 5 });
  assert.equal(r2.totale, 15);
});

test('ordinamento: fasce — la posizione esatta vale solo dentro la fascia giusta (nidificato)', () => {
  const fasce = [
    { id: 'alta', da: 0, a: 2, fascia: 15, esatta: 40 },
    { id: 'bassa', da: 2, a: 4, fascia: 8, esatta: 12 },
  ];
  const reale = ['A', 'B', 'C', 'D'];
  // A esatta (15+40), B in zona alta ma pos sbagliata?  B pronosticata 3ª → zona bassa ≠ alta → niente
  // C pronosticata 2ª → zona alta ≠ bassa → niente; D esatta nella bassa (8+12)
  const r = calcolaPunteggioOrdinamento(['A', 'C', 'B', 'D'], reale, { fasce });
  assert.equal(r.dettaglio.fascia, 15 + 8);
  assert.equal(r.dettaglio.esattaFascia, 40 + 12);
  assert.equal(r.contatori.fasceOk, 2);
  assert.equal(r.contatori.esatteInFascia, 2);
});

// ── bonus ───────────────────────────────────────────────
test('bonus: identico, numero e voci non compilate', () => {
  const def = [
    { id: 'giro', tipo: 'identico', punti: 5 },
    { id: 'sc', tipo: 'numero', punti: 5 },
    { id: 'altro', tipo: 'identico', punti: 7 },
  ];
  const r = calcolaPunteggioBonus({ giro: 'p03', sc: '2', altro: 'x' }, { giro: 'p03', sc: 2 }, def);
  assert.equal(r.totale, 10);                 // 'giro' ok, 'sc' ok ("2" == 2), 'altro' non compilato nel reale
  assert.equal(r.indovinati, 2);
  assert.equal(r.dettaglio.altro, undefined);
});

test('bonus: 0 è un valore valido (zero safety car), stringa vuota no', () => {
  const def = [{ id: 'sc', tipo: 'numero', punti: 5 }];
  assert.equal(calcolaPunteggioBonus({ sc: 0 }, { sc: 0 }, def).totale, 5);
  assert.equal(calcolaPunteggioBonus({ sc: '' }, { sc: 0 }, def).totale, 0);
});

// ── classifica partecipanti ─────────────────────────────
test('classifica partecipanti: totale, poi spareggio; pari merito condividono la posizione', () => {
  const righe = [
    { id: 'a', nome: 'Anna', totale: 100, spareggio: [1, 0] },
    { id: 'b', nome: 'Bruno', totale: 100, spareggio: [2, 0] },
    { id: 'c', nome: 'Carla', totale: 100, spareggio: [2, 0] },
    { id: 'd', nome: 'Dino', totale: 90, spareggio: [9, 9] },
  ];
  const c = classificaPartecipanti(righe);
  assert.deepEqual(c.map(r => [r.id, r.posizione]), [['b', 1], ['c', 1], ['a', 3], ['d', 4]]);
});

test('classifica partecipanti: lista vuota', () => {
  assert.deepEqual(classificaPartecipanti([]), []);
});

// ── risultato previsto da segno ─────────────────────────
test('risultatoPrevisto: esatto se presente, altrimenti convenzione dal segno, altrimenti null', () => {
  assert.deepEqual(risultatoPrevisto({ valoreCasa: 2, valoreTrasferta: 2 }, '1'), { valoreCasa: 2, valoreTrasferta: 2 });
  assert.deepEqual(risultatoPrevisto(null, '1'), { valoreCasa: 1, valoreTrasferta: 0 });
  assert.deepEqual(risultatoPrevisto(null, 'X'), { valoreCasa: 1, valoreTrasferta: 1 });
  assert.deepEqual(risultatoPrevisto(null, '2'), { valoreCasa: 0, valoreTrasferta: 1 });
  assert.equal(risultatoPrevisto(null, null), null);
});

// ── ranking: criterio 'nome' ────────────────────────────
test('ranking: criterio "nome" come fallback alfabetico deterministico (nessuna parità residua)', () => {
  const r = classificaGirone({
    partiteGirone: [],                          // nessuna partita: tutti pari a 0
    squadre: ['z', 'a', 'm'],
    criteriRanking: ['punti', 'nome'],
    puntiPartita: { vittoria: 3, pareggio: 1, sconfitta: 0 },
    nomi: { z: 'Zeta', a: 'Alfa', m: 'Mu' },
  });
  assert.deepEqual(r.ordine, ['a', 'm', 'z']);
  assert.deepEqual(r.gruppiParitari, []);
});
