/**
 * Test di PARITÀ con le app esistenti.
 *
 * Confrontano il motore generico (engine/ + descrittori/) con il codice dei
 * satelliti su centinaia di pronostici casuali (generatore con seme fisso, quindi
 * ripetibile). Se passano, migrare un gruppo su Pronò! non cambia i suoi punteggi.
 *
 * Il percorso della cartella con i satelliti si legge da PRONO_SATELLITI_DIR. Se non è
 * impostata, o il satellite non esiste, il relativo test viene saltato, non fallisce.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { calcolaPunteggioTotale } from '../punteggi.js';
import { classificaGirone } from '../ranking.js';
import { risultatoPrevisto } from '../partite.js';
import { formulito, formulitoSprint } from '../descrittori/formulito.js';
import { championsito } from '../descrittori/championsito.js';
import { medusino } from '../descrittori/tennis.js';
import { turniKO, idMatch } from '../ko.js';

const require = createRequire(import.meta.url);
const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Cartella con le vecchie app (Formulito, Championsito, Medusino…): sta fuori dal repository e il suo percorso
// cambia da un computer all'altro, quindi si legge da PRONO_SATELLITI_DIR (vedi .env.example).
// Se non è impostata o non esiste, i test di parità vengono saltati (non falliscono).
const radiceSatelliti = process.env.PRONO_SATELLITI_DIR || radice;
const nelRepo = (...p) => join(radiceSatelliti, ...p);

function rng(seme) {                       // mulberry32: deterministico
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const intTra = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const scegli = (r, arr) => arr[Math.floor(r() * arr.length)];
function mescola(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ── FORMULITO ───────────────────────────────────────────
const fFunzioni = nelRepo('Formulito', 'functions', 'punteggi.js');

for (const [compId, descrittore, conSprint] of [
  ['monza', formulito, false],
  ['singapore', formulitoSprint, true],
]) {
  test(`parità Formulito (${compId}${conSprint ? ', con Sprint' : ''}): 300 pronostici casuali`, { skip: !existsSync(fFunzioni) }, () => {
    const F = require(fFunzioni);
    const r = rng(conSprint ? 7 : 3);
    const piloti = Array.from({ length: 22 }, (_, i) => `p${String(i + 1).padStart(2, '0')}`);

    // un ordine incompleto (come una scheda compilata a metà): permutazione con code vuote
    const ordine = (n, vuoti) => {
      const o = mescola(r, piloti).slice(0, n);
      while (o.length < n) o.push(null);
      for (let k = 0; k < vuoti; k++) o[intTra(r, 0, n - 1)] = null;
      return o;
    };
    const bonus = (completo) => {
      const b = {};
      for (const id of ['giroVeloce', 'pitStopVeloce', 'gommaLunga', 'primoRitirato', 'maggiorGuadagno']) {
        b[id] = completo || r() < 0.7 ? scegli(r, piloti.slice(0, 6)) : '';    // pochi candidati: i match avvengono
      }
      b.safetyCar = r() < 0.15 ? '' : String(intTra(r, 0, 4));
      return b;
    };

    for (let k = 0; k < 300; k++) {
      const pron = { qualifica: { griglia: ordine(22, intTra(r, 0, 4)) }, gara: { arrivo: ordine(22, intTra(r, 0, 4)), bonus: bonus(false) } };
      const ris = { qualifica: { griglia: ordine(22, 0) }, gara: { arrivo: ordine(22, 0), bonus: bonus(true) } };
      if (conSprint) {
        pron.sprint = { top8: ordine(8, intTra(r, 0, 2)) };
        ris.sprint = { top8: ordine(8, 0) };
      }

      const atteso = F.calcolaPunteggio(pron, ris, compId);
      const ottenuto = calcolaPunteggioTotale({
        pronostico: {
          ordinamenti: { qualifica: pron.qualifica.griglia, gara: pron.gara.arrivo, sprint: pron.sprint?.top8 },
          bonus: pron.gara.bonus,
        },
        risultato: {
          ordinamenti: { qualifica: ris.qualifica.griglia, gara: ris.gara.arrivo, sprint: ris.sprint?.top8 },
          bonus: ris.gara.bonus,
        },
        descrittoreTorneo: descrittore,
      });

      assert.equal(ottenuto.totale, atteso.totale, `caso ${k}: totale`);
      assert.equal(ottenuto.breakdown.qualifica.totale, atteso.breakdown.qualifica, `caso ${k}: qualifica`);
      assert.equal(ottenuto.breakdown.gara.totale, atteso.breakdown.gara, `caso ${k}: gara`);
      assert.equal(ottenuto.breakdown.bonus.totale, atteso.breakdown.bonus, `caso ${k}: bonus`);
      if (conSprint) assert.equal(ottenuto.breakdown.sprint.totale, atteso.breakdown.sprint, `caso ${k}: sprint`);
      assert.deepEqual(ottenuto.spareggio, atteso.spareggio, `caso ${k}: spareggio`);
    }
  });
}

// ── CHAMPIONSITO ────────────────────────────────────────
const cFunzioni = nelRepo('Championsito', 'functions', 'punteggi.js');

test('parità Championsito (fasce, segno+esatto, bonus): 200 pronostici casuali', { skip: !existsSync(cFunzioni) }, () => {
  const C = require(cFunzioni);
  const r = rng(11);
  const squadre = Array.from({ length: 36 }, (_, i) => ({ id: `sq${String(i + 1).padStart(2, '0')}`, nome: `Team ${String(36 - i).padStart(2, '0')}` }));
  const nomi = Object.fromEntries(squadre.map(s => [s.id, s.nome]));
  const ids = squadre.map(s => s.id);

  const segnoDi = (gc, gt) => (gc > gt ? '1' : gc < gt ? '2' : 'X');

  for (let k = 0; k < 200; k++) {
    // calendario: 8 giornate da 18 partite
    const giornate = [];
    let n = 0;
    for (let g = 0; g < 8; g++) {
      const ordineSq = mescola(r, ids);
      const partite = [];
      for (let i = 0; i < 36; i += 2) {
        n++;
        const giocata = g < 7 || r() < 0.5;          // l'ultima giornata a metà
        partite.push({
          id: `m${n}`, casa: ordineSq[i], trasferta: ordineSq[i + 1],
          golCasa: giocata ? intTra(r, 0, 4) : null, golTrasferta: giocata ? intTra(r, 0, 4) : null,
        });
      }
      giornate.push({ numero: g + 1, partite });
    }
    const congelata = r() < 0.6;
    const capi = ['aaa', 'bbb', 'ccc'];

    // pronostico: per partita esatto (con segno coerente), solo segno, oppure nulla
    const pron = { segni: {}, risultatiEsatti: {}, bonus: {} };
    for (const g of giornate) for (const p of g.partite) {
      const x = r();
      if (x < 0.5) {
        const gc = intTra(r, 0, 4), gt = intTra(r, 0, 4);
        pron.risultatiEsatti[p.id] = { golCasa: gc, golTrasferta: gt };
        pron.segni[p.id] = segnoDi(gc, gt);
      } else if (x < 0.8) {
        pron.segni[p.id] = scegli(r, ['1', 'X', '2']);
      }
    }
    const ris = { squadre, giornate, congelata, bonus: {} };
    for (const id of ['capocannoniere', 'assistman', 'cartellini']) {
      ris.bonus[id] = scegli(r, capi);
      if (r() < 0.8) pron.bonus[id] = scegli(r, capi);
    }

    const atteso = C.calcolaPunteggio(pron, ris);

    // ── lato motore generico ──
    const partiteReali = [];
    const gironiReali = {};
    const gironiPron = {};
    const partitePronostico = [];
    for (const g of giornate) for (const p of g.partite) {
      if (p.golCasa != null && p.golTrasferta != null) {
        gironiReali[p.id] = { valoreCasa: p.golCasa, valoreTrasferta: p.golTrasferta };
        partiteReali.push({ casa: p.casa, trasferta: p.trasferta, valoreCasa: p.golCasa, valoreTrasferta: p.golTrasferta });
      }
      const e = pron.risultatiEsatti[p.id];
      const prev = risultatoPrevisto(e ? { valoreCasa: e.golCasa, valoreTrasferta: e.golTrasferta } : null, pron.segni[p.id]);
      if (prev) {
        gironiPron[p.id] = prev;
        partitePronostico.push({ casa: p.casa, trasferta: p.trasferta, ...prev });
      }
    }
    const cfg = { squadre: ids, criteriRanking: championsito.gironi.criteriRanking, puntiPartita: championsito.gironi.puntiPartita, nomi };
    const ordineReale = classificaGirone({ partiteGirone: partiteReali, ...cfg }).ordine;
    const ordinePron = classificaGirone({ partiteGirone: partitePronostico, ...cfg }).ordine;

    const ottenuto = calcolaPunteggioTotale({
      pronostico: { gironi: gironiPron, ordinamenti: { classificaFinale: ordinePron }, bonus: pron.bonus },
      risultato: { gironi: gironiReali, ordinamenti: congelata ? { classificaFinale: ordineReale } : {}, bonus: ris.bonus },
      descrittoreTorneo: championsito,
    });

    const partiteOk = Object.values(ottenuto.breakdown.gironi.dettaglio);
    const segno = partiteOk.filter(p => p.segnoOk).length * 3;
    const esatto = partiteOk.filter(p => p.esattoOk).length * 10;
    const classif = ottenuto.breakdown.classificaFinale;

    assert.equal(ottenuto.totale, atteso.totale, `caso ${k}: totale`);
    assert.equal(segno, atteso.breakdown.segno, `caso ${k}: segno`);
    assert.equal(esatto, atteso.breakdown.risultatoEsatto, `caso ${k}: esatto`);
    assert.equal(ottenuto.breakdown.bonus.totale, atteso.breakdown.bonus, `caso ${k}: bonus`);
    assert.equal(classif ? classif.dettaglio.fascia : 0, atteso.breakdown.fascia, `caso ${k}: fascia`);
    assert.equal(classif ? classif.dettaglio.esattaFascia : 0, atteso.breakdown.posizione, `caso ${k}: posizione`);
    assert.deepEqual(ottenuto.spareggio, atteso.spareggio, `caso ${k}: spareggio`);
  }
});

// ── MEDUSINO (tennis, tabellone 128) ────────────────────
const mPunteggi = nelRepo('Medusino', 'js', 'punteggi.js');

test('parità Medusino (esiti + set annidato + bonus + ritirati): 200 tabelloni casuali', { skip: !existsSync(mPunteggi) }, async () => {
  // js/punteggi.js è un modulo del browser (import './bracket.js'): lo carico da una copia temporanea
  // con la sola costante TURNI al posto dell'import, senza toccare l'originale.
  const sorgente = readFileSync(mPunteggi, 'utf8').replace(
    /import\s*\{\s*TURNI\s*\}\s*from\s*'\.\/bracket\.js';/,
    "const TURNI = ['R128','R64','R32','R16','QF','SF','F'].map(id => ({ id }));"
  );
  assert.notEqual(sorgente.includes("from './bracket.js'"), true, 'import non sostituito');
  const dir = mkdtempSync(join(tmpdir(), 'prono-parita-'));
  const file = join(dir, 'medusino-punteggi.mjs');
  writeFileSync(file, sorgente);
  const M = await import(pathToFileURL(file).href);

  const r = rng(23);
  const giocatori = Array.from({ length: 128 }, (_, i) => `g${String(i + 1).padStart(3, '0')}`);
  const turni = turniKO(128);
  const simula = () => {
    const doc = {};
    let correnti = mescola(r, giocatori);
    for (const t of turni) {
      const vinc = [];
      for (let i = 0; i < t.matches; i++) {
        const v = r() < 0.5 ? correnti[i * 2] : correnti[i * 2 + 1];
        (doc[t.id] ||= {})[idMatch(t.id, i)] = { vincitore: v, set: scegli(r, ['3-0', '3-1', '3-2']) };
        vinc.push(v);
      }
      correnti = vinc;
    }
    return doc;
  };
  const aDettaglio = (doc) => Object.fromEntries(Object.entries(doc).map(([t, ms]) =>
    [t, Object.fromEntries(Object.entries(ms).map(([mid, m]) => [mid, { vincitore: m.vincitore, dettaglio: m.set }]))]));

  for (let k = 0; k < 200; k++) {
    const reale = simula();
    // pronostico = realtà con una parte di vincitori/set cambiati, così i punteggi non sono tutti 0
    const pron = JSON.parse(JSON.stringify(reale));
    for (const ms of Object.values(pron)) for (const m of Object.values(ms)) {
      if (r() < 0.35) m.vincitore = scegli(r, giocatori);
      if (r() < 0.4) m.set = scegli(r, ['3-0', '3-1', '3-2']);
    }
    const bonusIds = ['aces', 'breaks', 'tiebreaks'];
    const db = { bonus: bonusIds.map(id => ({ id, punti: 15 })), sostituiti: r() < 0.5 ? [{ pid: scegli(r, giocatori) }, scegli(r, giocatori)] : [] };
    const bonusReale = Object.fromEntries(bonusIds.map(id => [id, scegli(r, giocatori.slice(0, 4))]));
    const bonusPron = Object.fromEntries(bonusIds.map(id => [id, scegli(r, giocatori.slice(0, 4))]));

    const atteso = M.calcolaPunteggio({ bracket: pron, bonus: bonusPron }, { bracket: reale, bonus: bonusReale }, db);
    const annullati = db.sostituiti.map(s => (typeof s === 'string' ? s : s.pid));
    const ottenuto = calcolaPunteggioTotale({
      pronostico: { bracketDoc: aDettaglio(pron), bonus: bonusPron },
      risultato: { bracketDoc: aDettaglio(reale), bonus: bonusReale, annullati },
      descrittoreTorneo: medusino,
    });

    assert.equal(ottenuto.totale, atteso.totale, `caso ${k}: totale`);
    assert.equal(ottenuto.breakdown.bracketDoc.esiti, atteso.breakdown.esiti, `caso ${k}: esiti`);
    assert.equal(ottenuto.breakdown.bracketDoc.dettaglio, atteso.breakdown.set, `caso ${k}: set`);
    assert.equal(ottenuto.breakdown.bonus.totale, atteso.breakdown.bonus, `caso ${k}: bonus`);
    assert.deepEqual(ottenuto.spareggio, atteso.spareggio, `caso ${k}: spareggio`);
  }
});
