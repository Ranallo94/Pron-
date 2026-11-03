/**
 * Championsito — compila le classifiche bonus (marcatori, assistman, cartellini) dalle statistiche UFFICIALI UEFA.
 *
 *   node scripts/championsito/sync-bonus.mjs            → scarica da UEFA, mostra il rapporto, prepara i file
 *   node scripts/championsito/sync-bonus.mjs --bonus    → include nello script anche i BONUS REALI (30 punti ciascuno)
 *
 * Legge ROSE e SQUADRE_UFFICIALI dalla cartella Championsito indicata in PRONO_SATELLITI_DIR (env o .env.local).
 * NON scrive su Firestore: prepara in scripts/championsito/out/ lo script `incolla-in-console.js` da incollare nella
 * console del sito di Championsito, da admin (come gli altri script del progetto). Così i dati veri si toccano solo
 * con la tua mano, dopo aver letto il rapporto.
 *
 * I bonus reali valgono 30 punti: per questo si scrivono solo con --bonus, solo se il leader è UNICO e, di norma,
 * solo a fase a campionato conclusa (tutte le squadre a 8 partite). Con --anche-incompleta si forza per prova.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { costruisci, scaricaUefa } from './uefa.mjs';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function envLocale() {
  const f = join(radice, '.env.local');
  const out = {};
  if (!existsSync(f)) return out;
  for (const riga of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !riga.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

/** Script da incollare nella console del sito di Championsito (da admin): scrive classifiche e, se richiesto, bonus. */
export function scriptConsole({ classifiche, bonus }, { conBonus }) {
  const dati = JSON.stringify({ classifiche, bonus: conBonus ? bonus : null });
  return `/**
 * CHAMPIONSITO — aggiorna le classifiche bonus dalle statistiche UEFA (generato da sync-bonus.mjs)
 * Incolla nella console (F12) del sito di Championsito, da ADMIN e loggato. Chiede conferma prima di scrivere.
 */
(async () => {
  const fb = window._firebase;
  if (!fb || !fb.db) { alert('Firebase non trovato: sei sul sito di Championsito, da loggato?'); return; }
  const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const D = ${dati};
  const righe = (l) => (l || []).slice(0, 3).map((r) => r.g + ' ' + r.v).join(' · ');
  const msg = 'Scrivere su Championsito?\\n\\nMarcatori: ' + righe(D.classifiche.marcatori)
    + '\\nAssist: ' + righe(D.classifiche.assist)
    + '\\nSquadre con cartellini: ' + D.classifiche.cartellini.length
    + (D.bonus ? '\\n\\nBONUS REALI (30 punti ciascuno):\\n' + JSON.stringify(D.bonus) : '\\n\\n(i bonus reali NON vengono toccati)');
  if (!confirm(msg)) { console.log('Annullato.'); return; }
  const patch = { classifiche: D.classifiche, updatedAt: serverTimestamp() };
  if (D.bonus) for (const k of ['capocannoniere', 'assistman', 'cartellini']) if (D.bonus[k]) patch['bonus.' + k] = D.bonus[k];
  await updateDoc(doc(fb.db, 'risultati', 'ufficiali'), patch);
  console.log('✅ Classifiche bonus aggiornate.' + (D.bonus ? ' Ora premi "Ricalcola classifica ora" in Admin → Risultati.' : ''));
})();
`;
}

async function main() {
  const args = process.argv.slice(2);
  const dir = process.env.PRONO_SATELLITI_DIR || envLocale().PRONO_SATELLITI_DIR;
  if (!dir) { console.error('PRONO_SATELLITI_DIR non impostata (env o .env.local).'); process.exit(1); }
  const js = pathToFileURL(join(dir, 'Championsito', 'js')).href;
  const { SQUADRE_UFFICIALI } = await import(`${js}/calendario-ufficiale.js`);
  const { ROSE } = await import(`${js}/rose.js`);

  console.log('Scarico le statistiche UEFA (fase a campionato 2026/27)…');
  const uefa = await scaricaUefa();
  const r = costruisci(uefa, SQUADRE_UFFICIALI, ROSE);

  console.log(`\nPartite giocate per squadra: da ${r.partiteMinMax[0]} a ${r.partiteMinMax[1]} su 8 — fase a campionato ${r.completa ? 'CONCLUSA' : 'in corso'}`);
  const riga = (x) => `  ${String(x.v).padStart(2)}  ${x.nome} (${x.squadra})${x.esito !== 'esatto' ? `  [${x.esito}${x.g ? ' → ' + x.g : ''}]` : ''}`;
  console.log('\n⚽ Marcatori'); r.dettaglio.marcatori.forEach(x => console.log(riga(x)));
  console.log('\n🅰️ Assist'); r.dettaglio.assist.forEach(x => console.log(riga(x)));
  console.log('\n🟨🟥 Cartellini (totale, a parità più rossi)');
  const nomi = Object.fromEntries(SQUADRE_UFFICIALI.map(s => [s.id, s.nome]));
  r.dettaglio.cartellini.slice(0, 6).forEach(c => console.log(`  ${String(c.gialli + c.rossi).padStart(2)}  ${nomi[c.sq]}  (${c.gialli} gialli, ${c.rossi} rossi)`));

  console.log('\nBonus che risulterebbero oggi (solo informativo, valgono a fase conclusa):');
  for (const k of ['capocannoniere', 'assistman', 'cartellini']) {
    console.log(`  ${k}: ${r.bonus[k] ?? '—'}${r.pariMerito[k] ? `  ⚠️ PARI MERITO: ${r.pariMerito[k].join(', ')}` : ''}`);
  }
  if (r.avvisi.length) { console.log('\n⚠️ DA CONTROLLARE:'); r.avvisi.forEach(a => console.log('  - ' + a)); }

  const conBonus = args.includes('--bonus');
  if (conBonus && !r.completa && !args.includes('--anche-incompleta')) {
    console.error('\nI bonus reali NON sono stati inclusi: la fase a campionato non è conclusa (usa --anche-incompleta solo per una prova).');
  }
  const includi = conBonus && (r.completa || args.includes('--anche-incompleta'));
  const out = join(radice, 'scripts', 'championsito', 'out');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'classifiche-bonus.json'), JSON.stringify({ classifiche: r.classifiche, bonus: r.bonus, pariMerito: r.pariMerito }, null, 1));
  writeFileSync(join(out, 'incolla-in-console.js'), scriptConsole(r, { conBonus: includi }));
  console.log(`\nPronto: scripts/championsito/out/incolla-in-console.js ${includi ? '(CON bonus reali)' : '(solo classifiche informative)'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
