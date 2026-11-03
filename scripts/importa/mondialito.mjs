/**
 * Importazione di Mondialito 2026 in Pronò! come ARCHIVIO (competizione conclusa).
 *
 *   node scripts/importa/mondialito.mjs                 → scrive il pacchetto in scripts/importa/out/ (nessun upload)
 *   node scripts/importa/mondialito.mjs --emulatore     → lo carica nell'emulatore Firestore (127.0.0.1:8080)
 *   node scripts/importa/mondialito.mjs --produzione    → lo carica nel progetto vero (serve GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Legge l'export dell'admin (esporta-pronostici.js) e mondialito_db.json dalla cartella indicata in
 * PRONO_SATELLITI_DIR (env o .env.local), sotto-cartella "Mondialito".
 *
 * PRIVACY: dei partecipanti si importa SOLO il nickname. Telefoni, email, nome e cognome non entrano mai nel
 * pacchetto. Nessun dato di denaro (il regolamento originale conteneva i "premi": escluso).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toIso, ordinaEPosiziona, leggiEnvLocale, caricaPacchetto } from './comune.mjs';

export const ID_COMPETIZIONE = 'mondialito-2026';

/**
 * Trasforma l'export delle vecchie app nel pacchetto di documenti Firestore di Pronò!.
 * Funzione PURA (niente file, niente rete): è quella provata dai test.
 */
export function trasforma(exp, db) {
  const part = exp.partecipanti || {};

  // Partecipanti storici: solo nickname. L'id è quello della vecchia app (non è un dato personale).
  const storici = {};
  for (const [sid, p] of Object.entries(part)) {
    storici[sid] = { nickname: String(p.nickname || p.nome || 'Anonimo').trim() };
  }

  // Schede: una per partecipante noto. I pronostici di utenti che non ci sono più (orfani) si scartano.
  // `pronostico_nascosto` serviva a non mostrarli prima della chiusura: a torneo concluso si svela tutto.
  const schede = {};
  let orfani = 0;
  for (const [sid, pr] of Object.entries(exp.pronostici || {})) {
    if (!storici[sid]) { orfani++; continue; }
    const { pronostico_nascosto, updatedAt, ...dati } = pr;
    void pronostico_nascosto;
    schede[`${sid}__principale`] = {
      uid: sid,
      schedaId: 'principale',
      dati,
      visibile: true,
      aggiornatoIl: toIso(updatedAt),
    };
  }

  // Classifica finale (quella calcolata dal sito all'epoca), con posizione; parità = stessa posizione.
  const voci = (exp.classifica_snapshot?.partecipanti || [])
    .filter(c => storici[c.id])
    .map(c => ({
      sid: c.id,
      nickname: storici[c.id].nickname,
      totale: c.totale,
      spareggio: c.spareggio || [],
      dettaglio: c.breakdown || {},
    }));
  ordinaEPosiziona(voci);

  // Risultati ufficiali: tolgo solo la provenienza tecnica ("fonte": inserimento manuale / API).
  const risultati = JSON.parse(JSON.stringify(exp.risultati || {}), (k, v) => (k === 'fonte' ? undefined : v));

  // Struttura del torneo come "descrittore": squadre, gironi con calendario, tabellone, punteggi. Senza premi.
  const { premi, ...regolamento } = db.regolamento || {};
  void premi;
  const descrittore = {
    tipo: 'gironi-ko',
    fonte: 'mondialito_db.json',
    squadre: db.squadre,
    gironi: db.gironi,
    tabellone: db.fase_eliminatoria,
    regolamento,
  };

  const inizio = db.meta?.data_inizio || '2026-06-11';
  const competizione = {
    nome: db.meta?.nome || 'Mondialito 2026',
    categoria: 'sport',
    sport: 'calcio',
    formato: 'tabellone',
    stato: 'conclusa',
    iscrizione: 'approvazione',
    visibilita: 'pubblica',
    archivio: true,
    descrittore,
    scadenze: { principale: `${inizio}T21:00:00+02:00` },
    dataInizio: inizio,
    dataFine: db.meta?.data_fine || '2026-07-19',
    descrizione: db.meta?.torneo ? `${db.meta.torneo} · ${db.meta.edizione || ''}`.trim() : '',
    tema: { sfondo: '#0a1f10', superficie: '#132a18', superficie2: '#1a3520', bordo: '#2a4a30', accento: '#f0b429', suAccento: '#0d1b12', secondario: '#1a6b35', testo: '#f0f4f1', muto: '#8aab8f' },
    numeri: { partecipanti: Object.keys(storici).length, schede: Object.keys(schede).length },
    creataDa: 'importazione',
  };

  return {
    id: ID_COMPETIZIONE,
    competizione,
    storici,
    schede,
    risultati: { ufficiali: { ...risultati, aggiornatoIl: toIso(risultati.updatedAt) } },
    classifiche: { finale: { voci, fonte: 'snapshot-mondialito', aggiornataIl: toIso(exp.classifica_snapshot?.updatedAt) } },
    _stat: { partecipanti: Object.keys(storici).length, schede: Object.keys(schede).length, orfaniScartati: orfani },
  };
}

// ── Da qui in giù: solo uso da riga di comando ───────────────────────────────
async function main() {
  const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dir = process.env.PRONO_SATELLITI_DIR || leggiEnvLocale(radice).PRONO_SATELLITI_DIR;
  if (!dir) { console.error('PRONO_SATELLITI_DIR non impostata (env o .env.local).'); process.exit(1); }
  const cartella = join(dir, 'Mondialito');
  const exportFile = readdirSync(cartella).filter(f => /^pronostici_mondialito_.*\.json$/.test(f)).sort().pop();
  if (!exportFile) { console.error(`Nessun export pronostici_mondialito_*.json in ${cartella}`); process.exit(1); }

  const exp = JSON.parse(readFileSync(join(cartella, exportFile), 'utf8'));
  const db = JSON.parse(readFileSync(join(cartella, 'mondialito_db.json'), 'utf8'));
  const pacchetto = trasforma(exp, db);
  console.log(`Export: ${exportFile}`);
  console.log(pacchetto._stat);

  const out = join(radice, 'scripts', 'importa', 'out');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${ID_COMPETIZIONE}.json`), JSON.stringify(pacchetto));
  console.log(`Pacchetto scritto in scripts/importa/out/${ID_COMPETIZIONE}.json (ignorato da Git)`);

  const args = process.argv.slice(2);
  if (args.includes('--emulatore')) {
    const n = await caricaPacchetto(pacchetto, { emulatore: true, progetto: 'demo-prono' });
    console.log(`Caricati ${n} documenti nell'emulatore.`);
  } else if (args.includes('--produzione')) {
    const progetto = process.env.PRONO_FIREBASE_PROJECT || leggiEnvLocale(radice).VITE_FIREBASE_PROJECT_ID;
    const n = await caricaPacchetto(pacchetto, { emulatore: false, progetto });
    console.log(`Caricati ${n} documenti su ${progetto}.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
