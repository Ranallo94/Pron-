/**
 * engine/ordinamenti.js
 *
 * Punteggio dei pronostici "a ordinamento": l'utente indica un ORDINE
 * (griglia di partenza, ordine d'arrivo, classifica finale, top-N di una
 * hit parade…) e si confronta con l'ordine reale. Copre F1 (Formulito:
 * qualifiche, gara, sprint) e la classifica a fasce di Championsito, ma
 * vale per qualunque gara a classifica d'arrivo, anche non sportiva
 * (Sanremo, Eurovision, reality…).
 *
 * Funzioni pure: nessuna dipendenza da Firebase né dallo sport. Le regole
 * sono DATI (parte `ordinamenti` della tabella punti del descrittore):
 *
 *   {
 *     esatta:      number | number[],  // punti per posizione esatta: un numero per
 *                                      // tutte, oppure un array per posizione (0 = 1°)
 *     esattaResto: number,             // posizioni oltre l'array (default 0)
 *     vicino:      number,             // scarto di esattamente 1 posizione (default 0)
 *     bonusPrimi:  [{ primi: k, punti: p }],  // +p se l'elemento è tra i primi k
 *                                      // sia nel pronostico sia nel reale (cumulabili)
 *     fasce:       [{ id, da, a, fascia, esatta }]  // zone [da, a) 0-based: +fascia se
 *                                      // la zona pronosticata coincide con quella reale,
 *                                      // e in più +esatta se anche la posizione è esatta
 *   }
 */

function mappaPosizioni(ordine) {
  const m = new Map();
  (ordine || []).forEach((id, i) => { if (id != null && id !== '') m.set(id, i); });
  return m;
}

function puntiEsatta(regole, i) {
  const e = regole.esatta;
  if (typeof e === 'number') return e;
  if (Array.isArray(e)) return i < e.length ? e[i] : (regole.esattaResto || 0);
  return 0;
}

function zonaDi(fasce, i) {
  return (fasce || []).find(f => i >= f.da && i < f.a) || null;
}

/**
 * @param {Array<string|null>} pronostico  ordine pronosticato (indice 0 = primo)
 * @param {Array<string|null>} reale       ordine reale; gli elementi assenti dal reale non contano
 * @param {object} regole                  vedi sopra
 * @returns {{ totale:number, dettaglio:object, contatori:object, vincitoreOk:boolean }}
 */
export function calcolaPunteggioOrdinamento(pronostico, reale, regole = {}) {
  const posReale = mappaPosizioni(reale);
  const bonusPrimi = regole.bonusPrimi || [];

  const dettaglio = { esatta: 0, vicino: 0, bonusPrimi: bonusPrimi.map(() => 0), fascia: 0, esattaFascia: 0 };
  const contatori = { esatte: 0, vicini: 0, bonusPrimi: bonusPrimi.map(() => 0), fasceOk: 0, esatteInFascia: 0 };

  (pronostico || []).forEach((id, i) => {
    if (id == null || id === '') return;
    const r = posReale.get(id);
    if (r === undefined) return;

    if (i === r) {
      dettaglio.esatta += puntiEsatta(regole, i);
      contatori.esatte++;
    } else if (regole.vicino && Math.abs(i - r) === 1) {
      dettaglio.vicino += regole.vicino;
      contatori.vicini++;
    }

    bonusPrimi.forEach((b, k) => {
      if (i < b.primi && r < b.primi) { dettaglio.bonusPrimi[k] += b.punti; contatori.bonusPrimi[k]++; }
    });

    if (regole.fasce) {
      const zp = zonaDi(regole.fasce, i);
      const zr = zonaDi(regole.fasce, r);
      if (zp && zr && zp.id === zr.id) {
        dettaglio.fascia += zp.fascia || 0;
        contatori.fasceOk++;
        if (i === r) { dettaglio.esattaFascia += zp.esatta || 0; contatori.esatteInFascia++; }
      }
    }
  });

  const totale = dettaglio.esatta + dettaglio.vicino + dettaglio.fascia + dettaglio.esattaFascia
    + dettaglio.bonusPrimi.reduce((a, b) => a + b, 0);

  const p0 = (pronostico || [])[0];
  const r0 = (reale || [])[0];
  return { totale, dettaglio, contatori, vincitoreOk: !!(p0 && r0 && p0 === r0) };
}
