import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  turniKO, idMatch, chiavePool, alimentatori, giocatoriMatch, propagaBracketKO, calcolaPunteggioBracketTurni,
} from '../ko.js';
import { calcolaPunteggioTotale } from '../punteggi.js';
import { wimbledino, medusino } from '../descrittori/tennis.js';

test('turniKO: struttura per dimensione, con i nomi dei satelliti tennis', () => {
  assert.deepEqual(turniKO(128).map(t => t.id), ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F']);
  assert.deepEqual(turniKO(128).map(t => t.matches), [64, 32, 16, 8, 4, 2, 1]);
  assert.deepEqual(turniKO(8).map(t => t.id), ['QF', 'SF', 'F']);
  assert.deepEqual(turniKO(2), [{ id: 'F', matches: 1 }]);
  assert.throws(() => turniKO(100), /non valida/);
  assert.throws(() => turniKO(1), /non valida/);
});

test('idMatch e alimentatori: albero binario standard', () => {
  const t = turniKO(8);
  assert.equal(idMatch('QF', 0), 'QF_01');
  assert.equal(idMatch('F', 0), 'F_01');
  assert.equal(alimentatori(t, 'QF', 0), null);
  assert.deepEqual(alimentatori(t, 'SF', 1), { turnoPrecedente: 'QF', a: 'QF_03', b: 'QF_04' });
  assert.deepEqual(alimentatori(t, 'F', 0), { turnoPrecedente: 'SF', a: 'SF_01', b: 'SF_02' });
});

const sorteggio8 = [
  { a: 'p1', b: 'p2' }, { a: 'p3', b: 'p4' }, { a: 'p5', b: 'p6' }, { a: 'p7', b: 'p8' },
];
const esito = (v, d) => ({ vincitore: v, dettaglio: d });

test('propagaBracketKO: costruisce i turni dagli esiti reali, derivando gli accoppiamenti', () => {
  const pool = {
    [chiavePool('p1', 'p2')]: esito('p1', '3-0'),
    [chiavePool('p3', 'p4')]: esito('p4', '3-1'),
    [chiavePool('p5', 'p6')]: esito('p5', '3-2'),
    [chiavePool('p7', 'p8')]: esito('p8', '3-0'),
    [chiavePool('p1', 'p4')]: esito('p4', '3-1'),     // semifinale 1
    [chiavePool('p5', 'p8')]: esito('p5', '3-0'),     // semifinale 2
    [chiavePool('p4', 'p5')]: esito('p4', '3-2'),     // finale
  };
  const b = propagaBracketKO({ dimensione: 8, primoTurno: sorteggio8, pool });
  assert.equal(b.QF.QF_02.vincitore, 'p4');
  assert.equal(b.SF.SF_01.vincitore, 'p4');
  assert.equal(b.SF.SF_02.vincitore, 'p5');
  assert.equal(b.F.F_01.vincitore, 'p4');
  assert.equal(b.F.F_01.dettaglio, '3-2');
});

test('propagaBracketKO: un esito mancante ferma la propagazione sotto quel match', () => {
  const pool = { [chiavePool('p1', 'p2')]: esito('p1', '3-0') };
  const b = propagaBracketKO({ dimensione: 8, primoTurno: sorteggio8, pool });
  assert.equal(Object.keys(b.QF).length, 1);
  assert.equal(b.SF, undefined);
});

test('propagaBracketKO: override manuale mai sovrascritto, e usato per derivare i turni dopo', () => {
  const pool = {
    [chiavePool('p1', 'p2')]: esito('p1', '3-0'),
    [chiavePool('p3', 'p4')]: esito('p3', '3-0'),    // l'API dice p3…
    [chiavePool('p1', 'p4')]: esito('p4', '3-1'),    // …ma con p4 al turno dopo
  };
  const seed = { QF: { QF_02: { vincitore: 'p4', dettaglio: '3-1', manuale: true } } };   // l'admin ha corretto: p4
  const b = propagaBracketKO({ dimensione: 8, primoTurno: sorteggio8, pool, seed });
  assert.equal(b.QF.QF_02.vincitore, 'p4');              // override protetto
  assert.equal(b.QF.QF_02.manuale, true);
  assert.equal(b.SF.SF_01.vincitore, 'p4');              // semifinale derivata dall'override
});

test('giocatoriMatch: primo turno dal sorteggio, poi dai vincitori', () => {
  const t = turniKO(8);
  assert.deepEqual(giocatoriMatch(t, sorteggio8, {}, 'QF', 1), { a: 'p3', b: 'p4' });
  const doc = { QF: { QF_01: { vincitore: 'p1' }, QF_02: { vincitore: 'p4' } } };
  assert.deepEqual(giocatoriMatch(t, sorteggio8, doc, 'SF', 0), { a: 'p1', b: 'p4' });
  assert.deepEqual(giocatoriMatch(t, sorteggio8, {}, 'SF', 0), { a: null, b: null });
});

// ── punteggio ───────────────────────────────────────────
const reale8 = {
  QF: { QF_01: esito('p1', '3-0'), QF_02: esito('p4', '3-1'), QF_03: esito('p5', '3-2'), QF_04: esito('p8', '3-0') },
  SF: { SF_01: esito('p4', '3-1'), SF_02: esito('p5', '3-0') },
  F: { F_01: esito('p4', '3-2') },
};
const tab = { esiti: [1, 2, 5], dettaglio: [1, 1, 3] };    // array nell'ordine dei turni (QF, SF, F)

test('punteggio bracket: esiti per turno + dettaglio annidato (solo col vincitore giusto)', () => {
  const pron = {
    QF: { QF_01: esito('p1', '3-0'), QF_02: esito('p3', '3-1'), QF_03: esito('p5', '3-0'), QF_04: esito('p8', '3-0') },
    SF: { SF_01: esito('p1', '3-1'), SF_02: esito('p5', '3-0') },
    F: { F_01: esito('p5', '3-2') },
  };
  const r = calcolaPunteggioBracketTurni(pron, reale8, tab, { dimensione: 8 });
  // QF: p1, p5, p8 giusti = 3 esiti × 1; dettaglio esatto: p1 (3-0) e p8 (3-0) → 2 × 1 (p5 3-0≠3-2, p3 sbagliato)
  assert.equal(r.perTurno.QF.esiti, 3);
  assert.equal(r.perTurno.QF.dettaglio, 2);
  // SF: p5 vince la SF2 reale ma p1 no (non ha vinto SF) → 1 giusto × 2; dettaglio p5 3-0 ok → 1
  assert.equal(r.perTurno.SF.esiti, 2);
  assert.equal(r.perTurno.SF.dettaglio, 1);
  // F: p5 non ha vinto la finale → 0
  assert.equal(r.perTurno.F.esiti, 0);
  assert.equal(r.totale, 3 + 2 + 2 + 1);
  assert.deepEqual(r.indovinatiPerTurno, [0, 1, 3]);   // dalla finale a ritroso
});

test('punteggio bracket: forgiving — conta chi avanza, non l\'avversario previsto', () => {
  // pronostico con avversari "sbagliati" ma gli stessi vincitori del reale al turno dei quarti
  const pron = { QF: { QF_01: esito('p1', null), QF_02: esito('p4', null), QF_03: esito('p5', null), QF_04: esito('p8', null) } };
  const r = calcolaPunteggioBracketTurni(pron, reale8, tab, { dimensione: 8 });
  assert.equal(r.perTurno.QF.esiti, 4);
  assert.equal(r.perTurno.QF.dettaglio, 0);             // dettaglio non indicato → nessun bonus
});

test('punteggio bracket: giocatori annullati (ritirati e rimpiazzati) non danno punti', () => {
  const pron = { QF: { QF_01: esito('p1', '3-0'), QF_02: esito('p4', '3-1') } };
  const r = calcolaPunteggioBracketTurni(pron, reale8, tab, { dimensione: 8, annullati: ['p4'] });
  assert.equal(r.perTurno.QF.esiti, 1);                 // solo p1
});

test('punteggio bracket: tabella come oggetto per turno equivale all\'array', () => {
  const pron = { SF: { SF_02: esito('p5', '3-0') } };
  const a = calcolaPunteggioBracketTurni(pron, reale8, tab, { dimensione: 8 });
  const o = calcolaPunteggioBracketTurni(pron, reale8, { esiti: { QF: 1, SF: 2, F: 5 }, dettaglio: { QF: 1, SF: 1, F: 3 } }, { dimensione: 8 });
  assert.equal(a.totale, o.totale);
});

// ── tabelloni tennis a 128: massimo teorico ─────────────
function bracketPerfetto128() {
  // 128 giocatori g001…g128; vince sempre il primo di ogni coppia, set "3-0" ovunque
  const turni = turniKO(128);
  const doc = {};
  let correnti = Array.from({ length: 128 }, (_, i) => `g${String(i + 1).padStart(3, '0')}`);
  for (const t of turni) {
    const vincitori = [];
    for (let i = 0; i < t.matches; i++) {
      const v = correnti[i * 2];
      (doc[t.id] ||= {})[idMatch(t.id, i)] = { vincitore: v, dettaglio: '3-0' };
      vincitori.push(v);
    }
    correnti = vincitori;
  }
  return doc;
}

test('tennis 128: pronostico perfetto = massimo teorico (Wimbledino 1139, Medusino 8+… verificato a mano)', () => {
  const doc = bracketPerfetto128();
  const bonusPerfetto = { aces: 'g001', breaks: 'g001', tiebreaks: 'g001' };
  const w = calcolaPunteggioTotale({
    pronostico: { bracketDoc: doc, bonus: bonusPerfetto },
    risultato: { bracketDoc: doc, bonus: bonusPerfetto },
    descrittoreTorneo: wimbledino,
  });
  // esiti 754 + set 310 + bonus statistici 75 (CLAUDE.md / MEMORY_EXPORT di Wimbledino: max teorico 1139)
  assert.equal(w.totale, 1139);
  assert.equal(w.breakdown.bracketDoc.esiti, 754);
  assert.equal(w.breakdown.bracketDoc.dettaglio, 310);

  const m = calcolaPunteggioTotale({
    pronostico: { bracketDoc: doc, bonus: bonusPerfetto },
    risultato: { bracketDoc: doc, bonus: bonusPerfetto },
    descrittoreTorneo: medusino,
  });
  // 64·1+32·2+16·5+8·12+4·28+2·55+1·100 = 64+64+80+96+112+110+100 = 626
  // 64·1+32·1+16·2+8·4+4·9+2·14+1·20 = 64+32+32+32+36+28+20 = 244 ; bonus 3·15 = 45
  assert.equal(m.breakdown.bracketDoc.esiti, 626);
  assert.equal(m.breakdown.bracketDoc.dettaglio, 244);
  assert.equal(m.totale, 626 + 244 + 45);
});

test('descrittore + spareggio: ordine campione, finalisti, semifinalisti, quarti, set esatti, bonus', () => {
  const doc = bracketPerfetto128();
  const r = calcolaPunteggioTotale({
    pronostico: { bracketDoc: doc, bonus: { aces: 'g001' } },
    risultato: { bracketDoc: doc, bonus: { aces: 'g001', breaks: 'g002' } },
    descrittoreTorneo: medusino,
  });
  // campione 1, finalisti 2, semifinalisti 4, quarti 8, set esatti 127, bonus indovinati 1
  assert.deepEqual(r.spareggio, [1, 2, 4, 8, 127, 1]);
});
