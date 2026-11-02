import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Configurazione Firebase: SOLO da variabili d'ambiente (VITE_FIREBASE_*), mai scritta nel codice.
 * Le chiavi web di Firebase non sono segreti, ma restano fuori dal repository per poter cambiare
 * progetto (prova / definitivo) senza toccare il codice. Vedi .env.example.
 */
const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** true solo se tutte le variabili obbligatorie sono presenti. */
export const firebaseConfigurato = Boolean(config.apiKey && config.projectId && config.appId);

let _app: FirebaseApp | null = null;

function app(): FirebaseApp {
  if (!firebaseConfigurato) throw new Error('Firebase non configurato: imposta le variabili VITE_FIREBASE_* in .env.local');
  return (_app ??= initializeApp(config));
}

// Solo in sviluppo e solo se richiesto: collega Auth e Firestore agli emulatori locali (nessun dato vero toccato).
const usaEmulatori = import.meta.env.DEV && env.VITE_USA_EMULATORI === '1';
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function auth(): Auth {
  if (!_auth) {
    _auth = getAuth(app());
    if (usaEmulatori) connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return _auth;
}

export function db(): Firestore {
  if (!_db) {
    _db = getFirestore(app());
    if (usaEmulatori) connectFirestoreEmulator(_db, '127.0.0.1', 8080);
  }
  return _db;
}
