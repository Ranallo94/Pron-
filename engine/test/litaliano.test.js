import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificaGirone } from '../ranking.js';
import { calcolaPunteggioTotale } from '../punteggi.js';
import { vincitoriGiornata, turniVinti, classificaPartecipanti } from '../classifica.js';
import { scegliVincitoreSpeciale, riepilogoCartellini } from '../speciali.js';
import { litalianoSerieA } from '../descrittori/litaliano-serie-a.js';

const P = { vittoria: 3, pareggio: 1, sconfitta: 0 };
const m = (casa, trasferta, vc, vt) => ({ casa, trasferta, valoreCasa: vc, valoreTrasferta: vt });
const sequenziali = ['punti', 'h2h.punti', 'h2h.differenzaReti', 'differenzaReti', 'golFatti', 'sorteggio'];

// ── scontri diretti IN POSIZIONE ────────────────────────
test('ranking Serie A: a pari punti decide lo scontro diretto, anche se la differenza reti generale dice il contrario', () => {
  const partite = [
    m('A', 'B', 1, 0), m('A', 'C', 0, 1), m('A', 'D', 1, 0),     // A: 6 pt, DR +1
    m('B', 'C', 4, 0), m('B', 'D', 4, 0),                          // B: 6 pt, DR +7 (ma ha perso con A)
    m('C', 'D', 0, 0),
  ];
  const squadre = ['A', 'B', 'C', 'D'];
  const nuova = classificaGirone({ partiteGirone: partite, squadre, criteriRanking: sequenziali, puntiPartita: P });
  assert.deepEqual(nuova.ordine, ['A', 'B', 'C', 'D']);          // A davanti: ha battuto B

  // con il vecchio criterio (punti → DR generale → GF → scontri diretti) sarebbe B davanti
  const vecchia = classificaGirone({
    partiteGirone: partite, squadre, puntiPartita: P,
    criteriRanking: ['punti', 'differenzaReti', 'golFatti', 'scontriDiretti'],
  });
  assert.deepEqual(vecchia.ordine, ['B', 'A', 'C', 'D']);
});

test('ranking Serie A: scontri diretti pari a punti → decide la differenza reti negli scontri diretti, non quella generale', () => {
  const partite = [
    m('A', 'B', 1, 0), m('B', 'A', 3, 1),      // scontri diretti: 3 pt a testa; DR negli scontri diretti: A -1, B +1
    m('A', 'C', 9, 0),                          // A ha la migliore differenza reti GENERALE (+8 contro +2)
    m('B', 'C', 1, 0),
  ];
  const r = classificaGirone({ partiteGirone: partite, squadre: ['A', 'B', 'C'], criteriRanking: sequenziali, puntiPartita: P });
  assert.equal(r.stats.A.punti, r.stats.B.punti);                   // 6 pt a testa
  assert.ok(r.stats.A.differenzaReti > r.stats.B.differenzaReti);   // la generale favorirebbe A…
  assert.deepEqual(r.ordine, ['B', 'A', 'C']);                      // …ma gli scontri diretti (DR) premiano B
});

test('ranking Serie A: scontri diretti completamente pari → si passa alla differenza reti generale', () => {
  const partite = [
    m('A', 'B', 1, 1), m('B', 'A', 0, 0),       // due pareggi: pt 2-2, DR 0-0 negli scontri diretti
    m('A', 'C', 3, 0),                          // DR generale: A +3
    m('B', 'C', 1, 0),                          //             B +1
  ];
  const r = classificaGirone({ partiteGirone: partite, squadre: ['A', 'B', 'C'], criteriRanking: sequenziali, puntiPartita: P });
  assert.equal(r.stats.A.punti, 5);
  assert.equal(r.stats.B.punti, 5);
  assert.deepEqual(r.ordine, ['A', 'B', 'C']);
});

test('ranking Serie A: parità che resta dopo tutti i criteri è evidenziata, non inventata; ordine manuale la risolve', () => {
  const partite = [m('X', 'Y', 1, 1), m('Y', 'X', 1, 1)];            // X e Y identiche su tutto
  const r = classificaGirone({ partiteGirone: partite, squadre: ['X', 'Y', 'Z'], criteriRanking: sequenziali, puntiPartita: P });
  assert.deepEqual(r.gruppiParitari, [['X', 'Y']]);
  const manuale = classificaGirone({
    partiteGirone: partite, squadre: ['X', 'Y', 'Z'], criteriRanking: sequenziali, puntiPartita: P, ordineManuale: ['Y', 'X'],
  });
  assert.deepEqual(manuale.ordine.slice(0, 2), ['Y', 'X']);
  // un ordine manuale che non copre il gruppo decade
  const decade = classificaGirone({
    partiteGirone: partite, squadre: ['X', 'Y', 'Z'], criteriRanking: sequenziali, puntiPartita: P, ordineManuale: ['Y'],
  });
  assert.deepEqual(decade.ordine.slice(0, 2), ['X', 'Y']);
});

// ── massimo teorico del regolamento: 1233 ───────────────
function generaEdizione(seme) {
  // 20 squadre, 5 giornate da 10 partite (metodo del cerchio), risultati pseudo-casuali ripetibili
  const squadre = Array.from({ length: 20 }, (_, i) => `t${String(i + 1).padStart(2, '0')}`);
  let s = seme;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const partite = {};
  let k = 0;
  let ruota = squadre.slice(1);
  for (let g = 0; g < 5; g++) {
    const giro = [squadre[0], ...ruota];
    for (let i = 0; i < 10; i++) {
      k++;
      partite[`g${g + 6}-${i + 1}`] = { casa: giro[i], trasferta: giro[19 - i], valoreCasa: Math.floor(rnd() * 4), valoreTrasferta: Math.floor(rnd() * 3) };
    }
    ruota = [ruota[ruota.length - 1], ...ruota.slice(0, -1)];
  }
  return { squadre, partite };
}

test('massimo teorico del regolamento: 800 partite + 373 classifica + 60 speciali = 1233', () => {
  const { squadre, partite } = generaEdizione(42);
  assert.equal(Object.keys(partite).length, 50);

  const elenco = Object.values(partite);
  const ordine = classificaGirone({
    partiteGirone: elenco, squadre, criteriRanking: litalianoSerieA.gironi.criteriRanking, puntiPartita: litalianoSerieA.gironi.puntiPartita,
  }).ordine;

  const gironi = Object.fromEntries(Object.entries(partite).map(([id, p]) => [id, { valoreCasa: p.valoreCasa, valoreTrasferta: p.valoreTrasferta }]));
  const speciali = { cannoniere: 'x', assistman: 'y', cattiva: 'z' };
  const r = calcolaPunteggioTotale({
    pronostico: { gironi, ordinamenti: { classificaFinale: ordine }, bonus: speciali },
    risultato: { gironi, ordinamenti: { classificaFinale: ordine }, bonus: speciali },
    descrittoreTorneo: litalianoSerieA,
  });

  assert.equal(r.breakdown.gironi.totale, 800);                     // 50 partite × 16
  assert.equal(r.breakdown.classificaFinale.dettaglio.fascia, 173); // 3×15 + 7×8 + 7×6 + 3×10
  assert.equal(r.breakdown.classificaFinale.dettaglio.esattaFascia, 200);
  assert.equal(r.breakdown.bonus.totale, 60);
  assert.equal(r.totale, 1233);
});

test('fasce, posizioni e speciali entrano solo dopo la convalida: senza reale valgono 0', () => {
  const { squadre, partite } = generaEdizione(7);
  const gironi = Object.fromEntries(Object.entries(partite).map(([id, p]) => [id, { valoreCasa: p.valoreCasa, valoreTrasferta: p.valoreTrasferta }]));
  const r = calcolaPunteggioTotale({
    pronostico: { gironi, ordinamenti: { classificaFinale: squadre }, bonus: { cannoniere: 'x' } },
    risultato: { gironi },                                         // nessuna convalida finale
    descrittoreTorneo: litalianoSerieA,
  });
  assert.equal(r.totale, 800);
});

// ── vincitore di giornata, turni vinti, classifica generale ──
test('vincitore di giornata: punti → più esatti → più segni; parità residua = tutti vincitori', () => {
  const righe = [
    { id: 'a', punti: 100, esatti: 3, segni: 7 },
    { id: 'b', punti: 100, esatti: 4, segni: 5 },
    { id: 'c', punti: 90, esatti: 9, segni: 9 },
  ];
  assert.deepEqual(vincitoriGiornata(righe, ['punti', 'esatti', 'segni']), ['b']);
  const pari = [{ id: 'a', punti: 80, esatti: 2, segni: 6 }, { id: 'b', punti: 80, esatti: 2, segni: 6 }];
  assert.deepEqual(vincitoriGiornata(pari, ['punti', 'esatti', 'segni']).sort(), ['a', 'b']);
  assert.deepEqual(vincitoriGiornata([], ['punti']), []);
});

test('turni vinti: contano solo le giornate definitive', () => {
  const g1 = { definitiva: true, righe: [{ id: 'a', punti: 50 }, { id: 'b', punti: 40 }] };
  const g2 = { definitiva: true, righe: [{ id: 'a', punti: 30 }, { id: 'b', punti: 60 }] };
  const g3 = { definitiva: false, righe: [{ id: 'b', punti: 99 }] };     // ancora LIVE: non assegna nulla
  const t = turniVinti([g1, g2, g3], ['punti']);
  assert.equal(t.get('a'), 1);
  assert.equal(t.get('b'), 1);
});

test('classifica generale: punti → turni vinti → esatti → posizioni esatte → fasce → segni', () => {
  const righe = [
    { id: 'a', nome: 'A', totale: 300, spareggio: [1, 5, 2, 3, 20] },
    { id: 'b', nome: 'B', totale: 300, spareggio: [2, 3, 0, 0, 10] },   // più turni vinti: davanti
    { id: 'c', nome: 'C', totale: 300, spareggio: [2, 3, 0, 0, 10] },   // pari con b: pari merito
    { id: 'd', nome: 'D', totale: 320, spareggio: [0, 0, 0, 0, 0] },
  ];
  const c = classificaPartecipanti(righe);
  assert.deepEqual(c.map(r => [r.id, r.posizione]), [['d', 1], ['b', 2], ['c', 2], ['a', 4]]);
});

// ── speciali ────────────────────────────────────────────
test('speciali: cannoniere gol → meno minuti → più assist', () => {
  const crit = litalianoSerieA.speciali.cannoniere;
  const a = [{ id: 'p1', gol: 5, minuti: 700, assist: 1 }, { id: 'p2', gol: 5, minuti: 650, assist: 0 }, { id: 'p3', gol: 4, minuti: 100, assist: 9 }];
  assert.deepEqual(scegliVincitoreSpeciale(a, crit), { vincitori: ['p2'], parita: false, datiMancanti: false });
  const b = [{ id: 'p1', gol: 5, minuti: 650, assist: 2 }, { id: 'p2', gol: 5, minuti: 650, assist: 1 }];
  assert.deepEqual(scegliVincitoreSpeciale(b, crit).vincitori, ['p1']);
});

test('speciali: parità residua o dato mancante non producono un vincitore inventato', () => {
  const crit = litalianoSerieA.speciali.cannoniere;
  const pari = [{ id: 'p1', gol: 5, minuti: 650, assist: 2 }, { id: 'p2', gol: 5, minuti: 650, assist: 2 }];
  const r1 = scegliVincitoreSpeciale(pari, crit);
  assert.equal(r1.parita, true);
  assert.deepEqual(r1.vincitori.sort(), ['p1', 'p2']);

  const manca = [{ id: 'p1', gol: 5, minuti: null, assist: 2 }, { id: 'p2', gol: 5, minuti: 650, assist: 1 }];
  const r2 = scegliVincitoreSpeciale(manca, crit);
  assert.equal(r2.datiMancanti, true);
  assert.equal(r2.parita, true);

  assert.deepEqual(scegliVincitoreSpeciale([], crit), { vincitori: [], parita: false, datiMancanti: false });
});

test('squadra più cattiva: giallo 1, rosso diretto 1, doppia ammonizione = un giallo + un rosso = 2', () => {
  assert.deepEqual(riepilogoCartellini({ gialli: 3, rossiDiretti: 1, doppieAmmonizioni: 1 }), { gialli: 4, rossi: 2, cartellini: 6 });
  const crit = litalianoSerieA.speciali.cattiva;
  const squadre = [
    { id: 'A', ...riepilogoCartellini({ gialli: 10, rossiDiretti: 0 }), falli: 100 },        // 10 cartellini, 0 rossi
    { id: 'B', ...riepilogoCartellini({ gialli: 7, rossiDiretti: 1, doppieAmmonizioni: 1 }), falli: 90 },  // 8 gialli + 2 rossi = 10
  ];
  assert.deepEqual(scegliVincitoreSpeciale(squadre, crit).vincitori, ['B']);                  // pari cartellini → più rossi
});

test('descrittore: l\'ordine dei criteri di classifica è quello del regolamento', () => {
  assert.deepEqual(litalianoSerieA.gironi.criteriRanking, sequenziali);
});
