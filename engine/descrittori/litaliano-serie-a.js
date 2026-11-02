/**
 * Descrittore de L'ITALIANO — il gioco della Serie A 2026/27 (prova generale):
 * mini-campionato sulle giornate 6–10, ricreato da un amico a partire dalla
 * struttura di Championsito. Regole tratte dal suo Regolamento (letto il 2026-11-02).
 *
 *   • per ogni partita: segno 1X2 +10; risultato esatto +6 in aggiunta (16 in tutto)
 *   • classifica prevista DERIVATA dai risultati esatti pronosticati (solo giornate dell'edizione)
 *   • fasce (20 squadre): 1ª–3ª +15 · 4ª–10ª +8 · 11ª–17ª +6 · 18ª–20ª +10; posizione esatta +10
 *   • speciali (cannoniere, assistman, squadra più cattiva): +20 ciascuno
 *   • vincitore di giornata → "turno vinto" (spareggio della classifica generale)
 *
 * Massimi dichiarati nel regolamento: partite 800 + classifica 373 (fasce 173 + posizioni 200)
 * + speciali 60 = 1233: verificati da test/litaliano.test.js.
 *
 * Fasce, posizioni e speciali entrano nel totale SOLO dopo la convalida finale dell'admin:
 * il chiamante passa `risultato.ordinamenti.classificaFinale` e `risultato.bonus` solo da quel momento.
 */
export const litalianoSerieA = {
  formato: 'campionato-breve',

  gironi: {
    puntiPartita: { vittoria: 3, pareggio: 1, sconfitta: 0 },
    // punti → scontri diretti (punti, poi differenza reti) → differenza reti generale → gol fatti → sorteggio
    // 'sorteggio' non è automatico: le parità residue restano evidenziate (PUNTO DA DEFINIRE nel regolamento)
    criteriRanking: ['punti', 'h2h.punti', 'h2h.differenzaReti', 'differenzaReti', 'golFatti', 'sorteggio'],
  },

  tabellaPunti: {
    gironi: { segnoCorretto: 10, risultatoEsatto: 6 },
    ordinamenti: {
      classificaFinale: {
        fasce: [
          { id: 'f1', da: 0,  a: 3,  fascia: 15, esatta: 10 },   // 1ª–3ª
          { id: 'f2', da: 3,  a: 10, fascia: 8,  esatta: 10 },   // 4ª–10ª
          { id: 'f3', da: 10, a: 17, fascia: 6,  esatta: 10 },   // 11ª–17ª
          { id: 'f4', da: 17, a: 20, fascia: 10, esatta: 10 },   // 18ª–20ª
        ],
      },
    },
    bonus: [
      { id: 'cannoniere', tipo: 'identico', punti: 20 },
      { id: 'assistman',  tipo: 'identico', punti: 20 },
      { id: 'cattiva',    tipo: 'identico', punti: 20 },
    ],
  },

  // Vincitore di giornata: punti partite → più esatti → più segni; parità = tutti vincitori
  vincitoreGiornata: ['punti', 'esatti', 'segni'],

  // Classifica generale: punti totali → turni vinti → esatti → posizioni esatte → fasce corrette → segni.
  // `turniVinti` dipende da tutti i partecipanti e dalle giornate definitive: lo calcola il chiamante
  // (classifica.js → turniVinti) e lo antepone allo spareggio ricavato da qui.
  spareggio: ['gironi.esattiOk', 'classificaFinale.esatteInFascia', 'classificaFinale.fasceOk', 'gironi.segniOk'],
  spareggioPrefisso: ['turniVinti'],

  // Catene di spareggio per i vincitori degli speciali (engine/speciali.js)
  speciali: {
    cannoniere: [{ campo: 'gol', verso: 'max' }, { campo: 'minuti', verso: 'min' }, { campo: 'assist', verso: 'max' }],
    assistman:  [{ campo: 'assist', verso: 'max' }, { campo: 'minuti', verso: 'min' }, { campo: 'gol', verso: 'max' }],
    cattiva:    [{ campo: 'cartellini', verso: 'max' }, { campo: 'rossi', verso: 'max' }, { campo: 'gialli', verso: 'max' }, { campo: 'falli', verso: 'max' }],
  },
};
