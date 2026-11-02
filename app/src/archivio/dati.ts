import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

/** Tipi dei dati di un ARCHIVIO (competizione conclusa importata dalle vecchie app). Vedi scripts/importa. */
export interface Squadra { id: string; nome: string; girone: string; flag?: string }
export interface PartitaGirone { id: string; giornata: number; casa: string; trasferta: string; data?: string; stadio?: string }
export interface Descrittore {
  tipo: string;
  squadre: Squadra[];
  gironi: Record<string, { squadre: string[]; partite: PartitaGirone[] }>;
  regolamento?: { punteggi?: Record<string, unknown>; criteri_spareggio?: string[]; vincitori?: Record<string, string> };
}
export interface Competizione {
  id: string;
  nome: string;
  sport?: string;
  formato: string;
  stato: string;
  archivio?: boolean;
  descrizione?: string;
  dataInizio?: string;
  dataFine?: string;
  numeri?: { partecipanti: number; schede: number };
  descrittore: Descrittore;
}
export interface VoceClassifica {
  sid: string; nickname: string; totale: number; posizione: number; spareggio: number[];
  dettaglio: Record<string, { punti?: number; corretti?: number; totale?: number; corretto?: boolean; dettaglio?: string }>;
}
export interface Esito { gol_casa?: number; gol_trasferta?: number }
export interface PartitaKo extends Esito {
  casa?: string; trasferta?: string; vincitore?: string; modalita?: string;
  rig_casa?: number | null; rig_trasferta?: number | null;
}
export interface Risultati {
  gironi: Record<string, Esito>;
  posizioni_finali_gironi: Record<string, string[]>;
  fase_eliminatoria: Record<string, Record<string, PartitaKo>>;
  capocannoniere_finale?: { primo?: string; secondo?: string; terzo?: string };
  spareggio_terze?: string[];
}
export interface Scheda {
  gironi?: Record<string, { gol_casa?: number; gol_trasferta?: number; segno?: string }>;
  fase_eliminatoria?: Record<string, Record<string, { vincitore?: string; modalita?: string }>>;
  capocannoniere?: { primo?: string; secondo?: string; terzo?: string };
}

export async function elencoCompetizioni(): Promise<Competizione[]> {
  const snap = await getDocs(query(collection(db(), 'competizioni'), where('visibilita', '==', 'pubblica')));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Competizione, 'id'>) }));
}

export async function leggiCompetizione(id: string): Promise<Competizione | null> {
  const s = await getDoc(doc(db(), 'competizioni', id));
  return s.exists() ? { id: s.id, ...(s.data() as Omit<Competizione, 'id'>) } : null;
}

export async function leggiClassifica(id: string): Promise<VoceClassifica[]> {
  const s = await getDoc(doc(db(), 'competizioni', id, 'classifiche', 'finale'));
  return s.exists() ? (s.data().voci as VoceClassifica[]) : [];
}

export async function leggiRisultati(id: string): Promise<Risultati | null> {
  const s = await getDoc(doc(db(), 'competizioni', id, 'risultati', 'ufficiali'));
  return s.exists() ? (s.data() as Risultati) : null;
}

export async function leggiScheda(id: string, sid: string): Promise<Scheda | null> {
  const s = await getDoc(doc(db(), 'competizioni', id, 'schede', `${sid}__principale`));
  return s.exists() ? (s.data().dati as Scheda) : null;
}

// ── Abbinamento tra account e partecipante storico ────────────────────────────

/** sid → uid dell'account che lo ha rivendicato (pubblico: serve a mostrare "già preso"). */
export async function leggiAbbinamenti(id: string): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db(), 'competizioni', id, 'abbinamenti'));
  const out: Record<string, string> = {};
  snap.forEach(d => { out[d.id] = d.data().uid as string; });
  return out;
}

export async function mioAbbinamento(id: string, uid: string): Promise<string | null> {
  const s = await getDoc(doc(db(), 'competizioni', id, 'miei', uid));
  return s.exists() ? (s.data().sid as string) : null;
}

/** Il partecipante storico `sid` sono io: due documenti scritti insieme (o entrambi o nessuno). */
export async function abbinati(id: string, uid: string, sid: string): Promise<void> {
  const b = writeBatch(db());
  b.set(doc(db(), 'competizioni', id, 'abbinamenti', sid), { uid, creataIl: serverTimestamp() });
  b.set(doc(db(), 'competizioni', id, 'miei', uid), { sid, creataIl: serverTimestamp() });
  await b.commit();
}

/** Toglie l'abbinamento (il proprio, o qualunque se si è admin: serve a risolvere i conflitti). */
export async function togliAbbinamento(id: string, uidAccount: string, sid: string): Promise<void> {
  const b = writeBatch(db());
  b.delete(doc(db(), 'competizioni', id, 'abbinamenti', sid));
  b.delete(doc(db(), 'competizioni', id, 'miei', uidAccount));
  await b.commit();
}

/** Sono admin di questa competizione? (proprietario, oppure presente tra gli admin). Solo per mostrare i comandi: la sicurezza è nelle regole. */
export async function sonoAdmin(id: string, uid: string): Promise<boolean> {
  const t = await auth().currentUser?.getIdTokenResult();
  if (t?.claims.owner === true) return true;
  try {
    return (await getDoc(doc(db(), 'competizioni', id, 'admins', uid))).exists();
  } catch {
    return false;
  }
}
