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

export const ID_COMPETIZIONE = 'mondialito-2026';

const toIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return null;
};

/** Confronto lessicografico dei criteri di spareggio (più alto = meglio). */
function confrontaSpareggio(a = [], b = []) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

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
    }))
    .sort((a, b) => (b.totale - a.totale) || confrontaSpareggio(a.spareggio, b.spareggio));
  voci.forEach((v, i) => {
    const prec = voci[i - 1];
    const pari = prec && prec.totale === v.totale && confrontaSpareggio(prec.spareggio, v.spareggio) === 0;
    v.posizione = pari ? prec.posizione : i + 1;
  });

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
    tema: { colore: '#c9a227' },
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
function leggiEnvLocale(radice) {
  const f = join(radice, '.env.local');
  if (!existsSync(f)) return {};
  const out = {};
  for (const riga of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !riga.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

/** Converte le date ISO in Timestamp e carica tutto con firebase-admin. */
async function carica(pacchetto, { emulatore, progetto }) {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
  if (emulatore) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  initializeApp(emulatore ? { projectId: progetto } : { projectId: progetto, credential: applicationDefault() });
  const fs = getFirestore();

  const conDate = (o) => JSON.parse(JSON.stringify(o), (k, v) => v);
  const ts = (iso) => (iso ? Timestamp.fromDate(new Date(iso)) : null);
  const base = `competizioni/${pacchetto.id}`;

  let batch = fs.batch(); let n = 0;
  const scrivi = async (path, dati) => {
    batch.set(fs.doc(path), dati);
    if (++n % 400 === 0) { await batch.commit(); batch = fs.batch(); }
  };

  const c = conDate(pacchetto.competizione);
  c.scadenze = { principale: ts(c.scadenze.principale) };
  c.creataIl = Timestamp.now();
  await scrivi(base, c);
  for (const [sid, s] of Object.entries(pacchetto.storici)) await scrivi(`${base}/storici/${sid}`, s);
  for (const [id, s] of Object.entries(pacchetto.schede)) await scrivi(`${base}/schede/${id}`, { ...s, aggiornatoIl: ts(s.aggiornatoIl) });
  const ris = pacchetto.risultati.ufficiali;
  await scrivi(`${base}/risultati/ufficiali`, { ...ris, aggiornatoIl: ts(ris.aggiornatoIl) });
  const cla = pacchetto.classifiche.finale;
  await scrivi(`${base}/classifiche/finale`, { ...cla, aggiornataIl: ts(cla.aggiornataIl) });
  await batch.commit();
  return n;
}

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
    const n = await carica(pacchetto, { emulatore: true, progetto: 'demo-prono' });
    console.log(`Caricati ${n} documenti nell'emulatore.`);
  } else if (args.includes('--produzione')) {
    const progetto = process.env.PRONO_FIREBASE_PROJECT || leggiEnvLocale(radice).VITE_FIREBASE_PROJECT_ID;
    const n = await carica(pacchetto, { emulatore: false, progetto });
    console.log(`Caricati ${n} documenti su ${progetto}.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
