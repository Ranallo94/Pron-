import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcolaPunteggioPartiteGironi,
  calcolaPunteggioQualificazione,
  calcolaPunteggioPostoGriglia,
  calcolaPunteggioBracketKO,
} from '../punteggi.js';
import { classificaGirone } from '../ranking.js';
import {
  partiteGironeA, squadreGironeA,
  partiteGironeB, squadreGironeB,
  puntiPartita, criteriRanking,
} from './fixtures/mini-torneo.js';

const tabellaPuntiGironi = { segnoCorretto: 10, risultatoEsatto: 5, postoInGriglia: 10, qualificazione: 5 };

test('punteggio partite: segno corretto ma non esatto -> solo 10pt', () => {
  const pronostico = { A1: { valoreCasa: 3, valoreTrasferta: 0 } }; // stesso segno (1), risultato diverso
  const risultato = { A1: { valoreCasa: 2, valoreTrasferta: 1 } };
  const { totale, dettaglio } = calcolaPunteggioPartiteGironi(pronostico, risultato, tabellaPuntiGironi);
  assert.equal(totale, 10);
  assert.equal(dettaglio.A1.segnoOk, true);
  assert.equal(dettaglio.A1.esattoOk, false);
});

test('punteggio partite: risultato esatto -> 10+5=15pt (bonus annidato)', () => {
  const pronostico = { A1: { valoreCasa: 2, valoreTrasferta: 1 } };
  const risultato = { A1: { valoreCasa: 2, valoreTrasferta: 1 } };
  const { totale } = calcolaPunteggioPartiteGironi(pronostico, risultato, tabellaPuntiGironi);
  assert.equal(totale, 15);
});

test('punteggio partite: segno sbagliato -> 0, anche se per assurdo il totale gol coincidesse', () => {
  const pronostico = { A1: { valoreCasa: 1, valoreTrasferta: 2 } }; // segno 2
  const risultato = { A1: { valoreCasa: 2, valoreTrasferta: 1 } }; // segno 1
  const { totale, dettaglio } = calcolaPunteggioPartiteGironi(pronostico, risultato, tabellaPuntiGironi);
  assert.equal(totale, 0);
  assert.equal(dettaglio.A1.segnoOk, false);
});

test('punteggio partite: partita non ancora conclusa viene ignorata, non conta come sbagliata', () => {
  const pronostico = { A1: { valoreCasa: 1, valoreTrasferta: 0 } };
  const risultato = { A1: { valoreCasa: null, valoreTrasferta: null } };
  const { totale, dettaglio } = calcolaPunteggioPartiteGironi(pronostico, risultato, tabellaPuntiGironi);
  assert.equal(totale, 0);
  assert.equal(dettaglio.A1, undefined);
});

test('punteggio qualificazione: conta solo le squadre pronosticate che sono davvero qualificate', () => {
  const { totale, squadre } = calcolaPunteggioQualificazione(['ITA', 'BRA', 'GER'], ['ITA', 'BRA', 'FRA', 'SEN'], 5);
  assert.equal(totale, 10); // ITA + BRA
  assert.deepEqual(squadre, ['ITA', 'BRA']);
});

test('punteggio posto in griglia: gate chiuso (0) se le classifiche non sono ancora congelate', () => {
  const { totale } = calcolaPunteggioPostoGriglia({ S1: 'ITA' }, null, 10);
  assert.equal(totale, 0);
});

test('punteggio posto in griglia: conta gli slot coincidenti una volta congelate', () => {
  const { totale, slotCorretti } = calcolaPunteggioPostoGriglia(
    { S1: 'ITA', S2: 'FRA' },
    { S1: 'ITA', S2: 'BRA' },
    10
  );
  assert.equal(totale, 10);
  assert.deepEqual(slotCorretti, ['S1']);
});

test('punteggio bracket KO: forgiving per squadra, conta chi avanza per turno', () => {
  const pronosticati = [['ITA', 'FRA'], ['ITA']]; // turno 0: ottavi, turno 1: quarti
  const reali = [['ITA', 'BRA'], ['ITA']];
  const { totale, perTurno } = calcolaPunteggioBracketKO(pronosticati, reali, { esiti: [2, 5] });
  // turno 0: solo ITA indovinata -> 1*2=2; turno 1: ITA indovinata -> 1*5=5
  assert.equal(totale, 7);
  assert.equal(perTurno[0].indovinati, 1);
  assert.equal(perTurno[1].indovinati, 1);
});

test('integrazione: classifica derivata dai risultati -> punteggio partite + qualificazione end-to-end', () => {
  const risultatoA = classificaGirone({ partiteGirone: partiteGironeA, squadre: squadreGironeA, criteriRanking, puntiPartita });
  const risultatoB = classificaGirone({ partiteGirone: partiteGironeB, squadre: squadreGironeB, criteriRanking, puntiPartita });
  const qualificateReali = [...risultatoA.ordine.slice(0, 2), ...risultatoB.ordine.slice(0, 2)]; // prime due di ogni girone

  assert.deepEqual(qualificateReali, ['ITA', 'BRA', 'FRA', 'SEN']);

  // Un utente pronostica i risultati delle partite del girone A esattamente,
  // sbaglia tutto il girone B, e indica come qualificate ITA, BRA, FRA, MAR
  // (indovina 3 su 4).
  const risultatoUfficialeGironi = Object.fromEntries(
    partiteGironeA.map((p, i) => [`A${i + 1}`, { valoreCasa: p.valoreCasa, valoreTrasferta: p.valoreTrasferta }])
  );
  const pronosticoGironi = { ...risultatoUfficialeGironi }; // indovinate tutte le partite del girone A

  const { totale: puntiPartite } = calcolaPunteggioPartiteGironi(pronosticoGironi, risultatoUfficialeGironi, tabellaPuntiGironi);
  assert.equal(puntiPartite, partiteGironeA.length * 15); // tutte esatte: 15pt l'una

  const { totale: puntiQualificazione, squadre } = calcolaPunteggioQualificazione(
    ['ITA', 'BRA', 'FRA', 'MAR'],
    qualificateReali,
    tabellaPuntiGironi.qualificazione
  );
  assert.equal(puntiQualificazione, 15); // ITA, BRA, FRA -> 3 * 5
  assert.deepEqual(squadre, ['ITA', 'BRA', 'FRA']);
});
