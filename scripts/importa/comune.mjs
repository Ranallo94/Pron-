/**
 * Parti comuni a tutte le importazioni delle vecchie app (Mondialito, Wimbledino, Medusino…).
 * Il "pacchetto" di ogni importazione ha sempre la stessa forma:
 *   { id, competizione, storici{sid:{nickname}}, schede{sid__principale:{…}}, risultati{ufficiali}, classifiche{finale} }
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const toIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return null;
};

/** Confronto lessicografico dei criteri di spareggio (più alto = meglio). */
export function confrontaSpareggio(a = [], b = []) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Ordina per punti e spareggio e assegna la posizione (parità perfetta = stessa posizione). Modifica `voci`. */
export function ordinaEPosiziona(voci) {
  voci.sort((a, b) => (b.totale - a.totale) || confrontaSpareggio(a.spareggio, b.spareggio));
  voci.forEach((v, i) => {
    const prec = voci[i - 1];
    const pari = prec && prec.totale === v.totale && confrontaSpareggio(prec.spareggio, v.spareggio) === 0;
    v.posizione = pari ? prec.posizione : i + 1;
  });
  return voci;
}

export function leggiEnvLocale(radice) {
  const f = join(radice, '.env.local');
  if (!existsSync(f)) return {};
  const out = {};
  for (const riga of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !riga.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

/** Carica un pacchetto su Firestore (emulatore o progetto vero) con firebase-admin. Ritorna i documenti scritti. */
export async function caricaPacchetto(pacchetto, { emulatore, progetto }) {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
  if (emulatore) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  initializeApp(emulatore ? { projectId: progetto } : { projectId: progetto, credential: applicationDefault() });
  const fs = getFirestore();

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ts = (iso) => (iso ? Timestamp.fromDate(new Date(iso)) : null);
  const base = `competizioni/${pacchetto.id}`;

  let batch = fs.batch(); let n = 0;
  const scrivi = async (path, dati) => {
    batch.set(fs.doc(path), dati);
    if (++n % 400 === 0) { await batch.commit(); batch = fs.batch(); }
  };

  const c = clone(pacchetto.competizione);
  c.scadenze = Object.fromEntries(Object.entries(c.scadenze).map(([k, v]) => [k, ts(v)]));
  c.creataIl = Timestamp.now();
  await scrivi(base, c);
  for (const [sid, s] of Object.entries(pacchetto.storici)) await scrivi(`${base}/storici/${sid}`, s);
  for (const [id, s] of Object.entries(pacchetto.schede)) await scrivi(`${base}/schede/${id}`, { ...clone(s), aggiornatoIl: ts(s.aggiornatoIl) });
  const ris = pacchetto.risultati.ufficiali;
  await scrivi(`${base}/risultati/ufficiali`, { ...clone(ris), aggiornatoIl: ts(ris.aggiornatoIl) });
  const cla = pacchetto.classifiche.finale;
  await scrivi(`${base}/classifiche/finale`, { ...clone(cla), aggiornataIl: ts(cla.aggiornataIl) });
  await batch.commit();
  return n;
}
