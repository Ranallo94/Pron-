/**
 * Test delle regole di sicurezza di Firestore (firebase/firestore.rules), con l'emulatore.
 *   npm run test:regole
 *
 * Ogni test descrive un comportamento che le regole DEVONO garantire o impedire. Se un test cambia,
 * cambia una promessa fatta agli utenti: va deciso a mano, non "sistemato" per farlo passare.
 */
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore';

let env;
const tra = (ore) => Timestamp.fromDate(new Date(Date.now() + ore * 3600e3));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-prono',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env?.cleanup(); });

// ── Contesti di prova ────────────────────────────────────────────────────
const utente = (uid, claims = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@prova.it`, email_verified: true, ...claims }).firestore();
const nonVerificato = (uid) => utente(uid, { email_verified: false });
const proprietario = () => utente('owner1', { owner: true });
const anonimo = () => env.unauthenticatedContext().firestore();

// ── Dati di partenza (scritti senza passare dalle regole) ────────────────
const compBase = (extra = {}) => ({
  nome: 'GP di prova', categoria: 'sport', sport: 'Formula 1', formato: 'ordinamento',
  stato: 'pronostici_aperti', iscrizione: 'libera', visibilita: 'pubblica',
  descrittore: {}, scadenze: { principale: tra(24) }, creataDa: 'owner1', creataIl: tra(-48),
  ...extra,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const set = (path, dati) => setDoc(doc(db, path), dati);
    // competizioni
    await set('competizioni/f1', compBase());
    await set('competizioni/scaduta', compBase({ scadenze: { principale: tra(-2) } }));
    await set('competizioni/approvazione', compBase({ iscrizione: 'approvazione' }));
    await set('competizioni/privata', compBase({ visibilita: 'su_invito' }));
    await set('competizioni/bozza', compBase({ stato: 'bozza' }));
    await set('competizioni/conclusa', compBase({ stato: 'conclusa', iscrizione: 'libera' }));
    await set('competizioni/chiusa', compBase({ pronosticiAperti: false }));
    await set('competizioni/riaperta', compBase({ scadenze: { principale: tra(-2) }, riaperte: { principale: true } }));
    await set('competizioni/svelata', compBase({ scadenze: { principale: tra(-2) }, svelati: { principale: true } }));
    // archivio (competizione conclusa importata dalle vecchie app): nessuno è iscritto, tutti la leggono
    await set('competizioni/arch', compBase({ stato: 'conclusa', archivio: true, scadenze: { principale: tra(-9000) } }));
    await set('competizioni/arch/admins/adm1', { creataIl: tra(-1) });
    await set('competizioni/arch/storici/s1', { nickname: 'Superfra' });
    await set('competizioni/arch/storici/s2', { nickname: 'Betto' });
    await set('competizioni/arch/schede/s1__principale', { uid: 's1', schedaId: 'principale', dati: { x: 1 }, visibile: true, aggiornatoIl: tra(-9000) });
    // admin e iscrizioni
    await set('competizioni/f1/admins/adm1', { creataIl: tra(-1) });
    for (const c of ['f1', 'scaduta', 'riaperta', 'svelata', 'chiusa', 'privata']) {
      await set(`competizioni/${c}/iscrizioni/ana`, { stato: 'approvato', creataIl: tra(-5) });
    }
    await set('competizioni/f1/iscrizioni/bea', { stato: 'in_attesa', creataIl: tra(-5) });
    await set('competizioni/f1/iscrizioni/carlo', { stato: 'approvato', creataIl: tra(-5) });
    await set('competizioni/svelata/iscrizioni/carlo', { stato: 'approvato', creataIl: tra(-5) });
    // schede
    await set('competizioni/svelata/schede/ana__principale', { uid: 'ana', schedaId: 'principale', dati: { x: 1 }, aggiornatoIl: tra(-3) });
    await set('competizioni/f1/schede/ana__principale', { uid: 'ana', schedaId: 'principale', dati: { x: 1 }, aggiornatoIl: tra(-3) });
    // classifica e risultati
    await set('competizioni/f1/classifiche/pubblica', { righe: [] });
    // leghe
    await set('leghe/privata1', { tipo: 'privata', capitano: 'cap', nome: 'Lega Test', competizioneId: 'f1' });
    await set('leghe/privata1/membri/cap', { ruolo: 'capitano' });
    await set('leghe/privata1/membri/ana', { ruolo: 'membro' });
    await set('leghe/privata1/segreti/invito', { codice: 'ABC123' });
    await set('leghe/privata1/classifica/snapshot', { righe: [] });
    await set('leghe/pubblica1', { tipo: 'pubblica', capitano: 'owner1', nome: 'Pubblica', competizioneId: 'f1' });
    // moderazione, abbonamenti, config
    await set('disabilitati/dis1', { motivo: 'prova' });
    await set('abbonamenti/ana', { piano: 'beta' });
    await set('abbonamenti/bea', { piano: 'beta' });
    await set('config/piattaforma', { piani: { beta: { tutto: true } } });
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('accesso', () => {
  test('anonimo: nessuna lettura e nessuna scrittura', async () => {
    const db = anonimo();
    await assertFails(getDoc(doc(db, 'competizioni/f1')));
    await assertFails(setDoc(doc(db, 'profili/x'), { a: 1 }));
  });

  test('email non verificata: non legge niente', async () => {
    const db = nonVerificato('ana');
    await assertFails(getDoc(doc(db, 'competizioni/f1')));
    await assertFails(getDoc(doc(db, 'profili/ana')));
  });

  test('utente verificato: legge una competizione pubblica e l\'elenco delle pubbliche', async () => {
    const db = utente('zoe');
    await assertSucceeds(getDoc(doc(db, 'competizioni/f1')));
    await assertSucceeds(getDocs(query(collection(db, 'competizioni'), where('visibilita', '==', 'pubblica'))));
  });

  test('utente disabilitato: negato anche in lettura', async () => {
    const db = utente('dis1');
    await assertFails(getDoc(doc(db, 'competizioni/f1')));
  });

  test('l\'elenco delle competizioni senza filtro sulla visibilità è negato', async () => {
    await assertFails(getDocs(collection(utente('zoe'), 'competizioni')));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('profilo e nickname', () => {
  const creaProfilo = (db, uid, nickname) => {
    const b = writeBatch(db);
    b.set(doc(db, 'nicknames', nickname.toLowerCase()), { uid, creataIl: serverTimestamp() });
    b.set(doc(db, 'profili', uid), { nickname, nicknameLower: nickname.toLowerCase(), creataIl: serverTimestamp() });
    return b.commit();
  };

  test('creo il mio profilo insieme al nickname', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
  });

  test('un nickname già preso non si può prendere (anche con maiuscole diverse)', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertFails(creaProfilo(utente('ugo'), 'ugo', 'ZOE_94'));
  });

  test('profilo senza il documento nickname collegato: negato', async () => {
    const db = utente('zoe');
    await assertFails(setDoc(doc(db, 'profili', 'zoe'), { nickname: 'Zoe', nicknameLower: 'zoe', creataIl: serverTimestamp() }));
  });

  test('nickname con caratteri non ammessi o troppo corto: negato', async () => {
    await assertFails(creaProfilo(utente('zoe'), 'zoe', 'Zo'));
    await assertFails(creaProfilo(utente('zoe'), 'zoe', 'Zoe<script>'));
  });

  test('non si crea il profilo di un altro, né un nickname a nome di un altro', async () => {
    const db = utente('zoe');
    const b = writeBatch(db);
    b.set(doc(db, 'nicknames', 'ugo'), { uid: 'ugo', creataIl: serverTimestamp() });
    b.set(doc(db, 'profili', 'ugo'), { nickname: 'Ugo', nicknameLower: 'ugo', creataIl: serverTimestamp() });
    await assertFails(b.commit());
  });

  // Cambio nickname: batch che libera il vecchio, prende il nuovo e aggiorna il profilo
  const cambiaNick = (db, uid, vecchio, nuovo, extra = {}) => {
    const b = writeBatch(db);
    b.delete(doc(db, 'nicknames', vecchio.toLowerCase()));
    b.set(doc(db, 'nicknames', nuovo.toLowerCase()), { uid, creataIl: serverTimestamp() });
    b.update(doc(db, 'profili', uid), {
      nickname: nuovo, nicknameLower: nuovo.toLowerCase(), nicknameCambiatoIl: serverTimestamp(), ...extra,
    });
    return b.commit();
  };

  test('il nickname si cambia (batch completo) e il vecchio si libera', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertSucceeds(cambiaNick(utente('zoe'), 'zoe', 'Zoe_94', 'Zoe_95'));
    await assertSucceeds(creaProfilo(utente('ugo'), 'ugo', 'Zoe_94'));
  });

  test('cambio nickname: non si prende un nickname già usato', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertSucceeds(creaProfilo(utente('ugo'), 'ugo', 'Ugo_1'));
    await assertFails(cambiaNick(utente('zoe'), 'zoe', 'Zoe_94', 'ugo_1'));
  });

  test('cambio nickname: il vecchio deve essere liberato (niente due nickname)', async () => {
    const db = utente('zoe');
    await assertSucceeds(creaProfilo(db, 'zoe', 'Zoe_94'));
    const b = writeBatch(db);
    b.set(doc(db, 'nicknames', 'zoe_95'), { uid: 'zoe', creataIl: serverTimestamp() });
    b.update(doc(db, 'profili', 'zoe'), { nickname: 'Zoe_95', nicknameLower: 'zoe_95', nicknameCambiatoIl: serverTimestamp() });
    await assertFails(b.commit());
  });

  test('si libera un nickname solo se il profilo non lo usa più', async () => {
    const db = utente('zoe');
    await assertSucceeds(creaProfilo(db, 'zoe', 'Zoe_94'));
    await assertFails(deleteDoc(doc(db, 'nicknames', 'zoe_94')));
  });

  test('cambio nickname: al massimo uno ogni 7 giorni', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertSucceeds(cambiaNick(utente('zoe'), 'zoe', 'Zoe_94', 'Zoe_95'));
    await assertFails(cambiaNick(utente('zoe'), 'zoe', 'Zoe_95', 'Zoe_96'));
    // passati 8 giorni dall'ultimo cambio
    await env.withSecurityRulesDisabled(c =>
      updateDoc(doc(c.firestore(), 'profili/zoe'), { nicknameCambiatoIl: tra(-8 * 24) }));
    await assertSucceeds(cambiaNick(utente('zoe'), 'zoe', 'Zoe_95', 'Zoe_96'));
  });

  test('profilo: non si cambia la data di creazione né si aggiungono campi', async () => {
    const db = utente('zoe');
    await assertSucceeds(creaProfilo(db, 'zoe', 'Zoe_94'));
    await assertFails(cambiaNick(db, 'zoe', 'Zoe_94', 'Zoe_95', { creataIl: serverTimestamp() }));
    await assertFails(cambiaNick(db, 'zoe', 'Zoe_94', 'Zoe_95', { admin: true }));
  });

  test('il profilo di un altro non si modifica', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertFails(updateDoc(doc(utente('ugo'), 'profili', 'zoe'), { nickname: 'Hack' }));
  });

  test('i profili sono pubblici per gli utenti attivi', async () => {
    await assertSucceeds(creaProfilo(utente('zoe'), 'zoe', 'Zoe_94'));
    await assertSucceeds(getDoc(doc(utente('ugo'), 'profili', 'zoe')));
    await assertFails(getDoc(doc(anonimo(), 'profili', 'zoe')));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('dati privati dell\'account', () => {
  const base = () => ({ eta14: true, privacyAccettataIl: serverTimestamp(), aggiornatoIl: serverTimestamp() });

  test('creo i miei dati con la dichiarazione dei 14 anni', async () => {
    await assertSucceeds(setDoc(doc(utente('zoe'), 'utenti/zoe'), base()));
  });

  test('senza la dichiarazione dei 14 anni: negato', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'utenti/zoe'), { ...base(), eta14: false }));
  });

  test('non si possono aggiungere campi non previsti (es. il piano)', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'utenti/zoe'), { ...base(), piano: 'pro' }));
  });

  test('i dati di un altro utente non si leggono né si scrivono', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'utenti/ugo'), { eta14: true }));
    await assertFails(getDoc(doc(utente('zoe'), 'utenti/ugo')));
    await assertFails(setDoc(doc(utente('zoe'), 'utenti/ugo'), base()));
  });

  test('la data di accettazione della privacy non si riscrive', async () => {
    const db = utente('zoe');
    await assertSucceeds(setDoc(doc(db, 'utenti/zoe'), base()));
    await assertFails(updateDoc(doc(db, 'utenti/zoe'), { privacyAccettataIl: serverTimestamp(), aggiornatoIl: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, 'utenti/zoe'), { lingua: 'it', aggiornatoIl: serverTimestamp() }));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('competizioni', () => {
  const nuova = () => ({ ...compBase(), creataDa: 'owner1', creataIl: serverTimestamp() });

  test('solo il proprietario crea una competizione', async () => {
    await assertSucceeds(setDoc(doc(proprietario(), 'competizioni/nuova'), nuova()));
    // documento diverso: altrimenti sarebbe un aggiornamento e non proverebbe la regola di creazione
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/altra'), { ...nuova(), creataDa: 'zoe' }));
  });

  test('una competizione con dati non validi è rifiutata', async () => {
    await assertFails(setDoc(doc(proprietario(), 'competizioni/x'), { ...nuova(), stato: 'inventato' }));
    await assertFails(setDoc(doc(proprietario(), 'competizioni/x'), { ...nuova(), formato: 'boh' }));
    await assertFails(setDoc(doc(proprietario(), 'competizioni/x'), { ...nuova(), nome: 'A' }));
  });

  test('su invito richiede l\'approvazione: altrimenti basterebbe conoscerne l\'indirizzo', async () => {
    await assertSucceeds(setDoc(doc(proprietario(), 'competizioni/inv1'),
      { ...nuova(), visibilita: 'su_invito', iscrizione: 'approvazione' }));
    await assertFails(setDoc(doc(proprietario(), 'competizioni/inv2'),
      { ...nuova(), visibilita: 'su_invito', iscrizione: 'libera' }));
  });

  test('l\'admin di competizione la modifica, ma non cambia chi l\'ha creata', async () => {
    const db = utente('adm1');
    await assertSucceeds(updateDoc(doc(db, 'competizioni/f1'), { stato: 'in_corso' }));
    await assertFails(updateDoc(doc(db, 'competizioni/f1'), { creataDa: 'adm1' }));
    await assertFails(updateDoc(doc(db, 'competizioni/f1'), { creataIl: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'competizioni/f1'), { stato: 'inventato' }));
  });

  test('un utente comune non modifica una competizione', async () => {
    await assertFails(updateDoc(doc(utente('ana'), 'competizioni/f1'), { stato: 'conclusa' }));
  });

  test('l\'admin di una competizione non può modificarne un\'altra', async () => {
    await assertFails(updateDoc(doc(utente('adm1'), 'competizioni/approvazione'), { stato: 'conclusa' }));
  });

  test('competizione su invito: la leggono solo iscritti e admin', async () => {
    await assertFails(getDoc(doc(utente('zoe'), 'competizioni/privata')));
    await assertSucceeds(getDoc(doc(utente('ana'), 'competizioni/privata')));
  });

  test('gli admin di competizione li nomina solo il proprietario', async () => {
    await assertFails(setDoc(doc(utente('adm1'), 'competizioni/f1/admins/zoe'), { creataIl: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(proprietario(), 'competizioni/f1/admins/zoe'), { creataIl: serverTimestamp() }));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('iscrizioni', () => {
  const crea = (db, comp, uid, stato) =>
    setDoc(doc(db, `competizioni/${comp}/iscrizioni/${uid}`), { stato, creataIl: serverTimestamp() });

  test('iscrizione libera: nasce già approvata', async () => {
    await assertSucceeds(crea(utente('zoe'), 'f1', 'zoe', 'approvato'));
  });

  test('iscrizione libera: lo stato "in attesa" non è coerente e viene rifiutato', async () => {
    await assertFails(crea(utente('zoe'), 'f1', 'zoe', 'in_attesa'));
  });

  test('iscrizione con approvazione: nasce in attesa e non ci si auto-approva', async () => {
    await assertSucceeds(crea(utente('zoe'), 'approvazione', 'zoe', 'in_attesa'));
    await assertFails(crea(utente('ugo'), 'approvazione', 'ugo', 'approvato'));
  });

  test('non ci si iscrive a competizioni in bozza o concluse', async () => {
    await assertFails(crea(utente('zoe'), 'bozza', 'zoe', 'approvato'));
    await assertFails(crea(utente('zoe'), 'conclusa', 'zoe', 'approvato'));
  });

  test('non si iscrive un altro utente', async () => {
    await assertFails(crea(utente('zoe'), 'f1', 'ugo', 'approvato'));
  });

  test('email non verificata: nessuna iscrizione', async () => {
    await assertFails(crea(nonVerificato('zoe'), 'f1', 'zoe', 'approvato'));
  });

  test('l\'admin approva; l\'utente non cambia il proprio stato', async () => {
    await assertSucceeds(updateDoc(doc(utente('adm1'), 'competizioni/f1/iscrizioni/bea'), { stato: 'approvato', decisoIl: serverTimestamp() }));
    await assertFails(updateDoc(doc(utente('bea'), 'competizioni/f1/iscrizioni/bea'), { stato: 'approvato' }));
  });

  test('si legge la propria iscrizione, non quelle degli altri; l\'admin le legge tutte', async () => {
    await assertSucceeds(getDoc(doc(utente('ana'), 'competizioni/f1/iscrizioni/ana')));
    await assertFails(getDoc(doc(utente('ana'), 'competizioni/f1/iscrizioni/bea')));
    await assertSucceeds(getDocs(collection(utente('adm1'), 'competizioni/f1/iscrizioni')));
    await assertFails(getDocs(collection(utente('ana'), 'competizioni/f1/iscrizioni')));
  });

  test('ci si può cancellare dalla propria iscrizione, non da quella di un altro', async () => {
    await assertSucceeds(deleteDoc(doc(utente('ana'), 'competizioni/f1/iscrizioni/ana')));
    await assertFails(deleteDoc(doc(utente('ana'), 'competizioni/f1/iscrizioni/carlo')));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('schede di pronostico', () => {
  const scheda = (db, comp, uid, dati = { ordine: ['p1', 'p2'] }, extra = {}) =>
    setDoc(doc(db, `competizioni/${comp}/schede/${uid}__principale`), {
      uid, schedaId: 'principale', dati, visibile: false, aggiornatoIl: serverTimestamp(), ...extra,
    });

  test('un iscritto scrive la propria scheda prima della scadenza', async () => {
    await assertSucceeds(scheda(utente('ana'), 'f1', 'ana'));
  });

  test('dopo la scadenza la scheda si blocca', async () => {
    await assertFails(scheda(utente('ana'), 'scaduta', 'ana'));
  });

  test('dopo la scadenza ma con riapertura esplicita dell\'admin: si può scrivere', async () => {
    await assertSucceeds(scheda(utente('ana'), 'riaperta', 'ana'));
  });

  test('interruttore generale spento: nessuna scrittura anche prima della scadenza', async () => {
    await assertFails(scheda(utente('ana'), 'chiusa', 'ana'));
  });

  test('chi è in attesa di approvazione non scrive', async () => {
    await assertFails(scheda(utente('bea'), 'f1', 'bea'));
  });

  test('chi non è iscritto non scrive', async () => {
    await assertFails(scheda(utente('zoe'), 'f1', 'zoe'));
  });

  test('non si scrive la scheda di un altro', async () => {
    await assertFails(scheda(utente('ana'), 'f1', 'carlo'));
  });

  test('forma non valida: campi extra, uid diverso o data non del server', async () => {
    const db = utente('ana');
    await assertFails(scheda(db, 'f1', 'ana', { a: 1 }, { punti: 999 }));
    await assertFails(scheda(db, 'f1', 'ana', { a: 1 }, { uid: 'carlo' }));
    await assertFails(scheda(db, 'f1', 'ana', { a: 1 }, { aggiornatoIl: Timestamp.fromDate(new Date('2020-01-01')) }));
    await assertFails(scheda(db, 'f1', 'ana', 'non-una-mappa'));
  });

  test('una scheda senza scadenza definita non si scrive', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/f1'), compBase({ scadenze: {} })));
    await assertFails(scheda(utente('ana'), 'f1', 'ana'));
  });

  test('visibile deve essere un booleano', async () => {
    await assertFails(scheda(utente('ana'), 'f1', 'ana', { a: 1 }, { visibile: 'si' }));
  });

  test('lettura: la mia sì, quella di un altro no (default privata) prima della scadenza', async () => {
    await assertSucceeds(getDoc(doc(utente('ana'), 'competizioni/f1/schede/ana__principale')));
    await assertFails(getDoc(doc(utente('carlo'), 'competizioni/f1/schede/ana__principale')));
  });

  test('se il giocatore la rende visibile, gli iscritti la leggono prima della scadenza; non gli estranei', async () => {
    await assertSucceeds(scheda(utente('ana'), 'f1', 'ana', { a: 1 }, { visibile: true }));
    await assertSucceeds(getDoc(doc(utente('carlo'), 'competizioni/f1/schede/ana__principale')));
    await assertFails(getDoc(doc(utente('zoe'), 'competizioni/f1/schede/ana__principale')));
    await assertSucceeds(scheda(utente('ana'), 'f1', 'ana', { a: 1 }, { visibile: false }));
    await assertFails(getDoc(doc(utente('carlo'), 'competizioni/f1/schede/ana__principale')));
  });

  test('alla scadenza tutto si svela da solo, anche se il giocatore la voleva nascosta', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/f1'), compBase({ scadenze: { principale: tra(-1) } })));
    await assertSucceeds(getDoc(doc(utente('carlo'), 'competizioni/f1/schede/ana__principale')));
    await assertFails(getDoc(doc(utente('zoe'), 'competizioni/f1/schede/ana__principale')));
  });

  test('scheda riaperta dall\'admin dopo la scadenza: resta nascosta finché non si richiude', async () => {
    await env.withSecurityRulesDisabled(async c => {
      const db = c.firestore();
      await setDoc(doc(db, 'competizioni/riaperta/iscrizioni/carlo'), { stato: 'approvato', creataIl: tra(-5) });
      await setDoc(doc(db, 'competizioni/riaperta/schede/ana__principale'),
        { uid: 'ana', schedaId: 'principale', dati: { x: 1 }, visibile: false, aggiornatoIl: tra(-3) });
    });
    await assertFails(getDoc(doc(utente('carlo'), 'competizioni/riaperta/schede/ana__principale')));
    await assertSucceeds(getDoc(doc(utente('ana'), 'competizioni/riaperta/schede/ana__principale')));
  });

  test('scheda svelata in anticipo dall\'admin: la leggono tutti gli iscritti', async () => {
    await assertSucceeds(getDoc(doc(utente('carlo'), 'competizioni/svelata/schede/ana__principale')));
  });

  test('l\'admin legge e corregge le schede, anche dopo la scadenza', async () => {
    await assertSucceeds(getDoc(doc(utente('adm1'), 'competizioni/f1/schede/ana__principale')));
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/f1/admins/adm2'), { creataIl: tra(-1) }));
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/f1'), compBase({ scadenze: { principale: tra(-2) } })));
    await assertSucceeds(scheda(utente('adm1'), 'f1', 'ana'));
    await assertFails(scheda(utente('carlo'), 'f1', 'ana'));
  });

  test('si cancella la propria scheda solo se è ancora aperta', async () => {
    await assertSucceeds(deleteDoc(doc(utente('ana'), 'competizioni/f1/schede/ana__principale')));
    await assertFails(deleteDoc(doc(utente('ana'), 'competizioni/svelata/schede/ana__principale')));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('risultati e classifiche', () => {
  const ris = () => ({ dati: { arrivo: ['p1'] }, aggiornatoIl: serverTimestamp() });

  test('i risultati li scrive l\'admin della competizione (o il proprietario), non gli utenti', async () => {
    await assertSucceeds(setDoc(doc(utente('adm1'), 'competizioni/f1/risultati/ufficiali'), ris()));
    await assertSucceeds(setDoc(doc(proprietario(), 'competizioni/f1/risultati/ufficiali'), ris()));
    await assertFails(setDoc(doc(utente('ana'), 'competizioni/f1/risultati/ufficiali'), ris()));
  });

  test('i risultati sono leggibili dagli utenti attivi', async () => {
    await assertSucceeds(getDoc(doc(utente('zoe'), 'competizioni/f1/risultati/ufficiali')));
    await assertFails(getDoc(doc(anonimo(), 'competizioni/f1/risultati/ufficiali')));
  });

  test('le classifiche si leggono ma non le scrive nessun client, nemmeno il proprietario', async () => {
    await assertSucceeds(getDoc(doc(utente('zoe'), 'competizioni/f1/classifiche/pubblica')));
    await assertFails(setDoc(doc(proprietario(), 'competizioni/f1/classifiche/pubblica'), { righe: [{ uid: 'ana', punti: 999 }] }));
    await assertFails(setDoc(doc(utente('adm1'), 'competizioni/f1/classifiche/pubblica'), { righe: [] }));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('leghe', () => {
  test('una lega privata la leggono solo i suoi membri; la pubblica tutti', async () => {
    await assertSucceeds(getDoc(doc(utente('ana'), 'leghe/privata1')));
    await assertFails(getDoc(doc(utente('zoe'), 'leghe/privata1')));
    await assertSucceeds(getDoc(doc(utente('zoe'), 'leghe/pubblica1')));
  });

  test('membri e classifica di una lega privata: solo per i membri', async () => {
    await assertSucceeds(getDoc(doc(utente('ana'), 'leghe/privata1/membri/cap')));
    await assertSucceeds(getDoc(doc(utente('ana'), 'leghe/privata1/classifica/snapshot')));
    await assertFails(getDoc(doc(utente('zoe'), 'leghe/privata1/membri/cap')));
    await assertFails(getDoc(doc(utente('zoe'), 'leghe/privata1/classifica/snapshot')));
  });

  test('il codice di invito lo legge solo il capitano', async () => {
    await assertSucceeds(getDoc(doc(utente('cap'), 'leghe/privata1/segreti/invito')));
    await assertFails(getDoc(doc(utente('ana'), 'leghe/privata1/segreti/invito')));
  });

  test('il capitano rinomina la lega ma non cambia altro', async () => {
    await assertSucceeds(updateDoc(doc(utente('cap'), 'leghe/privata1'), { nome: 'Nuovo nome' }));
    await assertFails(updateDoc(doc(utente('cap'), 'leghe/privata1'), { capitano: 'cap2' }));
    await assertFails(updateDoc(doc(utente('cap'), 'leghe/privata1'), { tipo: 'pubblica' }));
    await assertFails(updateDoc(doc(utente('ana'), 'leghe/privata1'), { nome: 'Dirottata' }));
  });

  test('nessun client crea leghe né si aggiunge ai membri da solo', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'leghe/mia'), { tipo: 'privata', capitano: 'zoe', nome: 'Mia' }));
    await assertFails(setDoc(doc(utente('zoe'), 'leghe/privata1/membri/zoe'), { ruolo: 'membro' }));
    await assertFails(setDoc(doc(proprietario(), 'leghe/privata1/classifica/snapshot'), { righe: [] }));
  });

  test('l\'elenco delle leghe senza filtro sul tipo è negato', async () => {
    await assertFails(getDocs(collection(utente('zoe'), 'leghe')));
    await assertSucceeds(getDocs(query(collection(utente('zoe'), 'leghe'), where('tipo', '==', 'pubblica'))));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('configurazione, abbonamenti e zone riservate', () => {
  test('la configurazione si legge ma non si scrive dai client', async () => {
    await assertSucceeds(getDoc(doc(utente('zoe'), 'config/piattaforma')));
    await assertFails(setDoc(doc(proprietario(), 'config/piattaforma'), { piani: {} }));
  });

  test('il piano lo legge solo l\'interessato e non lo scrive nessun client', async () => {
    await assertSucceeds(getDoc(doc(utente('ana'), 'abbonamenti/ana')));
    await assertFails(getDoc(doc(utente('ana'), 'abbonamenti/bea')));
    await assertFails(setDoc(doc(utente('ana'), 'abbonamenti/ana'), { piano: 'pro' }));
    await assertFails(updateDoc(doc(utente('ana'), 'abbonamenti/ana'), { piano: 'pro' }));
  });

  test('disabilitati e statistiche sono invisibili e non scrivibili, anche dal proprietario', async () => {
    await assertFails(getDoc(doc(utente('ana'), 'disabilitati/dis1')));
    await assertFails(setDoc(doc(proprietario(), 'disabilitati/ana'), { motivo: 'x' }));
    await assertFails(setDoc(doc(utente('ana'), 'statistiche/uso'), { n: 1 }));
  });

  test('le collezioni non previste sono negate', async () => {
    await assertFails(getDoc(doc(utente('ana'), 'qualunque/cosa')));
    await assertFails(setDoc(doc(proprietario(), 'qualunque/cosa'), { a: 1 }));
  });

  test('un utente non può darsi il ruolo di proprietario scrivendo dati', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/f1/admins/zoe'), { creataIl: serverTimestamp() }));
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/mia'), { ...compBase(), creataDa: 'zoe', creataIl: serverTimestamp() }));
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('archivi: partecipanti storici e abbinamento', () => {
  const abbina = (db, uid, sid, comp = 'arch') => {
    const b = writeBatch(db);
    b.set(doc(db, `competizioni/${comp}/abbinamenti/${sid}`), { uid, creataIl: serverTimestamp() });
    b.set(doc(db, `competizioni/${comp}/miei/${uid}`), { sid, creataIl: serverTimestamp() });
    return b.commit();
  };

  test('un archivio lo leggono tutti gli utenti attivi, anche non iscritti: schede e storici', async () => {
    await assertSucceeds(getDoc(doc(utente('zoe'), 'competizioni/arch/schede/s1__principale')));
    await assertSucceeds(getDoc(doc(utente('zoe'), 'competizioni/arch/storici/s1')));
    await assertFails(getDoc(doc(anonimo(), 'competizioni/arch/schede/s1__principale')));
    await assertFails(getDoc(doc(nonVerificato('zoe'), 'competizioni/arch/schede/s1__principale')));
  });

  test('una competizione normale non diventa leggibile da tutti', async () => {
    await assertFails(getDoc(doc(utente('zoe'), 'competizioni/f1/schede/ana__principale')));
  });

  test('i client non scrivono né partecipanti storici né schede dell\'archivio', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/arch/storici/s9'), { nickname: 'Falso' }));
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/arch/schede/s1__principale'),
      { uid: 'zoe', schedaId: 'principale', dati: {}, visibile: true, aggiornatoIl: serverTimestamp() }));
  });

  test('ognuno si abbina a un partecipante storico (coppia di documenti in batch)', async () => {
    await assertSucceeds(abbina(utente('zoe'), 'zoe', 's1'));
    await assertSucceeds(getDoc(doc(utente('ugo'), 'competizioni/arch/abbinamenti/s1')));
  });

  test('un partecipante storico si abbina a un solo account (primo arrivato)', async () => {
    await assertSucceeds(abbina(utente('zoe'), 'zoe', 's1'));
    await assertFails(abbina(utente('ugo'), 'ugo', 's1'));
  });

  test('un account si abbina a un solo partecipante, finché non toglie il primo', async () => {
    const db = utente('zoe');
    await assertSucceeds(abbina(db, 'zoe', 's1'));
    await assertFails(abbina(db, 'zoe', 's2'));
    const b = writeBatch(db);
    b.delete(doc(db, 'competizioni/arch/abbinamenti/s1'));
    b.delete(doc(db, 'competizioni/arch/miei/zoe'));
    await assertSucceeds(b.commit());
    await assertSucceeds(abbina(db, 'zoe', 's2'));
  });

  test('non ci si abbina a nome di un altro, né a un partecipante inesistente', async () => {
    await assertFails(abbina(utente('zoe'), 'ugo', 's1'));
    await assertFails(abbina(utente('zoe'), 'zoe', 'inventato'));
  });

  test('abbinamento solo negli archivi', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/f1/storici/s1'), { nickname: 'X' }));
    await assertFails(abbina(utente('zoe'), 'zoe', 's1', 'f1'));
  });

  test('un solo documento della coppia non basta', async () => {
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/arch/abbinamenti/s1'), { uid: 'zoe', creataIl: serverTimestamp() }));
    await assertFails(setDoc(doc(utente('zoe'), 'competizioni/arch/miei/zoe'), { sid: 's1', creataIl: serverTimestamp() }));
  });

  test('il mio abbinamento lo vedo io e l\'admin, non gli altri; l\'elenco chi-è-chi è pubblico', async () => {
    await assertSucceeds(abbina(utente('zoe'), 'zoe', 's1'));
    await assertSucceeds(getDoc(doc(utente('zoe'), 'competizioni/arch/miei/zoe')));
    await assertSucceeds(getDoc(doc(utente('adm1'), 'competizioni/arch/miei/zoe')));
    await assertFails(getDoc(doc(utente('ugo'), 'competizioni/arch/miei/zoe')));
  });

  test('conflitto: l\'admin riassegna o toglie; un altro utente no', async () => {
    await assertSucceeds(abbina(utente('zoe'), 'zoe', 's1'));
    await assertFails(deleteDoc(doc(utente('ugo'), 'competizioni/arch/abbinamenti/s1')));
    const adm = utente('adm1');
    const b = writeBatch(adm);
    b.set(doc(adm, 'competizioni/arch/abbinamenti/s1'), { uid: 'ugo', creataIl: serverTimestamp() });
    b.set(doc(adm, 'competizioni/arch/miei/ugo'), { sid: 's1', creataIl: serverTimestamp() });
    b.delete(doc(adm, 'competizioni/arch/miei/zoe'));
    await assertSucceeds(b.commit());
  });

  test('l\'admin di un\'altra competizione non tocca gli abbinamenti', async () => {
    await assertSucceeds(abbina(utente('zoe'), 'zoe', 's1'));
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'competizioni/arch/abbinamenti/s2'), { uid: 'ugo', creataIl: tra(-1) }));
    await assertFails(setDoc(doc(utente('adm2x'), 'competizioni/arch/abbinamenti/s2'), { uid: 'zoe', creataIl: serverTimestamp() }));
  });
});
