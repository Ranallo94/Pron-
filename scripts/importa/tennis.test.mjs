import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trasformaTennis, SITI } from './tennis.mjs';

const db = {
  evento: 'Torneo di prova', tabellone: 'Singolare maschile',
  giocatori: { p001: { nome: 'Uno', seed: 1, naz: 'ITA', rank: 1, espnId: '1', points: 1 }, p002: { nome: 'Due' } },
  turni: [], draw_R128: [], bonus: [{ id: 'most_aces', label: 'Più ace' }],
};
const cfg = SITI.wimbledino;

const exp = {
  _meta: { timestamp: '2026-07-13T10:00:00.000Z' },
  partecipanti: {
    a: { nickname: 'Alfa' }, b: { nickname: 'Beta' },
  },
  pronostici: {
    a: { bracket: { R128: { R128_01: { vincitore: 'p001', set: '3-0' } }, F: { F_01: { vincitore: 'p001', set: '3-1' } } }, bonus: { most_aces: 'p001' }, pronostico_nascosto: true },
    b: { bracket: { R128: { R128_01: { vincitore: 'p002', set: '3-0' } } }, bonus: {} },
    fantasma: { bracket: {}, bonus: {} },
  },
  risultati: {
    bracket: { R128: { R128_01: { vincitore: 'p001', set: '3-0' } }, F: { F_01: { vincitore: 'p001', set: '3-2' } } },
    bonus: { most_aces: 'p001' }, classifiche: { aces: [{ pid: 'p001', v: 10 }] },
  },
};

test('tennis: del partecipante entra solo il nickname; orfani scartati; schede svelate', () => {
  const p = trasformaTennis(exp, db, cfg);
  assert.deepEqual(p.storici.a, { nickname: 'Alfa' });
  assert.equal(p._stat.orfaniScartati, 1);
  assert.deepEqual(Object.keys(p.schede).sort(), ['a__principale', 'b__principale']);
  assert.ok(Object.values(p.schede).every(s => s.visibile === true));
});

test('tennis: classifica ricalcolata col motore (esiti + set esatti + bonus) e ordinata', () => {
  const p = trasformaTennis(exp, db, cfg);
  const [primo, secondo] = p.classifiche.finale.voci;
  // Alfa: R128 esito 1 + set 1; finale esito 180 (set 3-1 ≠ 3-2); bonus ace 25 → 207
  assert.equal(primo.nickname, 'Alfa');
  assert.equal(primo.totale, 1 + 1 + 180 + 25);
  assert.equal(primo.dettaglio.set.corretti, 1);
  assert.equal(primo.dettaglio.bonus.punti, 25);
  assert.equal(secondo.totale, 0);
  assert.deepEqual([primo.posizione, secondo.posizione], [1, 2]);
});

test('tennis: confronto con la classifica salvata dal vecchio sito, differenze segnalate', () => {
  const conSnap = { ...exp, classifica_snapshot: { partecipanti: [{ id: 'a', totale: 207 }, { id: 'b', totale: 5 }] } };
  const c = trasformaTennis(conSnap, db, cfg)._stat.confrontoConSito;
  assert.equal(c.uguali, 1);
  assert.deepEqual(c.diversi, [{ nickname: 'Beta', motore: 0, sito: 5 }]);
});

test('tennis: nessun dato personale né denaro nel pacchetto', () => {
  const sporco = { ...exp, partecipanti: { a: { nickname: 'Alfa', telefono: '+39333111222', email: 'x@y.it', cognome: 'Rossi' }, b: { nickname: 'Beta' } },
    sistema_config: { montepremi: { quota: 20 } } };
  const t = JSON.stringify(trasformaTennis(sporco, db, cfg));
  for (const v of ['+39333', 'x@y.it', 'Rossi', 'montepremi', 'quota', 'espnId']) assert.ok(!t.includes(v), v);
});

// Sui dati veri (se ci sono): nessun dato personale, e almeno una classifica non vuota
const dir = process.env.PRONO_SATELLITI_DIR;
const f = dir && join(dir, 'Wimbledino', 'Wimbledino_snapshot_2026-07-08.json');
test('dati veri di Wimbledino (snapshot): nessun contatto nel pacchetto', { skip: !(f && existsSync(f)) }, () => {
  const reale = JSON.parse(readFileSync(f, 'utf8'));
  const dbr = JSON.parse(readFileSync(join(dir, 'Wimbledino', 'wimbledon_db.json'), 'utf8'));
  const p = trasformaTennis(reale, dbr, cfg);
  assert.ok(p._stat.partecipanti > 0);
  const t = JSON.stringify(p);
  for (const q of reale.partecipanti) {
    assert.ok(!t.includes(q.email), 'email nel pacchetto');
    assert.ok(!(q.telefono && t.includes(q.telefono)), 'telefono nel pacchetto');
  }
});
