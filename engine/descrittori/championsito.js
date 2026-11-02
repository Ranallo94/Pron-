/**
 * Descrittore di Championsito, Fase 1: classifica generale a 36 squadre
 * (formato svizzero, 8 partite a testa), fasce 1-8 / 9-24 / 25-36.
 * Tabella "E" calibrata con simulazione Monte Carlo (CLAUDE.md di Championsito).
 * Parità con Championsito/functions/punteggi.js verificata da test/parita-app.test.js.
 */
export const championsito = {
  formato: 'campionato',
  gironi: {
    puntiPartita: { vittoria: 3, pareggio: 1, sconfitta: 0 },
    // un unico "girone" da 36; 'nome' = ultimo fallback alfabetico deterministico
    criteriRanking: ['punti', 'differenzaReti', 'golFatti', 'nome'],
  },
  tabellaPunti: {
    gironi: { segnoCorretto: 3, risultatoEsatto: 10 },   // esatto IN AGGIUNTA al segno
    ordinamenti: {
      classificaFinale: {
        fasce: [
          { id: 'top8',      da: 0,  a: 8,  fascia: 15, esatta: 40 },
          { id: 'playoff',   da: 8,  a: 24, fascia: 3,  esatta: 12 },
          { id: 'eliminate', da: 24, a: 36, fascia: 8,  esatta: 12 },
        ],
      },
    },
    bonus: [
      { id: 'capocannoniere', tipo: 'identico', punti: 30 },
      { id: 'assistman',      tipo: 'identico', punti: 30 },
      { id: 'cartellini',     tipo: 'identico', punti: 30 },
    ],
  },
  // posizioni esatte, fasce indovinate, bonus indovinati, risultati esatti, segni
  spareggio: ['classificaFinale.esatteInFascia', 'classificaFinale.fasceOk', 'bonus.indovinati', 'gironi.esattiOk', 'gironi.segniOk'],
};
