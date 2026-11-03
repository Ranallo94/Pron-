/**
 * Importazione di Wimbledino e Medusino (tennis, tabellone da 128) in Pronò! come ARCHIVI (competizioni concluse).
 *
 *   node scripts/importa/tennis.mjs wimbledino                 → scrive il pacchetto in scripts/importa/out/
 *   node scripts/importa/tennis.mjs wimbledino --emulatore     → lo carica nell'emulatore Firestore
 *   node scripts/importa/tennis.mjs medusino --produzione      → lo carica nel progetto vero (GOOGLE_APPLICATION_CREDENTIALS)
 *   opzione  --file <percorso>   usa questo export invece dell'ultimo esportazione_*.json della cartella
 *
 * L'export si ottiene incollando `esporta-tennis.js` nella console del vecchio sito (da admin).
 *
 * PRIVACY: dei partecipanti entra solo il nickname. Niente telefoni, email, nomi, montepremi né quote.
 * PUNTEGGI: la classifica si RICALCOLA con il motore di Pronò! (descrittori wimbledino/medusino) e si confronta con
 * quella che il vecchio sito aveva salvato: ogni differenza viene segnalata, non nascosta.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calcolaPunteggioTotale, wimbledino, medusino } from '../../engine/index.js';
import { toIso, ordinaEPosiziona, leggiEnvLocale, caricaPacchetto } from './comune.mjs';

export const SITI = {
  wimbledino: {
    id: 'wimbledino-2026', cartella: 'Wimbledino', db: 'wimbledon_db.json', motore: wimbledino,
    nome: 'Wimbledino 2026', inizio: '2026-06-29', fine: '2026-07-12',
    // verde e oro: la vecchia app andò online con questo tema (il viola/lime fu solo progettato)
    tema: { sfondo: '#0a1f10', superficie: '#132a18', superficie2: '#1a3520', bordo: '#2a4a30', accento: '#f0b429', suAccento: '#0d1b12', secondario: '#1a6b35', testo: '#f0f4f1', muto: '#8aab8f' },
  },
  medusino: {
    id: 'medusino-2026', cartella: 'Medusino', db: 'usopen_db.json', motore: medusino,
    nome: 'Medusino 2026', inizio: '2026-08-31', fine: '2026-09-13',
    tema: { sfondo: '#071a2f', superficie: '#0e2740', superficie2: '#143352', bordo: '#23486d', accento: '#f2e63d', suAccento: '#06182b', secondario: '#1d6fb8', testo: '#eef4fa', muto: '#8fa9c4' },
  },
};

// Id dei bonus nei vecchi siti → id nel motore
const BONUS_MOTORE = { most_aces: 'aces', most_breaks: 'breaks', most_tiebreaks: 'tiebreaks' };

const arrayInMappa = (v) => (Array.isArray(v) ? Object.fromEntries(v.map(p => [p.id, p])) : (v || {}));

/** Dal documento dei vecchi siti ({R128:{R128_01:{vincitore,set}}}) alla forma del motore ({…:{vincitore,dettaglio}}). */
function bracketDoc(bracket) {
  const out = {};
  for (const [turno, partite] of Object.entries(bracket || {})) {
    for (const [mid, m] of Object.entries(partite || {})) {
      if (m && m.vincitore) (out[turno] ||= {})[mid] = { vincitore: m.vincitore, dettaglio: m.set ?? null };
    }
  }
  return out;
}

function bonusMotore(bonus) {
  const out = {};
  for (const [k, v] of Object.entries(bonus || {})) if (BONUS_MOTORE[k] && v) out[BONUS_MOTORE[k]] = v;
  return out;
}

/**
 * Trasforma l'export di un vecchio sito di tennis nel pacchetto di documenti Firestore di Pronò!.
 * Funzione PURA: niente file né rete.
 */
export function trasformaTennis(exp, db, cfg) {
  const part = arrayInMappa(exp.partecipanti);
  const pronostici = arrayInMappa(exp.pronostici);

  // Partecipanti storici: chi ha una scheda; solo nickname. I pronostici di chi non c'è più (orfani) si scartano.
  // Se il vecchio sito aveva una classifica, chi non c'era (account di prova, esclusi) non entra.
  const inClassifica = new Set((exp.classifica_snapshot?.partecipanti || []).map(c => c.id));
  const storici = {};
  let orfani = 0;
  const fuoriClassifica = [];
  for (const sid of Object.keys(pronostici)) {
    const p = part[sid];
    if (!p) { orfani++; continue; }
    if (inClassifica.size > 0 && !inClassifica.has(sid)) { fuoriClassifica.push(String(p.nickname || p.nome || sid)); continue; }
    storici[sid] = { nickname: String(p.nickname || p.nome || 'Anonimo').trim() };
  }

  const schede = {};
  for (const [sid, pr] of Object.entries(pronostici)) {
    if (!storici[sid]) continue;
    schede[`${sid}__principale`] = {
      uid: sid,
      schedaId: 'principale',
      dati: { bracket: pr.bracket || {}, bonus: pr.bonus || {} },
      visibile: true,           // `pronostico_nascosto` serviva fino alla chiusura: a torneo concluso si svela tutto
      aggiornatoIl: toIso(pr.updatedAt),
    };
  }

  // Risultati ufficiali
  const ris = exp.risultati || {};
  const annullati = (db.sostituiti || []).map(s => (typeof s === 'string' ? s : s.pid));
  const risultatoMotore = { bracketDoc: bracketDoc(ris.bracket), bonus: bonusMotore(ris.bonus), annullati };

  // Classifica: ricalcolata col motore di Pronò!
  const voci = Object.entries(storici).map(([sid, s]) => {
    const pron = schede[`${sid}__principale`].dati;
    const r = calcolaPunteggioTotale({
      pronostico: { bracketDoc: bracketDoc(pron.bracket), bonus: bonusMotore(pron.bonus) },
      risultato: risultatoMotore,
      descrittoreTorneo: cfg.motore,
    });
    const bd = r.breakdown.bracketDoc || { esiti: 0, dettaglio: 0, dettagliEsatti: 0, perTurno: {} };
    const bo = r.breakdown.bonus || { totale: 0, indovinati: 0 };
    return {
      sid, nickname: s.nickname, totale: r.totale, spareggio: r.spareggio,
      dettaglio: {
        esiti: { punti: bd.esiti },
        set: { punti: bd.dettaglio, corretti: bd.dettagliEsatti },
        bonus: { punti: bo.totale ?? 0, corretti: bo.indovinati ?? 0 },
      },
      perTurno: bd.perTurno,
    };
  });
  ordinaEPosiziona(voci);

  // Confronto con la classifica che il vecchio sito aveva salvato
  const snap = exp.classifica_snapshot?.partecipanti || [];
  const delSito = new Map(snap.map(c => [c.id, c]));
  const diversi = [];
  let uguali = 0;
  for (const v of voci) {
    const s = delSito.get(v.sid);
    if (!s) continue;
    if (s.totale === v.totale) uguali++; else diversi.push({ nickname: v.nickname, motore: v.totale, sito: s.totale });
  }

  // Struttura del torneo (giocatori, tabellone di partenza, bonus) per le schermate
  const giocatori = Object.fromEntries(Object.entries(db.giocatori || {}).map(([pid, g]) =>
    [pid, { nome: g.nome, seed: g.seed ?? null, naz: g.naz || '', rank: g.rank ?? null }]));
  const descrittore = {
    tipo: 'tennis-ko',
    fonte: cfg.db,
    evento: db.evento,
    tabellone: db.tabellone,
    giocatori,
    turni: db.turni,
    draw: db.draw_R128,
    bonus: (db.bonus || []).map(b => ({ id: b.id, label: b.label })),
    sostituiti: (db.sostituiti || []).map(s => ({ pid: s.pid, uscito: s.uscito, entrato: s.entrato })),
    regolamento: {
      punteggi: { esiti_per_turno: cfg.motore.tabellaPunti.bracket.esiti, set_esatti_per_turno: cfg.motore.tabellaPunti.bracket.dettaglio,
        bonus_statistici_ciascuno: cfg.motore.tabellaPunti.bonus[0].punti },
      criteri_spareggio: ['Campione indovinato', 'Finalisti indovinati', 'Semifinalisti indovinati', 'Quarti indovinati',
        'Risultati in set esatti', 'Bonus statistici indovinati'],
    },
  };

  const competizione = {
    nome: cfg.nome,
    categoria: 'sport',
    sport: 'tennis',
    formato: 'tabellone',
    stato: 'conclusa',
    iscrizione: 'approvazione',
    visibilita: 'pubblica',
    archivio: true,
    descrittore,
    scadenze: { principale: `${cfg.inizio}T12:00:00+02:00` },
    dataInizio: cfg.inizio,
    dataFine: cfg.fine,
    descrizione: `${db.evento} · ${db.tabellone}`,
    tema: cfg.tema,
    numeri: { partecipanti: Object.keys(storici).length, schede: Object.keys(schede).length },
    creataDa: 'importazione',
  };

  return {
    id: cfg.id,
    competizione,
    storici,
    schede,
    risultati: { ufficiali: {
      bracket: ris.bracket || {}, bonus: ris.bonus || {}, classifiche: ris.classifiche || {}, aggiornatoIl: toIso(ris.updatedAt),
    } },
    classifiche: { finale: { voci, fonte: 'ricalcolata-dal-motore', aggiornataIl: toIso(exp._meta?.timestamp) || toIso(ris.updatedAt) } },
    _stat: {
      partecipanti: Object.keys(storici).length, schede: Object.keys(schede).length, orfaniScartati: orfani,
      fuoriClassificaScartati: fuoriClassifica,
      confrontoConSito: { uguali, diversi, senzaConfronto: voci.length - uguali - diversi.length },
    },
  };
}

// ── Da qui in giù: solo riga di comando ──────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const sito = args.find(a => SITI[a]);
  if (!sito) { console.error(`Uso: node scripts/importa/tennis.mjs <${Object.keys(SITI).join('|')}> [--emulatore|--produzione] [--file percorso]`); process.exit(1); }
  const cfg = SITI[sito];
  const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dir = process.env.PRONO_SATELLITI_DIR || leggiEnvLocale(radice).PRONO_SATELLITI_DIR;
  if (!dir) { console.error('PRONO_SATELLITI_DIR non impostata (env o .env.local).'); process.exit(1); }
  const cartella = join(dir, cfg.cartella);

  const iFile = args.indexOf('--file');
  let percorso = iFile >= 0 ? args[iFile + 1] : null;
  if (!percorso) {
    const ultimo = readdirSync(cartella).filter(f => /^esportazione_.*\.json$/.test(f)).sort().pop();
    if (!ultimo) { console.error(`Nessun esportazione_*.json in ${cartella}. Esegui esporta-tennis.js sul vecchio sito (vedi l'intestazione del file).`); process.exit(1); }
    percorso = join(cartella, ultimo);
  }
  const exp = JSON.parse(readFileSync(percorso, 'utf8'));
  const db = JSON.parse(readFileSync(join(cartella, cfg.db), 'utf8'));
  const pacchetto = trasformaTennis(exp, db, cfg);
  console.log(`Export: ${percorso}`);
  console.log(JSON.stringify(pacchetto._stat, null, 1));

  const out = join(radice, 'scripts', 'importa', 'out');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${cfg.id}.json`), JSON.stringify(pacchetto));
  console.log(`Pacchetto scritto in scripts/importa/out/${cfg.id}.json (ignorato da Git)`);

  if (args.includes('--emulatore')) {
    console.log(`Caricati ${await caricaPacchetto(pacchetto, { emulatore: true, progetto: 'demo-prono' })} documenti nell'emulatore.`);
  } else if (args.includes('--produzione')) {
    const progetto = process.env.PRONO_FIREBASE_PROJECT || leggiEnvLocale(radice).VITE_FIREBASE_PROJECT_ID;
    console.log(`Caricati ${await caricaPacchetto(pacchetto, { emulatore: false, progetto })} documenti su ${progetto}.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
