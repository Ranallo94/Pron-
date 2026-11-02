/**
 * engine/classifica.js
 *
 * Classifica dei PARTECIPANTI (non delle squadre): data una lista di righe
 * { id, nome, totale, spareggio:[...] } assegna la posizione.
 *
 * Ordine: totale decrescente; a pari totale i contatori di `spareggio` in
 * ordine (il primo che differisce decide, più alto = meglio); infine il nome
 * (solo per un ordine di visualizzazione stabile). La POSIZIONE è condivisa
 * da chi è pari su totale E spareggio.
 *
 * È la versione unica di quello che oggi è copiato in Formulito
 * (profilo.js, stagione.js, classifica.js).
 */

function confrontaSpareggio(a, b) {
  const sa = a.spareggio || [], sb = b.spareggio || [];
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const d = (sb[i] || 0) - (sa[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * @returns {Array<object>} le stesse righe, ordinate, con `posizione` aggiunta
 */
export function classificaPartecipanti(righe) {
  const ordinate = [...(righe || [])].sort((a, b) => {
    const dt = (b.totale || 0) - (a.totale || 0);
    if (dt !== 0) return dt;
    const ds = confrontaSpareggio(a, b);
    if (ds !== 0) return ds;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'it');
  });

  let pos = 1;
  return ordinate.map((r, i) => {
    if (i > 0) {
      const prev = ordinate[i - 1];
      const pari = (prev.totale || 0) === (r.totale || 0) && confrontaSpareggio(prev, r) === 0;
      if (!pari) pos = i + 1;
    }
    return { ...r, posizione: pos };
  });
}

// ── VINCITORE DI GIORNATA E TURNI VINTI ─────────────────────────────────

/**
 * Vincitore/i di una giornata: i partecipanti che chiudono primi secondo la catena
 * di criteri `chiavi` (campi numerici, più alto = meglio, nell'ordine). Se la parità
 * resta su tutte le chiavi, sono TUTTI vincitori (pari merito).
 *
 * @param {Array<object>} righe  una riga per partecipante che ha giocato la giornata
 * @param {string[]} chiavi      es. ['punti', 'esatti', 'segni']
 * @returns {string[]} id dei vincitori (vuoto se non ci sono righe)
 */
export function vincitoriGiornata(righe, chiavi) {
  let inLizza = [...(righe || [])];
  for (const k of chiavi) {
    if (inLizza.length <= 1) break;
    const max = Math.max(...inLizza.map(r => r[k] || 0));
    inLizza = inLizza.filter(r => (r[k] || 0) === max);
  }
  return inLizza.map(r => r.id);
}

/**
 * Turni vinti per partecipante, contando SOLO le giornate definitive
 * (una giornata ancora provvisoria/LIVE non assegna nulla; se viene corretta
 * e torna provvisoria, il turno non conta più).
 *
 * @param {Array<{definitiva:boolean, righe:Array<object>}>} giornate
 * @param {string[]} chiavi  catena dei criteri come in vincitoriGiornata
 * @returns {Map<string, number>}
 */
export function turniVinti(giornate, chiavi) {
  const m = new Map();
  for (const g of giornate || []) {
    if (!g.definitiva) continue;
    for (const id of vincitoriGiornata(g.righe, chiavi)) m.set(id, (m.get(id) || 0) + 1);
  }
  return m;
}
