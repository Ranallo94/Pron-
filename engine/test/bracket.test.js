import { test } from 'node:test';
import assert from 'node:assert/strict';
import { risolviSlot, risolviBracket, calcolaMappaRipescaggio, estraiVincitoriPerTurno } from '../bracket.js';

const classificheGironi = {
  A: ['ITA', 'BRA', 'GER', 'JPN'],
  B: ['FRA', 'SEN', 'MAR', 'KOR'],
};

test('risolviSlot: prima e seconda classificata', () => {
  assert.equal(risolviSlot({ t: '1', g: 'A' }, classificheGironi), 'ITA');
  assert.equal(risolviSlot({ t: '2', g: 'B' }, classificheGironi), 'SEN');
});

test('risolviSlot: slot da terza ripescata, null se la mappa non assegna quello slot', () => {
  assert.equal(risolviSlot({ t: '3slot', slot: 'X1' }, classificheGironi, { X1: 'A' }), 'GER');
  assert.equal(risolviSlot({ t: '3slot', slot: 'X2' }, classificheGironi, { X1: 'A' }), null);
});

test('risolviBracket: risolve una lista di slot in un colpo solo', () => {
  const slotBracket = [
    { id: 'S1', casa: { t: '1', g: 'A' }, trasferta: { t: '2', g: 'B' } },
    { id: 'S2', casa: { t: '1', g: 'B' }, trasferta: { t: '2', g: 'A' } },
  ];
  const risolto = risolviBracket(slotBracket, classificheGironi);
  assert.deepEqual(risolto, {
    S1: { casa: 'ITA', trasferta: 'SEN' },
    S2: { casa: 'FRA', trasferta: 'BRA' },
  });
});

test('calcolaMappaRipescaggio: assegna le migliori N terze agli slot nell\'ordine dichiarato', () => {
  const classifiche = { A: ['x', 'y', 'AAA'], B: ['x', 'y', 'BBB'], C: ['x', 'y', 'CCC'] };
  // confronto fittizio: ordina i gironi per lettera (in un caso reale userebbe le stats delle terze)
  const confrontaTerze = (a, b) => a.gironeId.localeCompare(b.gironeId);
  const mappa = calcolaMappaRipescaggio({
    classificheGironi: classifiche,
    numeroRipescate: 2,
    ordineSlot: ['SLOT_X', 'SLOT_Y'],
    confrontaTerze,
  });
  assert.deepEqual(mappa, { SLOT_X: 'A', SLOT_Y: 'B' }); // solo le prime 2 in ordine alfabetico, C esclusa
});

test('estraiVincitoriPerTurno: adapter dal documento Firestore del bracket', () => {
  const bracketDoc = {
    ottavi: { m1: { vincitore: 'ITA' }, m2: { vincitore: 'FRA' } },
    quarti: { m1: { vincitore: 'ITA' } },
  };
  const risultato = estraiVincitoriPerTurno(bracketDoc, ['ottavi', 'quarti', 'semifinale']);
  assert.deepEqual(risultato, [['ITA', 'FRA'], ['ITA'], []]);
});
