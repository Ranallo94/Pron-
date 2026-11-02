/**
 * engine/partite.js
 *
 * Utilità sul pronostico di una singola partita.
 */

/** Convenzione "minima" quando si dà solo il segno: 1 → 1-0, X → 1-1, 2 → 0-1. */
export const CONVENZIONE_SEGNO = { '1': [1, 0], X: [1, 1], '2': [0, 1] };

/**
 * Risultato pronosticato di una partita: l'esatto se presente, altrimenti
 * quello dedotto dal solo segno con la convenzione, altrimenti null
 * (partita non pronosticata, quindi non conteggiata).
 *
 * @param {{valoreCasa:number,valoreTrasferta:number}|null} esatto
 * @param {'1'|'X'|'2'|null|undefined} segno
 * @returns {{valoreCasa:number,valoreTrasferta:number}|null}
 */
export function risultatoPrevisto(esatto, segno, convenzione = CONVENZIONE_SEGNO) {
  if (esatto && esatto.valoreCasa != null && esatto.valoreTrasferta != null) {
    return { valoreCasa: Number(esatto.valoreCasa), valoreTrasferta: Number(esatto.valoreTrasferta) };
  }
  const c = segno && convenzione[segno];
  return c ? { valoreCasa: c[0], valoreTrasferta: c[1] } : null;
}
