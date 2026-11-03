import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idSquadra, abbinaGiocatore, costruisci, norm } from './uefa.mjs';

const squadre = [
  { id: 'sq01', nome: 'Paris Saint-Germain' }, { id: 'sq02', nome: 'Bayern Munich' },
  { id: 'sq03', nome: 'Real Madrid' }, { id: 'sq04', nome: 'Liverpool' },
];
const rose = {
  sq01: [{ n: 'Ousmane Dembélé', p: 'F' }, { n: 'Désiré Doué', p: 'F' }],
  sq02: [{ n: 'Harry Kane', p: 'F' }, { n: 'Luis Díaz', p: 'F' }],
  sq03: [{ n: 'Kylian Mbappé', p: 'F' }, { n: 'Brahim Díaz', p: 'M' }, { n: 'Federico Valverde', p: 'M' }],
  sq04: [{ n: 'Mohamed Salah', p: 'F' }, { n: 'Virgil van Dijk', p: 'D' }, { n: 'Kostas Tsimikas', p: 'D' }],
};

test('squadre: nome uguale o alias UEFA', () => {
  assert.equal(idSquadra('Paris', squadre), 'sq01');
  assert.equal(idSquadra('Bayern München', squadre), 'sq02');
  assert.equal(idSquadra('Real Madrid', squadre), 'sq03');
  assert.equal(idSquadra('Sconosciuta FC', squadre), null);
});

test('giocatori: esatto, per cognome, cognome composto, ambiguo, assente', () => {
  assert.deepEqual(abbinaGiocatore('Harry Kane', 'sq02', rose), { valore: 'sq02|Harry Kane', esito: 'esatto' });
  assert.equal(abbinaGiocatore('Dembele', 'sq01', rose).valore, 'sq01|Ousmane Dembélé');
  assert.equal(abbinaGiocatore('Virgil Van Dijk', 'sq04', rose).esito, 'esatto');
  assert.equal(abbinaGiocatore('V. van Dijk', 'sq04', rose).valore, 'sq04|Virgil van Dijk');
  assert.equal(abbinaGiocatore('Costas Tsimikas', 'sq04', rose).valore, 'sq04|Kostas Tsimikas');
  assert.equal(abbinaGiocatore('Sconosciuto Qualunque', 'sq03', rose).esito, 'assente');
  // Due Díaz in squadre diverse non si confondono; stessa squadra → ambiguo senza iniziale
  const doppio = { sq05: [{ n: 'Luis Díaz', p: 'F' }, { n: 'Brahim Díaz', p: 'M' }] };
  assert.equal(abbinaGiocatore('Diaz', 'sq05', doppio).esito, 'ambiguo');
  assert.equal(abbinaGiocatore('B. Díaz', 'sq05', doppio).valore, 'sq05|Brahim Díaz');
});

const sqRiga = (nome, v) => ({ team: { internationalName: nome }, statistics: [{ value: String(v) }] });
const gRiga = (nome, squadra, v) => ({ player: { internationalName: nome }, team: { internationalName: squadra }, statistics: [{ value: String(v) }] });

test('classifiche: formato Championsito, cartellini a parità più rossi, bonus solo con leader unico', () => {
  const uefa = {
    marcatori: [gRiga('Harry Kane', 'Bayern München', 5), gRiga('Kylian Mbappé', 'Real Madrid', 4), gRiga('Ousmane Dembélé', 'Paris', 4)],
    assist: [gRiga('Mohamed Salah', 'Liverpool', 3), gRiga('Kostas Tsimikas', 'Liverpool', 1)],
    gialli: [sqRiga('Paris', 6), sqRiga('Real Madrid', 5), sqRiga('Liverpool', 2)],
    rossi: [sqRiga('Real Madrid', 1), sqRiga('Bayern München', 0)],
    partite: squadre.map(s => sqRiga(s.id === 'sq02' ? 'Bayern München' : s.nome, 8)),
  };
  const r = costruisci(uefa, squadre, rose);
  assert.deepEqual(r.classifiche.marcatori[0], { g: 'sq02|Harry Kane', v: 5 });
  assert.equal(r.bonus.capocannoniere, 'sq02|Harry Kane');
  assert.equal(r.bonus.assistman, 'sq04|Mohamed Salah');
  // Paris 6 e Real Madrid 5+1=6: stesso totale → vince chi ha più rossi
  assert.equal(r.bonus.cartellini, 'sq03');
  assert.equal(r.completa, true);
  assert.deepEqual(r.avvisi, []);
});

test('pari merito: nessun bonus proposto e segnalato', () => {
  const uefa = {
    marcatori: [gRiga('Harry Kane', 'Bayern München', 4), gRiga('Kylian Mbappé', 'Real Madrid', 4)],
    assist: [], gialli: [sqRiga('Paris', 3), sqRiga('Liverpool', 3)], rossi: [], partite: [sqRiga('Paris', 3)],
  };
  const r = costruisci(uefa, squadre, rose);
  assert.equal(r.bonus.capocannoniere, null);
  assert.equal(r.pariMerito.capocannoniere.length, 2);
  assert.equal(r.bonus.cartellini, null);
  assert.equal(r.completa, false);
});

test('giocatore non abbinato: avviso e fuori dalla classifica salvata (mai un nome inventato)', () => {
  const uefa = { marcatori: [gRiga('Giocatore Nuovo', 'Real Madrid', 3)], assist: [], gialli: [], rossi: [], partite: [] };
  const r = costruisci(uefa, squadre, rose);
  assert.equal(r.classifiche.marcatori.length, 0);
  assert.ok(r.avvisi.some(a => a.includes('Giocatore Nuovo')));
});

test('norm: accenti, maiuscole e caratteri speciali', () => {
  assert.equal(norm('Ødegaard-Ñandú'), 'odegaard nandu');
});
