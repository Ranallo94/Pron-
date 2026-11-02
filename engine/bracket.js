/**
 * engine/bracket.js
 *
 * Bracket dichiarativo: risoluzione degli slot simbolici in squadre reali, e
 * adapter fra le forme-documento Firestore e le forme "piatte" che il motore
 * punteggi (punteggi.js) si aspetta. Vedi ../schema-dati.md §4.
 */

/**
 * Risolve un singolo slot simbolico in una squadra concreta.
 * @param {{t:'1'|'2'|'3'|'4'|'3slot', g?:string, slot?:string}} slot
 * @param {Record<string,string[]>} classificheGironi  { gironeId: [squadraId in ordine di classifica] }
 * @param {Record<string,string>} [mappaRipescaggio]    { slotId: gironeId } — a quale girone appartiene la
 *   terza ripescata per questo slot (assente se il torneo non ha ripescaggi)
 */
export function risolviSlot(slot, classificheGironi, mappaRipescaggio) {
  if (slot.t === '3slot') {
    const gironeAssegnato = mappaRipescaggio ? mappaRipescaggio[slot.slot] : undefined;
    if (!gironeAssegnato) return null;
    const classifica = classificheGironi[gironeAssegnato];
    return classifica ? classifica[2] ?? null : null;
  }
  const classifica = classificheGironi[slot.g];
  if (!classifica) return null;
  const indice = { 1: 0, 2: 1, 3: 2, 4: 3 }[slot.t];
  return classifica[indice] ?? null;
}

/**
 * Risolve tutti gli slot di un bracket dichiarativo.
 * @param {Array<{id:string, casa:object, trasferta:object}>} slotBracket
 * @returns {Record<string, {casa:string|null, trasferta:string|null}>}
 */
export function risolviBracket(slotBracket, classificheGironi, mappaRipescaggio) {
  const risolto = {};
  for (const s of slotBracket) {
    risolto[s.id] = {
      casa: risolviSlot(s.casa, classificheGironi, mappaRipescaggio),
      trasferta: risolviSlot(s.trasferta, classificheGironi, mappaRipescaggio),
    };
  }
  return risolto;
}

/**
 * Determina quali gironi "ripescano" la terza classificata e su quale slot.
 *
 * Versione GENERICA (per il pilota con dati di prova): ordina le terze con il
 * comparatore fornito e assegna gli slot nell'ordine dichiarato in `ordineSlot`.
 * Un torneo reale può fornire una tabella ufficiale (es. FIFA COMB_3I, 495
 * combinazioni) come implementazione alternativa di questa stessa funzione,
 * selezionata via `descrittoreTorneo.gironi.mappaAccoppiamento` — non è
 * hardcoded qui apposta, vedi schema-dati.md §4.
 *
 * @param {Record<string,string[]>} classificheGironi
 * @param {number} numeroRipescate
 * @param {string[]} ordineSlot  id degli slot di bracket da riempire, in ordine
 * @param {(a:{gironeId,squadraId}, b:{gironeId,squadraId}) => number} confrontaTerze
 */
export function calcolaMappaRipescaggio({ classificheGironi, numeroRipescate, ordineSlot, confrontaTerze }) {
  const terze = Object.entries(classificheGironi)
    .filter(([, ordine]) => ordine.length >= 3 && ordine[2])
    .map(([gironeId, ordine]) => ({ gironeId, squadraId: ordine[2] }));

  const ordinate = [...terze].sort(confrontaTerze);
  const qualificate = ordinate.slice(0, numeroRipescate);

  const mappa = {};
  qualificate.forEach((t, i) => {
    if (ordineSlot[i]) mappa[ordineSlot[i]] = t.gironeId;
  });
  return mappa;
}

/**
 * Adapter: dalla forma-documento Firestore del bracket (raggruppata per
 * round/match, `{ [roundId]: { [matchId]: { vincitore } } }`) all'elenco di
 * vincitori per turno (array di array) che punteggi.js si aspetta per lo
 * scoring "per squadra" (forgiving) del bracket KO.
 *
 * @param {Record<string, Record<string, {vincitore:string}>>} bracketDoc
 * @param {string[]} ordineRound  id dei round, in ordine cronologico
 * @returns {string[][]}
 */
export function estraiVincitoriPerTurno(bracketDoc, ordineRound) {
  return ordineRound.map(roundId => {
    const round = (bracketDoc || {})[roundId] || {};
    return Object.values(round)
      .map(m => m && m.vincitore)
      .filter(Boolean);
  });
}
