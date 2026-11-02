/**
 * engine/bonus.js
 *
 * Bonus "a indovinello": voci indipendenti, ciascuna con un punteggio fisso
 * (giro veloce, capocannoniere, numero di safety car, più ace…). Le
 * definizioni sono dati, nel descrittore:
 *
 *   [{ id: 'giroVeloce', tipo: 'identico', punti: 5 },
 *    { id: 'safetyCar',  tipo: 'numero',   punti: 5 }]
 *
 * - tipo 'identico' (default): il valore scelto deve coincidere con quello reale.
 * - tipo 'numero': coincidenza numerica (nessun punteggio parziale per lo scarto).
 * Una voce conta solo se SIA il pronostico SIA il reale sono compilati
 * (null / undefined / '' = non compilato, 0 invece è un valore valido).
 */

const compilato = (v) => v !== null && v !== undefined && v !== '';

/**
 * @returns {{ totale:number, indovinati:number, dettaglio:Record<string,{ok:boolean,punti:number}> }}
 */
export function calcolaPunteggioBonus(pronostico, reale, definizioni) {
  let totale = 0;
  let indovinati = 0;
  const dettaglio = {};

  for (const def of definizioni || []) {
    const scelto = pronostico?.[def.id];
    const vero = reale?.[def.id];
    if (!compilato(scelto) || !compilato(vero)) continue;

    const ok = def.tipo === 'numero' ? Number(scelto) === Number(vero) : scelto === vero;
    const punti = ok ? (def.punti ?? def.puntiEsatto ?? 0) : 0;
    dettaglio[def.id] = { ok, punti };
    if (ok) { totale += punti; indovinati++; }
  }
  return { totale, indovinati, dettaglio };
}
