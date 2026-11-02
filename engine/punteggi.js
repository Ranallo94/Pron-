/**
 * engine/punteggi.js
 *
 * Motore punteggi — generico, interprete del "descrittore di torneo"
 * (vedi ../schema-dati.md §2, §7 nello SPEC_FASE_A_GIRONI originale).
 * Funzioni pure: (pronostico, risultato, ...) -> { totale, breakdown/dettaglio }.
 * Nessuna dipendenza da Firebase: stesso modulo lato client e Cloud Functions
 * (evita la duplicazione client/server già nota come problema in Wimbledino).
 */

import { calcolaPunteggioOrdinamento } from './ordinamenti.js';
import { calcolaPunteggioBonus } from './bonus.js';
import { calcolaPunteggioBracketTurni } from './ko.js';

function segnoDa(valoreCasa, valoreTrasferta) {
  if (!Number.isFinite(valoreCasa) || !Number.isFinite(valoreTrasferta)) return null;
  if (valoreCasa > valoreTrasferta) return '1';
  if (valoreCasa < valoreTrasferta) return '2';
  return 'X';
}

/**
 * Punteggio della fase a gironi, livello "partita" (schema-dati.md §3, §3.1).
 * Il bonus "risultato esatto" è annidato: si assegna solo se il segno è già
 * corretto (§3.2), mai come voce indipendente.
 *
 * @param {Record<string,{valoreCasa:number,valoreTrasferta:number}>} pronosticoGironi
 * @param {Record<string,{valoreCasa:number,valoreTrasferta:number}>} risultatoGironi
 *   solo le partite già concluse contano (le altre vengono ignorate, non a 0 "sbagliato")
 * @param {{segnoCorretto:number, risultatoEsatto:number}} tabellaPuntiGironi
 */
export function calcolaPunteggioPartiteGironi(pronosticoGironi, risultatoGironi, tabellaPuntiGironi) {
  let totale = 0;
  const dettaglio = {};

  for (const [partitaId, ris] of Object.entries(risultatoGironi || {})) {
    if (!Number.isFinite(ris.valoreCasa) || !Number.isFinite(ris.valoreTrasferta)) continue;

    const pron = (pronosticoGironi || {})[partitaId];
    const segnoReale = segnoDa(ris.valoreCasa, ris.valoreTrasferta);

    let punti = 0;
    let segnoOk = false;
    let esattoOk = false;

    if (pron && Number.isFinite(pron.valoreCasa) && Number.isFinite(pron.valoreTrasferta)) {
      segnoOk = segnoDa(pron.valoreCasa, pron.valoreTrasferta) === segnoReale;
      if (segnoOk) {
        punti += tabellaPuntiGironi.segnoCorretto || 0;
        esattoOk = pron.valoreCasa === ris.valoreCasa && pron.valoreTrasferta === ris.valoreTrasferta;
        if (esattoOk) punti += tabellaPuntiGironi.risultatoEsatto || 0;
      }
    }

    dettaglio[partitaId] = { punti, segnoOk, esattoOk };
    totale += punti;
  }

  return { totale, dettaglio };
}

/**
 * Punteggio "qualificazione": punti fissi per ogni squadra pronosticata come
 * qualificata che lo è davvero, indipendentemente dallo slot (schema-dati.md §7).
 */
export function calcolaPunteggioQualificazione(qualificatePronosticate, qualificateReali, puntiPerSquadra) {
  const reali = new Set(qualificateReali || []);
  const squadre = (qualificatePronosticate || []).filter(id => reali.has(id));
  return { totale: squadre.length * (puntiPerSquadra || 0), squadre };
}

/**
 * Punteggio "posto in griglia": punti per ogni slot del bracket in cui la
 * squadra pronosticata coincide con quella reale. Gate esplicito: se
 * `bracketReale` è null/undefined (classifiche non ancora congelate, vedi
 * schema-dati.md §3.4), la voce vale 0 — non è un effetto collaterale.
 */
export function calcolaPunteggioPostoGriglia(bracketPronosticato, bracketReale, puntiPerSlot) {
  if (!bracketReale) return { totale: 0, slotCorretti: [] };
  const slotCorretti = [];
  for (const [slotId, squadraReale] of Object.entries(bracketReale)) {
    if (squadraReale && bracketPronosticato && bracketPronosticato[slotId] === squadraReale) {
      slotCorretti.push(slotId);
    }
  }
  return { totale: slotCorretti.length * (puntiPerSlot || 0), slotCorretti };
}

/**
 * Punteggio del bracket KO, "per squadra/giocatore" (forgiving): conta chi
 * avanza turno per turno, non l'esatto accoppiamento — stesso principio già
 * validato in Wimbledino (vedi wimbledino-stato-progetto in memoria).
 *
 * @param {string[][]} vincitoriPronosticatiPerTurno  array per turno di squadraId
 * @param {string[][]} vincitoriRealiPerTurno
 * @param {{esiti:number[]}} tabellaPuntiBracket  punti per turno superato, indice = turno
 */
export function calcolaPunteggioBracketKO(vincitoriPronosticatiPerTurno, vincitoriRealiPerTurno, tabellaPuntiBracket) {
  let totale = 0;
  const perTurno = [];
  const nTurni = Math.max(vincitoriPronosticatiPerTurno.length, vincitoriRealiPerTurno.length);

  for (let turno = 0; turno < nTurni; turno++) {
    const pronosticati = new Set(vincitoriPronosticatiPerTurno[turno] || []);
    const reali = vincitoriRealiPerTurno[turno] || [];
    const indovinati = reali.filter(id => pronosticati.has(id)).length;
    const puntiPerSquadra = (tabellaPuntiBracket.esiti || [])[turno] || 0;
    const punti = indovinati * puntiPerSquadra;
    perTurno.push({ turno, indovinati, punti });
    totale += punti;
  }

  return { totale, perTurno };
}

/**
 * Combina tutte le voci applicabili secondo il descrittore di torneo.
 * Ogni voce è opzionale: un torneo solo-bracket (es. tennis) non avrà `gironi`
 * nel descrittore, un torneo solo-gironi non avrà `bracket`.
 *
 * Voci supportate (tutte guidate dal descrittore, nessun codice per sport):
 *   • gironi          → partite (segno + esatto annidato), qualificazione, posto in griglia
 *   • bracket         → forma "turni" (array di array, solo esiti) oppure forma
 *                       documento `bracketDoc` (esiti + dettaglio annidato, es. set)
 *   • ordinamenti     → una o più sessioni a ordinamento (F1: qualifiche/gara/sprint,
 *                       classifica a fasce…), vedi ordinamenti.js
 *   • bonus           → bonus a indovinello (bonus.js)
 *
 * Le forme attese di `risultato`/`pronostico` sono già "piatte" (adattate
 * dai documenti Firestore con gli adapter di bracket.js), non i documenti
 * grezzi — questa funzione non parla con Firestore.
 *
 * Ritorna anche `contatori` (indovinati per voce) e `spareggio`, se il
 * descrittore dichiara in `spareggio` quali contatori usare e in che ordine.
 */
export function calcolaPunteggioTotale({ pronostico, risultato, descrittoreTorneo }) {
  const breakdown = {};
  const contatori = {};
  let totale = 0;

  const tp = descrittoreTorneo.tabellaPunti || {};

  for (const [sessione, regole] of Object.entries(tp.ordinamenti || {})) {
    const reale = risultato.ordinamenti?.[sessione];
    if (!reale) continue;                                   // sessione non ancora disputata
    const r = calcolaPunteggioOrdinamento(pronostico.ordinamenti?.[sessione], reale, regole);
    breakdown[sessione] = r;
    contatori[sessione] = { ...r.contatori, vincitoreOk: r.vincitoreOk };
    totale += r.totale;
  }

  if (tp.bonus && risultato.bonus) {
    const r = calcolaPunteggioBonus(pronostico.bonus, risultato.bonus, tp.bonus);
    breakdown.bonus = r;
    contatori.bonus = { indovinati: r.indovinati };
    totale += r.totale;
  }

  if (descrittoreTorneo.bracket?.dimensione && risultato.bracketDoc) {
    const r = calcolaPunteggioBracketTurni(pronostico.bracketDoc, risultato.bracketDoc, tp.bracket || {}, {
      dimensione: descrittoreTorneo.bracket.dimensione,
      annullati: risultato.annullati,
    });
    breakdown.bracketDoc = r;
    contatori.bracketDoc = { indovinatiPerTurno: r.indovinatiPerTurno, dettagliEsatti: r.dettagliEsatti };
    totale += r.totale;
  }

  if (descrittoreTorneo.gironi && risultato.gironi) {
    const r = calcolaPunteggioPartiteGironi(pronostico.gironi, risultato.gironi, tp.gironi || {});
    breakdown.gironi = r;
    const partite = Object.values(r.dettaglio);
    contatori.gironi = { segniOk: partite.filter(p => p.segnoOk).length, esattiOk: partite.filter(p => p.esattoOk).length };
    totale += r.totale;
  }

  if (descrittoreTorneo.gironi && risultato.qualificateReali) {
    const r = calcolaPunteggioQualificazione(pronostico.qualificate, risultato.qualificateReali, tp.gironi?.qualificazione);
    breakdown.qualificazione = r;
    totale += r.totale;
  }

  if (descrittoreTorneo.bracket && 'postiGriglia' in risultato) {
    const r = calcolaPunteggioPostoGriglia(pronostico.postiGriglia, risultato.postiGriglia, tp.gironi?.postoInGriglia);
    breakdown.postoInGriglia = r;
    totale += r.totale;
  }

  if (descrittoreTorneo.bracket && risultato.vincitoriPerTurno) {
    const r = calcolaPunteggioBracketKO(pronostico.vincitoriPerTurno || [], risultato.vincitoriPerTurno, tp.bracket || {});
    breakdown.bracket = r;
    totale += r.totale;
  }

  return { totale, breakdown, contatori, spareggio: costruisciSpareggio(descrittoreTorneo.spareggio, contatori) };
}

/**
 * Spareggio tra partecipanti: elenco ordinato di contatori. Nel descrittore
 * ogni voce è un percorso dentro `contatori`, es. 'gara.vincitoreOk',
 * 'qualifica.esatte', 'bonus.indovinati', 'bracketDoc.indovinatiPerTurno.0'
 * (l'ultimo segmento numerico indica l'indice in un array). Valori booleani
 * → 1/0; percorso assente → 0.
 */
function costruisciSpareggio(percorsi, contatori) {
  return (percorsi || []).map(p => {
    let v = contatori;
    for (const k of p.split('.')) v = v == null ? undefined : v[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (Number.isFinite(v) ? v : 0);
  });
}
