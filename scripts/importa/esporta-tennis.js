/**
 * ESPORTAZIONE per l'importazione in Pronò! — Wimbledino e Medusino (tornei di tennis a tabellone).
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 * COME SI USA
 *   1) Apri il sito della vecchia app, da ADMIN e già loggato:
 *        Wimbledino → https://wimbledino-2026.web.app
 *        Medusino   → https://medusino-2026.web.app
 *   2) Premi F12 → scheda "Console".
 *   3) Incolla TUTTO questo file e premi Invio.
 *   4) Si scarica un file JSON (esportazione_<progetto>_<data>.json): mettilo nella cartella della vecchia app.
 *
 * COSA FA: SOLA LETTURA. Non scrive nulla su Firestore.
 * COSA ESPORTA: nickname dei partecipanti, pronostici, risultati ufficiali, classifica calcolata dal sito.
 * COSA NON ESPORTA (di proposito): telefoni, email, nome e cognome, montepremi, quote e configurazione del sistema.
 */
(async () => {
  const fb = window._firebase;
  if (!fb || !fb.db) { alert('Firebase non trovato: sei sul sito della vecchia app, da loggato?'); return; }
  const { collection, getDocs, doc, getDoc } =
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

  try {
    const partSnap = await getDocs(collection(fb.db, 'partecipanti'));
    const partecipanti = {};
    partSnap.forEach(d => {
      const p = d.data();
      // Solo ciò che serve: l'id (della vecchia app) e il nickname; se manca, il solo nome di battesimo
      partecipanti[d.id] = { nickname: (p.nickname || p.nome || '').trim() };
    });

    const proSnap = await getDocs(collection(fb.db, 'pronostici'));
    const pronostici = {};
    proSnap.forEach(d => { pronostici[d.id] = d.data(); });

    const rd = await getDoc(doc(fb.db, 'risultati', 'ufficiali'));
    const risultati = rd.exists() ? rd.data() : {};
    const cd = await getDoc(doc(fb.db, 'classifica', 'snapshot'));
    const classifica_snapshot = cd.exists() ? cd.data() : {};

    const progetto = fb.app?.options?.projectId || 'progetto';
    const esportazione = {
      _meta: {
        progetto,
        timestamp: new Date().toISOString(),
        n_partecipanti: Object.keys(partecipanti).length,
        n_pronostici: Object.keys(pronostici).length,
        generato_da: 'esporta-tennis.js',
      },
      partecipanti, pronostici, risultati, classifica_snapshot,
    };

    const nome = `esportazione_${progetto}_${new Date().toISOString().slice(0, 10)}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(esportazione, null, 2)], { type: 'application/json' }));
    a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    console.log(`✅ ${nome} — ${esportazione._meta.n_partecipanti} partecipanti, ${esportazione._meta.n_pronostici} pronostici,`,
      `classifica: ${(classifica_snapshot.partecipanti || []).length} righe`);
  } catch (e) {
    console.error('❌ Errore durante l\'esportazione:', e);
  }
})();
