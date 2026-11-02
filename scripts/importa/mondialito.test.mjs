import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { trasforma } from './mondialito.mjs';

const exp = {
  partecipanti: {
    a: { nickname: 'Alfa', nome: 'Anna', cognome: 'Rossi', telefono: '+39333000111', email: 'anna.rossi@mondialito.app', isAdmin: true },
    b: { nickname: 'Beta', nome: 'Bruno', cognome: 'Verdi', telefono: '+39333000222', email: 'bruno@mondialito.app' },
    c: { nickname: 'Gamma', nome: 'Carla', cognome: 'Neri', telefono: '+39333000333', email: 'carla@mondialito.app' },
  },
  pronostici: {
    a: { gironi: { A1: { segno: '1' } }, pronostico_nascosto: true, updatedAt: { seconds: 1781848075, nanoseconds: 0 } },
    b: { gironi: {}, pronostico_nascosto: false, updatedAt: { seconds: 1781848076, nanoseconds: 0 } },
    zombie: { gironi: {}, updatedAt: { seconds: 1, nanoseconds: 0 } },
  },
  risultati: { gironi: { A1: { gol_casa: 1, gol_trasferta: 0, fonte: 'admin_manual' } }, updatedAt: '2026-06-10T23:25:30.354Z' },
  classifica_snapshot: {
    updatedAt: '2026-07-20T08:43:16.012Z',
    partecipanti: [
      { id: 'b', nome: 'Beta', totale: 100, spareggio: [1, 2], breakdown: {} },
      { id: 'a', nome: 'Alfa', totale: 100, spareggio: [1, 3], breakdown: {} },
      { id: 'c', nome: 'Gamma', totale: 100, spareggio: [1, 3], breakdown: {} },
    ],
  },
};
const db = {
  meta: { nome: 'Mondialito 2026', data_inizio: '2026-06-11', data_fine: '2026-07-19' },
  squadre: [], gironi: {}, fase_eliminatoria: {},
  regolamento: { punteggi: { x: 1 }, premi: { primo: '€ 100', secondo: '€ 50' } },
};

test('dei partecipanti entra solo il nickname: niente telefono, email, nome, cognome, ruoli', () => {
  const p = trasforma(exp, db);
  const testo = JSON.stringify(p);
  for (const vietato of ['+39333', 'mondialito.app', 'Rossi', 'Verdi', 'Neri', 'Anna', 'telefono', 'isAdmin', 'cognome']) {
    assert.ok(!testo.includes(vietato), `non deve comparire: ${vietato}`);
  }
  assert.deepEqual(p.storici.a, { nickname: 'Alfa' });
});

test('nessun denaro: i premi del regolamento non entrano', () => {
  const p = trasforma(exp, db);
  assert.ok(!JSON.stringify(p).includes('premi'));
  assert.ok(!JSON.stringify(p).includes('€'));
});

test('i pronostici di utenti che non ci sono più si scartano; gli altri si svelano tutti', () => {
  const p = trasforma(exp, db);
  assert.equal(p._stat.orfaniScartati, 1);
  assert.deepEqual(Object.keys(p.schede).sort(), ['a__principale', 'b__principale']);
  assert.ok(Object.values(p.schede).every(s => s.visibile === true));
  assert.ok(!('pronostico_nascosto' in p.schede['a__principale'].dati));
});

test('classifica: ordine per punti e spareggio, parità = stessa posizione', () => {
  const v = trasforma(exp, db).classifiche.finale.voci;
  assert.deepEqual(v.map(x => [x.nickname, x.posizione]), [['Alfa', 1], ['Gamma', 1], ['Beta', 3]]);
});

test('risultati: via la provenienza tecnica; competizione conclusa e archivio', () => {
  const p = trasforma(exp, db);
  assert.ok(!('fonte' in p.risultati.ufficiali.gironi.A1));
  assert.equal(p.competizione.stato, 'conclusa');
  assert.equal(p.competizione.archivio, true);
  assert.equal(p.competizione.formato, 'tabellone');
});

// Sui dati veri (se l'export c'è): numeri attesi e classifica uguale a quella ufficiale di allora.
const dir = process.env.PRONO_SATELLITI_DIR;
const cartella = dir && join(dir, 'Mondialito');
const file = cartella && existsSync(cartella) && readdirSync(cartella).filter(f => /^pronostici_mondialito_.*\.json$/.test(f)).sort().pop();
test('dati veri di Mondialito: 118 partecipanti, vincitore Real Beoni con 1415 punti, nessun dato personale', { skip: !file }, () => {
  const reale = JSON.parse(readFileSync(join(cartella, file), 'utf8'));
  const p = trasforma(reale, JSON.parse(readFileSync(join(cartella, 'mondialito_db.json'), 'utf8')));
  assert.equal(p._stat.partecipanti, 118);
  const primo = p.classifiche.finale.voci[0];
  assert.deepEqual([primo.nickname, primo.totale, primo.posizione], ['Real Beoni', 1415, 1]);
  const testo = JSON.stringify(p);
  for (const q of Object.values(reale.partecipanti)) {
    assert.ok(!testo.includes(q.email), 'email nel pacchetto');
    assert.ok(!(q.telefono && testo.includes(q.telefono)), 'telefono nel pacchetto');
  }
});
