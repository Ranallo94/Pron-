import {
  createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut, type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Nickname: 3-20 caratteri, lettere/numeri/_ . - e spazio, con lettera o numero ad inizio e fine.
 * È un sottoinsieme di ciò che ammettono le regole di Firestore (firebase/firestore.rules).
 */
export const REGEX_NICKNAME = /^[A-Za-z0-9][A-Za-z0-9_. -]{1,18}[A-Za-z0-9]$/;
export const MSG_NICKNAME = 'Da 3 a 20 caratteri: lettere, numeri, spazio e _ . - (iniziare e finire con lettera o numero).';

export type Profilo = { nickname: string; nicknameLower: string; nicknameCambiatoIl?: Date };

/** Traduce gli errori di Firebase in frasi comprensibili. */
export function messaggioErrore(e: unknown): string {
  const codice = (e as { code?: string })?.code ?? '';
  switch (codice) {
    case 'auth/invalid-email': return 'L\'indirizzo email non è valido.';
    case 'auth/email-already-in-use': return 'Esiste già un account con questa email. Prova ad accedere.';
    case 'auth/weak-password': return 'Password troppo debole: servono almeno 8 caratteri.';
    case 'auth/missing-password': return 'Inserisci la password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email o password non corrette.';
    case 'auth/too-many-requests': return 'Troppi tentativi: riprova tra qualche minuto.';
    case 'auth/network-request-failed': return 'Connessione assente o instabile. Riprova.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'Accesso con Google annullato.';
    case 'auth/popup-blocked': return 'Il browser ha bloccato la finestra di Google: consenti i popup per questo sito.';
    case 'auth/requires-recent-login': return 'Per questa operazione devi accedere di nuovo.';
    case 'permission-denied': return 'Operazione non consentita (nickname non disponibile o troppo recente il cambio precedente).';
    default: return 'Qualcosa è andato storto. Riprova tra poco.';
  }
}

export async function registrati(email: string, password: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
  await sendEmailVerification(cred.user);
}

export async function accedi(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email.trim(), password);
}

export async function accediConGoogle(): Promise<void> {
  await signInWithPopup(auth(), new GoogleAuthProvider());
}

export async function reinviaVerifica(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function recuperaPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email.trim());
}

export async function esci(): Promise<void> {
  await signOut(auth());
}

/**
 * Ricarica l'utente e RINNOVA il token: le regole di Firestore leggono `email_verified` dal token,
 * che altrimenti resterebbe "falso" fino alla scadenza (1 ora) anche dopo aver cliccato il link.
 */
export async function aggiornaVerifica(user: User): Promise<boolean> {
  await user.reload();
  if (user.emailVerified) await user.getIdToken(true);
  return user.emailVerified;
}

export async function leggiProfilo(uid: string): Promise<Profilo | null> {
  const snap = await getDoc(doc(db(), 'profili', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    nickname: d.nickname,
    nicknameLower: d.nicknameLower,
    nicknameCambiatoIl: d.nicknameCambiatoIl?.toDate?.(),
  };
}

export async function nicknameLibero(nickname: string): Promise<boolean> {
  const snap = await getDoc(doc(db(), 'nicknames', nickname.toLowerCase()));
  return !snap.exists();
}

/** Crea il profilo con il suo nickname unico (un'unica scrittura: o entrambi o niente). */
export async function creaProfilo(uid: string, nickname: string): Promise<void> {
  const minuscolo = nickname.toLowerCase();
  const b = writeBatch(db());
  b.set(doc(db(), 'nicknames', minuscolo), { uid, creataIl: serverTimestamp() });
  b.set(doc(db(), 'profili', uid), { nickname, nicknameLower: minuscolo, creataIl: serverTimestamp() });
  await b.commit();
}

/** Cambia nickname: libera il vecchio, prende il nuovo e aggiorna il profilo, in un'unica scrittura. */
export async function cambiaNickname(uid: string, vecchioLower: string, nickname: string): Promise<void> {
  const minuscolo = nickname.toLowerCase();
  const b = writeBatch(db());
  if (vecchioLower !== minuscolo) {
    b.delete(doc(db(), 'nicknames', vecchioLower));
    b.set(doc(db(), 'nicknames', minuscolo), { uid, creataIl: serverTimestamp() });
  }
  b.update(doc(db(), 'profili', uid), { nickname, nicknameLower: minuscolo, nicknameCambiatoIl: serverTimestamp() });
  await b.commit();
}

/** Giorni da attendere prima di poter cambiare di nuovo il nickname (0 = subito). */
export function giorniAlCambio(p: Profilo): number {
  if (!p.nicknameCambiatoIl) return 0;
  const scade = p.nicknameCambiatoIl.getTime() + 7 * 86400e3;
  return Math.max(0, Math.ceil((scade - Date.now()) / 86400e3));
}
