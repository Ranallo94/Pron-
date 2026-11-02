/**
 * engine/speciali.js
 *
 * Premi "speciali" a vincitore unico (cannoniere, assistman, squadra più
 * cattiva…): il vincitore si ricava da dati ufficiali con una catena di
 * criteri di spareggio dichiarativi. La catena è un dato del descrittore:
 *
 *   cannoniere:   [{campo:'gol', verso:'max'}, {campo:'minuti', verso:'min'}, {campo:'assist', verso:'max'}]
 *   cattiva:      [{campo:'cartellini', verso:'max'}, {campo:'rossi', verso:'max'}, {campo:'gialli', verso:'max'}, {campo:'falli', verso:'max'}]
 *
 * Regola di sicurezza: parità residua o dato mancante NON producono un
 * vincitore inventato. Il risultato dice chi resta in lizza e perché, e
 * l'assegnazione finale spetta all'admin (selezione manuale esplicita).
 */

const manca = (v) => v === null || v === undefined || Number.isNaN(v);

/**
 * @param {Array<{id:string}>} candidati
 * @param {Array<{campo:string, verso:'max'|'min'}>} criteri
 * @returns {{ vincitori:string[], parita:boolean, datiMancanti:boolean }}
 *   `vincitori` ha un solo id quando la catena decide; più id (o lista rimasta in
 *   lizza) quando serve la scelta dell'admin; vuoto se non ci sono candidati.
 */
export function scegliVincitoreSpeciale(candidati, criteri) {
  let inLizza = [...(candidati || [])];
  if (!inLizza.length) return { vincitori: [], parita: false, datiMancanti: false };

  for (const { campo, verso } of criteri) {
    if (inLizza.length === 1) break;
    if (inLizza.some(c => manca(c[campo]))) {
      return { vincitori: inLizza.map(c => c.id), parita: true, datiMancanti: true };
    }
    const valori = inLizza.map(c => c[campo]);
    const migliore = verso === 'min' ? Math.min(...valori) : Math.max(...valori);
    inLizza = inLizza.filter(c => c[campo] === migliore);
  }
  return { vincitori: inLizza.map(c => c.id), parita: inLizza.length > 1, datiMancanti: false };
}

/**
 * Cartellini di una squadra per "squadra più cattiva". Giallo = 1, rosso diretto = 1,
 * doppia ammonizione con espulsione = un giallo + un rosso = 2.
 * @param {{gialli?:number, rossiDiretti?:number, doppieAmmonizioni?:number}} c
 *   `gialli` = ammonizioni che NON hanno portato a espulsione.
 */
export function riepilogoCartellini({ gialli = 0, rossiDiretti = 0, doppieAmmonizioni = 0 }) {
  const rossi = rossiDiretti + doppieAmmonizioni;
  const tuttiGialli = gialli + doppieAmmonizioni;
  return { gialli: tuttiGialli, rossi, cartellini: tuttiGialli + rossi };
}
