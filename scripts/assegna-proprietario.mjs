/**
 * Assegna il ruolo di PROPRIETARIO della piattaforma a un account (claim `owner`, che solo il server può scrivere).
 *
 *   node scripts/assegna-proprietario.mjs email@esempio.it [--revoca]
 *
 * Serve una chiave di servizio in GOOGLE_APPLICATION_CREDENTIALS (da tenere FUORI dal repository e da cancellare
 * dopo l'uso). Il progetto si legge da VITE_FIREBASE_PROJECT_ID (env o .env.local).
 * Il claim passa nel token al prossimo accesso: l'interessato deve uscire e rientrare.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function envLocale() {
  const f = join(radice, '.env.local');
  const out = {};
  if (!existsSync(f)) return out;
  for (const riga of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !riga.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

const [email, ...opzioni] = process.argv.slice(2);
if (!email || !email.includes('@')) { console.error('Uso: node scripts/assegna-proprietario.mjs email [--revoca]'); process.exit(1); }
const progetto = process.env.VITE_FIREBASE_PROJECT_ID || envLocale().VITE_FIREBASE_PROJECT_ID;
initializeApp({ projectId: progetto, credential: applicationDefault() });

const auth = getAuth();
const utente = await auth.getUserByEmail(email);
const revoca = opzioni.includes('--revoca');
const claims = { ...(utente.customClaims || {}) };
if (revoca) delete claims.owner; else claims.owner = true;
await auth.setCustomUserClaims(utente.uid, claims);
console.log(`${revoca ? 'Revocato' : 'Assegnato'} il ruolo di proprietario a ${email} su ${progetto}. Deve uscire e rientrare per averlo.`);
