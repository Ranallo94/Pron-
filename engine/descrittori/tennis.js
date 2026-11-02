/**
 * Descrittori dei tornei di tennis a eliminazione diretta (singolare, 128,
 * best-of-5). Punteggio "per giocatore" (forgiving) + bonus set annidato
 * + bonus statistici. Valori di Wimbledino ("Finale calda") e Medusino
 * ("Finale ridotta"); scelti con simulazione Monte Carlo, vedi i rispettivi
 * CLAUDE.md / MEMORY_EXPORT.
 */
const TURNI = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
const perTurno = (valori) => Object.fromEntries(TURNI.map((t, i) => [t, valori[i]]));

const bonusStat = (punti) => ['aces', 'breaks', 'tiebreaks'].map(id => ({ id, tipo: 'identico', punti }));

// campione, finalisti, semifinalisti, quarti, set esatti, bonus statistici
const spareggio = [
  'bracketDoc.indovinatiPerTurno.0', 'bracketDoc.indovinatiPerTurno.1',
  'bracketDoc.indovinatiPerTurno.2', 'bracketDoc.indovinatiPerTurno.3',
  'bracketDoc.dettagliEsatti', 'bonus.indovinati',
];

export const wimbledino = {
  formato: 'bracket',
  bracket: { dimensione: 128 },
  tabellaPunti: {
    bracket: { esiti: perTurno([1, 2, 5, 12, 30, 75, 180]), dettaglio: perTurno([1, 1, 2, 4, 10, 25, 60]) },
    bonus: bonusStat(25),
  },
  spareggio,
};

export const medusino = {
  formato: 'bracket',
  bracket: { dimensione: 128 },
  tabellaPunti: {
    bracket: { esiti: perTurno([1, 2, 5, 12, 28, 55, 100]), dettaglio: perTurno([1, 1, 2, 4, 9, 14, 20]) },
    bonus: bonusStat(15),
  },
  spareggio,
};
