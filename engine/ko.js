/**
 * engine/ko.js
 *
 * Tabellone a eliminazione diretta, in forma documento (la stessa dei
 * satelliti tennis Wimbledino/Medusino):
 *
 *   { [roundId]: { [matchId]: { vincitore: <id>, dettaglio?: <es. "3-1">, manuale?: true } } }
 *
 * - Struttura: dimensione (numero di partecipanti, potenza di 2) → turni
 *   R128, R64, R32, R16, QF, SF, F (solo quelli necessari).
 * - Punteggio "per giocatore" (forgiving): per ogni turno conta QUALI
 *   giocatori hai dato come vincitori e che hanno davvero vinto in quel turno,
 *   a prescindere dall'avversario; il bonus dettaglio (es. numero di set) vale
 *   solo se anche il vincitore è giusto (bonus annidato).
 * - Propagazione: dagli esiti reali (pool) e dagli override manuali ricava i
 *   vincitori turno per turno; un override manuale non viene mai sovrascritto.
 *
 * Funzioni pure, nessuna dipendenza da Firebase né dallo sport.
 */

const NOME_TURNO = { 2: 'F', 4: 'SF', 8: 'QF', 16: 'R16', 32: 'R32', 64: 'R64', 128: 'R128', 256: 'R256' };

/**
 * @param {number} dimensione  numero di partecipanti (2, 4, 8 … 256)
 * @returns {Array<{id:string, matches:number}>} dal primo turno alla finale
 */
export function turniKO(dimensione) {
  if (!Number.isInteger(dimensione) || dimensione < 2 || dimensione > 256 || (dimensione & (dimensione - 1)) !== 0) {
    throw new Error(`dimensione tabellone non valida: ${dimensione} (serve una potenza di 2 tra 2 e 256)`);
  }
  const turni = [];
  for (let n = dimensione; n >= 2; n /= 2) turni.push({ id: NOME_TURNO[n], matches: n / 2 });
  return turni;
}

/** ID match: ('R64', 0) → "R64_01" (indice 0-based → numero 1-based). */
export function idMatch(roundId, indice) {
  return `${roundId}_${String(indice + 1).padStart(2, '0')}`;
}

/** Chiave del pool di esiti: indipendente dall'ordine dei due giocatori. */
export function chiavePool(a, b) {
  return [a, b].sort().join('|');
}

/**
 * I due match del turno precedente che alimentano (roundId, indice); null al primo turno.
 */
export function alimentatori(turni, roundId, indice) {
  const ri = turni.findIndex(t => t.id === roundId);
  if (ri <= 0) return null;
  const prev = turni[ri - 1].id;
  return { turnoPrecedente: prev, a: idMatch(prev, indice * 2), b: idMatch(prev, indice * 2 + 1) };
}

/**
 * I due giocatori di un match secondo un documento bracket: al primo turno
 * dal sorteggio, dopo dai vincitori dei due match alimentatori.
 *
 * @param {Array<{id:string}>} turni
 * @param {Array<{a:string|null,b:string|null}>} primoTurno  sorteggio, un elemento per match
 * @param {object} bracketDoc
 * @returns {{a:string|null, b:string|null}}
 */
export function giocatoriMatch(turni, primoTurno, bracketDoc, roundId, indice) {
  if (roundId === turni[0].id) {
    const m = (primoTurno || [])[indice];
    return { a: m?.a ?? null, b: m?.b ?? null };
  }
  const f = alimentatori(turni, roundId, indice);
  if (!f) return { a: null, b: null };
  return {
    a: bracketDoc?.[f.turnoPrecedente]?.[f.a]?.vincitore ?? null,
    b: bracketDoc?.[f.turnoPrecedente]?.[f.b]?.vincitore ?? null,
  };
}

/**
 * Propaga il tabellone dagli esiti reali.
 *
 * @param {object} p
 * @param {number} p.dimensione
 * @param {Array<{a,b}>} p.primoTurno
 * @param {Record<string,{vincitore:string, dettaglio?:string}>} p.pool  esiti reali, chiave = chiavePool(a,b)
 * @param {object} [p.seed]  override manuali già confermati { round: { mid: {vincitore, manuale:true,…} } }:
 *   vengono usati per derivare i turni successivi e NON sono mai sovrascritti dal pool.
 * @returns {object} documento bracket { [round]: { [mid]: {vincitore, dettaglio?, manuale?} } }
 */
export function propagaBracketKO({ dimensione, primoTurno, pool, seed }) {
  const turni = turniKO(dimensione);
  const bracket = {};

  for (const [r, matches] of Object.entries(seed || {})) {
    for (const [mid, m] of Object.entries(matches || {})) {
      if (!m || !m.vincitore) continue;
      (bracket[r] ||= {})[mid] = { ...m };
    }
  }

  for (const t of turni) {
    for (let i = 0; i < t.matches; i++) {
      const mid = idMatch(t.id, i);
      if (bracket[t.id]?.[mid]?.manuale) continue;
      const { a, b } = giocatoriMatch(turni, primoTurno, bracket, t.id, i);
      if (!a || !b) continue;
      const esito = (pool || {})[chiavePool(a, b)];
      if (!esito) continue;
      (bracket[t.id] ||= {})[mid] = { vincitore: esito.vincitore, dettaglio: esito.dettaglio ?? '' };
    }
  }
  return bracket;
}

// ── PUNTEGGIO ──────────────────────────────────────────

function vincitoriTurno(bracketDoc, roundId) {
  const out = new Map();
  for (const m of Object.values(bracketDoc?.[roundId] || {})) {
    if (m && m.vincitore) out.set(m.vincitore, m.dettaglio ?? null);
  }
  return out;
}

/** Punti per turno: array nell'ordine dei turni oppure oggetto { roundId: punti }. */
function puntiDelTurno(tabella, turni, roundId) {
  if (!tabella) return 0;
  if (Array.isArray(tabella)) return tabella[turni.findIndex(t => t.id === roundId)] || 0;
  return tabella[roundId] || 0;
}

/**
 * @param {object} pronBracket   documento bracket pronosticato
 * @param {object} realeBracket  documento bracket reale
 * @param {{esiti:(number[]|object), dettaglio?:(number[]|object)}} tabella  punti per turno
 * @param {{dimensione:number, annullati?:string[]}} opzioni
 *   `annullati`: id di giocatori che non danno punti in nessun turno (es. ritirato
 *   e rimpiazzato da un lucky loser dopo la chiusura dei pronostici).
 * @returns {{ totale, esiti, dettaglio, perTurno, indovinatiPerTurno, dettagliEsatti }}
 *   `indovinatiPerTurno` è in ordine dalla FINALE a ritroso (campione, finalisti,
 *   semifinalisti…): comodo come criterio di spareggio.
 */
export function calcolaPunteggioBracketTurni(pronBracket, realeBracket, tabella, { dimensione, annullati = [] }) {
  const turni = turniKO(dimensione);
  const esclusi = new Set(annullati);
  const perTurno = {};
  let esiti = 0, dettaglio = 0, dettagliEsatti = 0;

  for (const t of turni) {
    const reali = vincitoriTurno(realeBracket, t.id);
    const scelti = vincitoriTurno(pronBracket, t.id);
    let pEsiti = 0, pDett = 0, nGiusti = 0, nDett = 0;

    for (const [id, dett] of scelti) {
      if (esclusi.has(id) || !reali.has(id)) continue;
      pEsiti += puntiDelTurno(tabella.esiti, turni, t.id);
      nGiusti++;
      const dr = reali.get(id);
      if (dett != null && dett !== '' && dr != null && dett === dr) {
        pDett += puntiDelTurno(tabella.dettaglio, turni, t.id);
        nDett++;
      }
    }
    perTurno[t.id] = { esiti: pEsiti, dettaglio: pDett, indovinati: nGiusti, dettagliEsatti: nDett };
    esiti += pEsiti; dettaglio += pDett; dettagliEsatti += nDett;
  }

  const indovinatiPerTurno = [...turni].reverse().map(t => perTurno[t.id].indovinati);
  return { totale: esiti + dettaglio, esiti, dettaglio, perTurno, indovinatiPerTurno, dettagliEsatti };
}
