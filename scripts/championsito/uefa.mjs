/**
 * Championsito — bonus (cannonieri, assistman, cartellini) dalle statistiche UFFICIALI UEFA.
 *
 * Fonte: https://compstats.uefa.com/v1 (le stesse API che alimentano le pagine statistiche di UEFA.com), fase
 * "TOURNAMENT" = fase a campionato + eventuale fase finale, ESCLUSE le qualificazioni.
 * Le funzioni qui sono PURE (niente rete né file): le prova uefa.test.mjs.
 */

export const BASE = 'https://compstats.uefa.com/v1';
export const STAGIONE = 2027;   // UEFA indica la stagione 2026/27 con l'anno di chiusura

/** Nomi UEFA che non coincidono con quelli di calendario-ufficiale.js → id squadra di Championsito */
export const ALIAS_SQUADRE = {
  'paris': 'sq01', 'bayern munchen': 'sq02', 'inter': 'sq05', 'man city': 'sq06', 'atleti': 'sq09',
  'b dortmund': 'sq10', 'man utd': 'sq15', 'psv': 'sq18', 'leipzig': 'sq23', 'shakhtar': 'sq26',
  's bratislava': 'sq29', 'stuttgart': 'sq30',
};

/** Minuscolo, senza accenti né punteggiatura, spazi singoli. */
export const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ø/gi, 'o').replace(/ł/gi, 'l').replace(/đ/gi, 'd').replace(/ß/g, 'ss')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Id squadra Championsito per un nome UEFA, oppure null. */
export function idSquadra(nomeUefa, squadre) {
  const n = norm(nomeUefa);
  if (ALIAS_SQUADRE[n]) return ALIAS_SQUADRE[n];
  return squadre.find(s => norm(s.nome) === n)?.id ?? null;
}

/**
 * Trova il giocatore nella rosa di Championsito (stesso nome che gli utenti hanno scelto nei menu: è quello che
 * conta per assegnare i 30 punti). Ritorna { valore: 'sqXX|Nome', esito }.
 *   esito: 'esatto' (stesso nome) | 'cognome' (stesso cognome nella stessa squadra, unico) | 'ambiguo' | 'assente'
 */
export function abbinaGiocatore(nomeUefa, sqId, rose) {
  const rosa = rose[sqId] || [];
  const n = norm(nomeUefa);
  const esatto = rosa.filter(g => norm(g.n) === n);
  if (esatto.length === 1) return { valore: `${sqId}|${esatto[0].n}`, esito: 'esatto' };

  const parole = n.split(' ');
  const cognome = parole[parole.length - 1];
  const iniziale = parole[0]?.[0];
  // Il cognome può essere composto: si prova con le ultime 1, 2 e 3 parole
  const candidati = rosa.filter(g => {
    const m = norm(g.n);
    return [1, 2, 3].some(k => parole.length >= k && m.endsWith(parole.slice(-k).join(' ')) && m.split(' ').length >= k);
  });
  const stessoCognome = candidati.length ? candidati : rosa.filter(g => norm(g.n).split(' ').pop() === cognome);
  if (stessoCognome.length === 1) return { valore: `${sqId}|${stessoCognome[0].n}`, esito: 'cognome' };
  if (stessoCognome.length > 1) {
    const conIniziale = stessoCognome.filter(g => norm(g.n)[0] === iniziale);
    if (conIniziale.length === 1) return { valore: `${sqId}|${conIniziale[0].n}`, esito: 'cognome' };
    return { valore: null, esito: 'ambiguo', candidati: stessoCognome.map(g => g.n) };
  }
  // Ultima risorsa: uno solo in rosa contiene tutte le parole del nome UEFA (es. "Vini Jr" ↔ "Vinícius Júnior" no, ma "Raphinha" sì)
  const contiene = rosa.filter(g => parole.every(p => norm(g.n).includes(p)));
  if (contiene.length === 1) return { valore: `${sqId}|${contiene[0].n}`, esito: 'cognome' };
  return { valore: null, esito: 'assente' };
}

const valore = (riga) => Number(riga.statistics?.[0]?.value) || 0;

/**
 * Costruisce le classifiche nel formato di Championsito (risultati/ufficiali.classifiche) e i bonus proposti.
 * @param {{marcatori:any[], assist:any[], gialli:any[], rossi:any[], partite:any[]}} uefa  risposte grezze UEFA
 * @param {{id:string,nome:string}[]} squadre   SQUADRE_UFFICIALI
 * @param {Record<string,{n:string,p:string}[]>} rose  ROSE
 */
export function costruisci(uefa, squadre, rose, { maxRighe = 30 } = {}) {
  const avvisi = [];
  const nomiSq = Object.fromEntries(squadre.map(s => [s.id, s.nome]));

  // ── Squadre ──
  const perSquadra = {};   // id Championsito → { gialli, rossi, partite }
  const nonAbbinate = new Set();
  const aggiungi = (righe, campo) => {
    for (const r of righe) {
      const id = idSquadra(r.team?.internationalName, squadre);
      if (!id) { nonAbbinate.add(r.team?.internationalName); continue; }
      (perSquadra[id] ||= { gialli: 0, rossi: 0, partite: 0 })[campo] = valore(r);
    }
  };
  aggiungi(uefa.gialli, 'gialli'); aggiungi(uefa.rossi, 'rossi'); aggiungi(uefa.partite, 'partite');
  for (const n of nonAbbinate) avvisi.push(`Squadra UEFA senza abbinamento: ${n} (aggiungi un alias in ALIAS_SQUADRE)`);

  const cartellini = Object.entries(perSquadra)
    .map(([sq, c]) => ({ sq, gialli: c.gialli, rossi: c.rossi }))
    .filter(c => c.gialli > 0 || c.rossi > 0);
  // Regola del bonus: totale decrescente; a parità più rossi
  const ordCart = [...cartellini].sort((a, b) => ((b.gialli + b.rossi) - (a.gialli + a.rossi)) || (b.rossi - a.rossi));

  // ── Giocatori ──
  const giocatori = (righe, etichetta) => {
    const out = [];
    for (const r of righe) {
      const v = valore(r);
      if (v <= 0) continue;
      const sq = idSquadra(r.team?.internationalName, squadre);
      const nome = r.player?.internationalName;
      if (!sq) { out.push({ g: null, v, nome, squadra: r.team?.internationalName, esito: 'squadra-ignota' }); continue; }
      const a = abbinaGiocatore(nome, sq, rose);
      out.push({ g: a.valore, v, nome, squadra: nomiSq[sq], esito: a.esito, candidati: a.candidati });
    }
    // Si tiene la classifica fino alla posizione `maxRighe`, includendo i pari merito dell'ultima
    const soglia = out[maxRighe - 1]?.v ?? 0;
    const tenuti = out.filter((x, i) => i < maxRighe || x.v >= soglia);
    for (const x of tenuti) {
      if (x.esito === 'assente' || x.esito === 'ambiguo' || x.esito === 'squadra-ignota') {
        avvisi.push(`${etichetta}: "${x.nome}" (${x.squadra}) NON abbinato alla rosa di Championsito (${x.esito}${x.candidati ? ': ' + x.candidati.join(' / ') : ''})`);
      }
    }
    return tenuti;
  };
  const marcatori = giocatori(uefa.marcatori, 'Marcatori');
  const assist = giocatori(uefa.assist, 'Assist');

  const salva = (lista) => lista.filter(x => x.g).map(x => ({ g: x.g, v: x.v })).sort((a, b) => b.v - a.v);
  const classifiche = { marcatori: salva(marcatori), assist: salva(assist), cartellini };

  // ── Bonus proposti (solo se il leader è unico) ──
  const leader = (lista) => {
    if (!lista.length) return { stato: 'vuoto' };
    const top = lista.filter(x => x.v === lista[0].v);
    return top.length === 1 ? { stato: 'unico', voce: top[0] } : { stato: 'pari', voci: top };
  };
  const lm = leader(marcatori), la = leader(assist);
  const tot = (c) => c.gialli + c.rossi;
  const topCart = ordCart.filter(c => tot(c) === tot(ordCart[0]) && c.rossi === ordCart[0].rossi);
  const bonus = {
    capocannoniere: lm.stato === 'unico' && lm.voce.g ? lm.voce.g : null,
    assistman: la.stato === 'unico' && la.voce.g ? la.voce.g : null,
    cartellini: topCart.length === 1 ? topCart[0].sq : null,
  };
  const pariMerito = {
    capocannoniere: lm.stato === 'pari' ? lm.voci.map(x => `${x.nome} (${x.squadra})`) : null,
    assistman: la.stato === 'pari' ? la.voci.map(x => `${x.nome} (${x.squadra})`) : null,
    cartellini: topCart.length > 1 ? topCart.map(c => nomiSq[c.sq]) : null,
  };

  // ── Completezza della fase a campionato: ogni squadra ha giocato 8 partite ──
  const partite = Object.values(perSquadra).map(c => c.partite);
  const completa = partite.length === squadre.length && partite.every(p => p >= 8);

  return { classifiche, bonus, pariMerito, completa, partiteMinMax: [Math.min(...partite), Math.max(...partite)], avvisi, dettaglio: { marcatori, assist, cartellini: ordCart } };
}

// ── Rete ─────────────────────────────────────────────────────────────────────
const url = (percorso, params) => `${BASE}/${percorso}?` + new URLSearchParams({
  competitionId: 1, offset: 0, order: 'DESC', seasonYear: STAGIONE, phase: 'TOURNAMENT', ...params,
});

async function chiedi(u) {
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Pronò! sync bonus)' } });
  if (!r.ok) throw new Error(`UEFA ${r.status} su ${u}`);
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(`Risposta UEFA inattesa: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

/** Scarica dalle API UEFA tutto ciò che serve. */
export async function scaricaUefa() {
  const gio = (stats) => chiedi(url('player-ranking', { limit: 60, optionalFields: 'PLAYER,TEAM', stats }));
  const sq = (stats) => chiedi(url('team-ranking', { limit: 50, optionalFields: 'TEAM', stats }));
  const [marcatori, assist, gialli, rossi, partite] = await Promise.all([
    gio('goals'), gio('assists'), sq('yellow_cards'), sq('red_cards'), sq('matches_appearance'),
  ]);
  return { marcatori, assist, gialli, rossi, partite };
}
