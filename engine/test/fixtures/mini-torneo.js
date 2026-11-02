/**
 * Torneo di prova (dati fittizi) per i test del motore: 2 gironi da 4 squadre,
 * criteri di ranking calcistici standard, formato girone+KO ridotto.
 */

export const puntiPartita = { vittoria: 3, pareggio: 1, sconfitta: 0 };

export const criteriRanking = ['punti', 'differenzaReti', 'golFatti', 'scontriDiretti', 'ordineManuale'];

// Girone A: nessuna parità dopo i criteri oggettivi.
export const partiteGironeA = [
  { casa: 'ITA', trasferta: 'BRA', valoreCasa: 2, valoreTrasferta: 1 },
  { casa: 'GER', trasferta: 'JPN', valoreCasa: 1, valoreTrasferta: 1 },
  { casa: 'ITA', trasferta: 'GER', valoreCasa: 3, valoreTrasferta: 0 },
  { casa: 'BRA', trasferta: 'JPN', valoreCasa: 2, valoreTrasferta: 0 },
  { casa: 'ITA', trasferta: 'JPN', valoreCasa: 1, valoreTrasferta: 0 },
  { casa: 'BRA', trasferta: 'GER', valoreCasa: 1, valoreTrasferta: 1 },
];

// Girone B: FRA e SEN arrivano entrambe a 7 punti, risolte dalla differenza
// reti (nessuna parità vera qui — il caso "scontri diretti"/ordine manuale è
// testato a parte in ranking.test.js con dati costruiti apposta).
export const partiteGironeB = [
  { casa: 'FRA', trasferta: 'MAR', valoreCasa: 2, valoreTrasferta: 0 },
  { casa: 'SEN', trasferta: 'KOR', valoreCasa: 2, valoreTrasferta: 0 },
  { casa: 'FRA', trasferta: 'SEN', valoreCasa: 1, valoreTrasferta: 1 },
  { casa: 'MAR', trasferta: 'KOR', valoreCasa: 2, valoreTrasferta: 0 },
  { casa: 'FRA', trasferta: 'KOR', valoreCasa: 3, valoreTrasferta: 0 },
  { casa: 'MAR', trasferta: 'SEN', valoreCasa: 0, valoreTrasferta: 1 },
];

export const squadreGironeA = ['ITA', 'BRA', 'GER', 'JPN'];
export const squadreGironeB = ['FRA', 'MAR', 'SEN', 'KOR'];

export const descrittoreTorneo = {
  gironi: {
    struttura: { numeroGironi: 2, squadrePerGirone: 4 },
    puntiPartita,
    criteriRanking,
    numeroQualificate: { dirette: 4 }, // 1e e 2e di ogni girone, niente ripescaggio in questo mini-torneo
  },
  tabellaPunti: {
    gironi: { segnoCorretto: 10, risultatoEsatto: 5, postoInGriglia: 10, qualificazione: 5 },
  },
};
