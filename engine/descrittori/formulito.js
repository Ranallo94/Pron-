/**
 * Descrittore di Formulito (F1): una competizione = un GP, pronostico a
 * ordinamento (qualifiche, gara, sprint solo nei weekend che la prevedono).
 * Valori identici a Formulito/functions/punteggi.js — la parità è verificata
 * da test/parita-app.test.js.
 */
const bonus = [
  { id: 'giroVeloce',      tipo: 'identico', punti: 5 },
  { id: 'pitStopVeloce',   tipo: 'identico', punti: 5 },
  { id: 'gommaLunga',      tipo: 'identico', punti: 5 },
  { id: 'primoRitirato',   tipo: 'identico', punti: 5 },
  { id: 'maggiorGuadagno', tipo: 'identico', punti: 5 },
  { id: 'safetyCar',       tipo: 'numero',   punti: 5 },
];

const qualifica = { esatta: [10], esattaResto: 3, vicino: 1 };
const gara = {
  esatta: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], esattaResto: 0,
  bonusPrimi: [{ primi: 3, punti: 3 }, { primi: 10, punti: 1 }],
};
const sprint = { esatta: [8, 7, 6, 5, 4, 3, 2, 1], esattaResto: 0, bonusPrimi: [{ primi: 3, punti: 1 }] };

/** Weekend normale. */
export const formulito = {
  formato: 'ordinamenti',
  tabellaPunti: { ordinamenti: { qualifica, gara }, bonus },
  // vincitore gara indovinato, pole indovinata, numero di bonus indovinati
  spareggio: ['gara.vincitoreOk', 'qualifica.vincitoreOk', 'bonus.indovinati'],
};

/** Weekend con Sprint: stesso descrittore + la sessione sprint (non entra nello spareggio, come in Formulito). */
export const formulitoSprint = {
  ...formulito,
  tabellaPunti: { ordinamenti: { sprint, qualifica, gara }, bonus },
};
