/**
 * engine/ranking.js
 *
 * Motore di classifica gironi — generico, parametrizzato dal "descrittore di
 * torneo" (vedi ../schema-dati.md §3, §3.3). Non conosce lo sport: riceve
 * partite con valori numerici generici (gol, set, punti...) e un elenco
 * ordinato di criteri di ranking.
 *
 * Funzioni pure, nessuna dipendenza esterna (riusabili sia lato client sia
 * nelle Cloud Functions).
 */

/**
 * Aggrega le statistiche grezze di ogni squadra di un girone dalle partite
 * già giocate (o pronosticate). Ignora le partite non ancora compilate
 * (valori non numerici) e le partite fra squadre non in questo girone.
 *
 * @param {Array<{casa:string, trasferta:string, valoreCasa:number, valoreTrasferta:number}>} partiteGirone
 * @param {string[]} squadre
 * @param {{vittoria:number, pareggio?:number|null, sconfitta:number}} puntiPartita
 *   `pareggio` è null/assente per sport senza pareggio (es. tennis a squadre):
 *   in quel caso una partita con valori uguali viene ignorata (dato non valido).
 * @param {Record<string,string>} [nomi]  nome leggibile per id: serve solo al
 *   criterio 'nome' (ultimo fallback alfabetico, deterministico).
 */
export function aggregaStatistiche(partiteGirone, squadre, puntiPartita, nomi) {
  const stats = {};
  for (const id of squadre) {
    stats[id] = {
      squadraId: id,
      nome: (nomi && nomi[id]) ?? id,
      partiteGiocate: 0,
      vittorie: 0,
      pareggi: 0,
      sconfitte: 0,
      golFatti: 0,
      golSubiti: 0,
      punti: 0,
    };
  }

  for (const p of partiteGirone) {
    if (!Number.isFinite(p.valoreCasa) || !Number.isFinite(p.valoreTrasferta)) continue;
    const casa = stats[p.casa];
    const trasferta = stats[p.trasferta];
    if (!casa || !trasferta) continue;

    casa.partiteGiocate++;
    trasferta.partiteGiocate++;
    casa.golFatti += p.valoreCasa;
    casa.golSubiti += p.valoreTrasferta;
    trasferta.golFatti += p.valoreTrasferta;
    trasferta.golSubiti += p.valoreCasa;

    if (p.valoreCasa > p.valoreTrasferta) {
      casa.vittorie++;
      trasferta.sconfitte++;
      casa.punti += puntiPartita.vittoria;
      trasferta.punti += puntiPartita.sconfitta;
    } else if (p.valoreCasa < p.valoreTrasferta) {
      trasferta.vittorie++;
      casa.sconfitte++;
      trasferta.punti += puntiPartita.vittoria;
      casa.punti += puntiPartita.sconfitta;
    } else {
      if (puntiPartita.pareggio == null) continue; // sport senza pareggio: valori uguali = dato non valido
      casa.pareggi++;
      trasferta.pareggi++;
      casa.punti += puntiPartita.pareggio;
      trasferta.punti += puntiPartita.pareggio;
    }
  }

  for (const s of Object.values(stats)) s.differenzaReti = s.golFatti - s.golSubiti;
  return stats;
}

function valoreCriterio(stat, criterio) {
  switch (criterio) {
    case 'punti': return stat.punti;
    case 'differenzaReti': return stat.differenzaReti;
    case 'golFatti': return stat.golFatti;
    case 'vittorie': return stat.vittorie;
    default: return 0;
  }
}

// Confronto decrescente sui criteri "oggettivi" (esclude scontriDiretti/ordineManuale,
// gestiti a parte perché richiedono ricalcoli sui sottogruppi).
// 'nome' è l'unico criterio crescente (ordine alfabetico): è un fallback
// deterministico, non un vero criterio sportivo — con 'nome' due squadre
// diverse non sono mai "in parità".
function confrontaOggettivo(a, b, criteriRanking) {
  for (const c of criteriRanking) {
    if (c === 'scontriDiretti' || c === 'ordineManuale') continue;
    if (c === 'nome') {
      const alfa = String(a.nome).localeCompare(String(b.nome));
      if (alfa !== 0) return alfa;
      continue;
    }
    const diff = valoreCriterio(b, c) - valoreCriterio(a, c);
    if (diff !== 0) return diff;
  }
  return 0;
}

function raggruppaPari(ordinati, stats, criteriRanking) {
  const gruppi = [];
  let corrente = [ordinati[0]];
  for (let i = 1; i < ordinati.length; i++) {
    if (confrontaOggettivo(stats[ordinati[i]], stats[ordinati[i - 1]], criteriRanking) === 0) {
      corrente.push(ordinati[i]);
    } else {
      gruppi.push(corrente);
      corrente = [ordinati[i]];
    }
  }
  gruppi.push(corrente);
  return gruppi;
}

/**
 * Calcola la classifica di un girone: criteri oggettivi, poi scontri diretti
 * (mini-classifica sulle sole partite fra le squadre ancora in parità), poi
 * ordine manuale come ultimo criterio — applicato SOLO se copre esattamente
 * le squadre ancora in parità (altrimenti decade, vedi schema-dati.md §3.3).
 *
 * @returns {{ ordine:string[], stats:object, gruppiParitari:string[][] }}
 *   gruppiParitari = sottoinsiemi rimasti in parità perfetta anche dopo gli
 *   scontri diretti: la UI mostra le frecce di spareggio solo per questi.
 */
export function classificaGirone({ partiteGirone, squadre, criteriRanking, puntiPartita, ordineManuale, nomi }) {
  const stats = aggregaStatistiche(partiteGirone, squadre, puntiPartita, nomi);

  // Regolamenti con gli scontri diretti IN POSIZIONE (es. Serie A: punti → punti negli
  // scontri diretti → differenza reti negli scontri diretti → differenza reti generale…):
  // un criterio 'h2h.<campo>' si applica solo alle squadre ancora in parità a quel punto.
  if (criteriRanking.some(c => c.startsWith('h2h.'))) {
    return classificaSequenziale({ partiteGirone, squadre, criteriRanking, puntiPartita, ordineManuale, nomi, stats });
  }

  const usaScontriDiretti = criteriRanking.includes('scontriDiretti');

  const ordinatiPerCriteriOggettivi = [...squadre].sort((a, b) =>
    confrontaOggettivo(stats[a], stats[b], criteriRanking)
  );
  const gruppi = raggruppaPari(ordinatiPerCriteriOggettivi, stats, criteriRanking);

  const gruppiParitari = [];
  const ordineFinale = [];

  for (const gruppo of gruppi) {
    if (gruppo.length === 1) {
      ordineFinale.push(gruppo[0]);
      continue;
    }

    let sottoOrdine = gruppo;

    if (usaScontriDiretti) {
      const criteriH2H = criteriRanking.filter(c => c !== 'scontriDiretti' && c !== 'ordineManuale');
      const partiteInterne = partiteGirone.filter(p => gruppo.includes(p.casa) && gruppo.includes(p.trasferta));
      const statsH2H = aggregaStatistiche(partiteInterne, gruppo, puntiPartita, nomi);

      sottoOrdine = [...gruppo].sort((a, b) => confrontaOggettivo(statsH2H[a], statsH2H[b], criteriH2H));
      for (const sottoGruppo of raggruppaPari(sottoOrdine, statsH2H, criteriH2H)) {
        if (sottoGruppo.length > 1) gruppiParitari.push(sottoGruppo);
      }
    } else {
      gruppiParitari.push(gruppo);
    }

    if (ordineManuale && ordineManuale.length) {
      const posizioneManuale = new Map(ordineManuale.map((id, i) => [id, i]));
      const copreTuttoIlSottoOrdine = sottoOrdine.every(id => posizioneManuale.has(id));
      if (copreTuttoIlSottoOrdine) {
        sottoOrdine = [...sottoOrdine].sort((a, b) => posizioneManuale.get(a) - posizioneManuale.get(b));
      }
      // se l'ordine manuale salvato non copre (più) esattamente questo sottogruppo,
      // viene ignorato: è la regola "decade se la parità si rompe".
    }

    ordineFinale.push(...sottoOrdine);
  }

  return { ordine: ordineFinale, stats, gruppiParitari };
}

// ── CRITERI SEQUENZIALI (scontri diretti in posizione) ──────────────────

function ordineManualeSuGruppo(gruppo, ordineManuale) {
  if (!ordineManuale || !ordineManuale.length) return gruppo;
  const pos = new Map(ordineManuale.map((id, i) => [id, i]));
  // l'ordine manuale vale solo se copre esattamente il gruppo ancora in parità, altrimenti decade
  return gruppo.every(id => pos.has(id)) ? [...gruppo].sort((a, b) => pos.get(a) - pos.get(b)) : gruppo;
}

/**
 * Applica UN criterio a un gruppo di squadre ancora in parità e lo divide in
 * sottogruppi ordinati (dal migliore). Criteri:
 *   'punti' | 'differenzaReti' | 'golFatti' | 'vittorie'  → statistiche generali
 *   'h2h.<campo>'  → stesse statistiche ma SOLO sulle partite fra le squadre del gruppo
 *   'nome'         → ordine alfabetico crescente (ultimo fallback deterministico)
 */
function raffinaGruppo(gruppo, criterio, { partiteGirone, stats, puntiPartita, nomi }) {
  let chiave;
  let crescente = false;
  if (criterio.startsWith('h2h.')) {
    const campo = criterio.slice(4);
    const interne = partiteGirone.filter(p => gruppo.includes(p.casa) && gruppo.includes(p.trasferta));
    const statsInterne = aggregaStatistiche(interne, gruppo, puntiPartita, nomi);
    chiave = id => valoreCriterio(statsInterne[id], campo);
  } else if (criterio === 'nome') {
    chiave = id => String(stats[id].nome);
    crescente = true;
  } else {
    chiave = id => valoreCriterio(stats[id], criterio);
  }

  const confronta = (a, b) => {
    const ka = chiave(a), kb = chiave(b);
    if (typeof ka === 'string') return crescente ? ka.localeCompare(kb) : kb.localeCompare(ka);
    return kb - ka;
  };
  const ordinato = [...gruppo].sort(confronta);
  const sottogruppi = [];
  let corrente = [ordinato[0]];
  for (let i = 1; i < ordinato.length; i++) {
    if (confronta(ordinato[i - 1], ordinato[i]) === 0) corrente.push(ordinato[i]);
    else { sottogruppi.push(corrente); corrente = [ordinato[i]]; }
  }
  sottogruppi.push(corrente);
  return sottogruppi;
}

function classificaSequenziale({ partiteGirone, squadre, criteriRanking, puntiPartita, ordineManuale, nomi, stats }) {
  const ctx = { partiteGirone, stats, puntiPartita, nomi };
  let gruppi = squadre.length ? [[...squadre]] : [];

  for (const criterio of criteriRanking) {
    if (criterio === 'sorteggio' || criterio === 'ordineManuale' || criterio === 'scontriDiretti') continue;
    gruppi = gruppi.flatMap(g => (g.length === 1 ? [g] : raffinaGruppo(g, criterio, ctx)));
  }

  // Le parità rimaste dopo TUTTI i criteri (es. "sorteggio" ancora da fare) restano
  // evidenziate: non si inventano posizioni. L'ordine manuale può risolverle.
  const gruppiParitari = gruppi.filter(g => g.length > 1);
  const ordine = gruppi.flatMap(g => (g.length > 1 ? ordineManualeSuGruppo(g, ordineManuale) : g));
  return { ordine, stats, gruppiParitari };
}
