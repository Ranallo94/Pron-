# Pronò! — contesto delle app esistenti (satelliti) e mappa di migrazione

*Creato il 2026-10-23 dall'analisi della cartella. Complementare a [CLAUDE.md](../CLAUDE.md) (visione, decisioni di piattaforma), [schema-dati.md](./schema-dati.md) (modello Firestore target) e [PIANO_SVILUPPO_2026-09-14.md](./PIANO_SVILUPPO_2026-09-14.md) (business). Questo file descrive **cosa esiste oggi**, per sapere cosa riusare, cosa riscrivere e cosa evitare nella piattaforma unica.*

## 1. Panorama

Cinque webapp gemelle, tutte vanilla JS (ES modules, nessun build) + Firebase (Firestore, Auth email/password, Hosting, Cloud Functions), ciascuna in un **progetto Firebase separato** con utenti propri. Più un `engine/` nuovo, già generico.

| App | Sport / formato | Progetto Firebase | Stato (da file) | Punteggio |
|---|---|---|---|---|
| **Mondialito** | Calcio, Mondiale 2026: 12 gironi da 4, migliori 8 terze, KO da 32 | `mondialito-2026-test` | Concluso/archiviato; è il capostipite e la fonte di `SPEC_FASE_A_GIRONI.md` | segno 10, esatto +5 (annidato), posto in griglia 10/slot, qualificazione 5/squadra; fasi KO nel `mondialito_db.json` |
| **Wimbledino** | Tennis ATP singolare, tabellone 128, bo5, Wimbledon 2026 | `wimbledino-2026` | Concluso (luglio 2026); contiene anche pagelle/snapshot/teaser | vincitore 1/2/5/12/30/75/180, set 1/1/2/4/10/25/60, bonus stat 25 ("Finale calda") |
| **Medusino** | Tennis, US Open 2026, stesso codice di Wimbledino | `medusino-2026` | Concluso/in chiusura (fine agosto–settembre 2026) | vincitore 1/2/5/12/28/55/100, set 1/1/2/4/9/14/20, bonus stat 15 ("Finale ridotta") |
| **Formulito** | F1, gara a classifica d'arrivo, **multi-competizione** (un GP = una competizione) | `formulito-test` | Attivo: Monza, Madrid, Baku, Bahrain (Sepang), Singapore (con Sprint) | qualifica: pole 10 / posizione 3 / vicino 1; gara: punti F1 sulla posizione esatta + bonus podio 3 + bonus top10 1; 6 bonus da 5; Sprint top 8 |
| **Championsito** | Champions League, fase a campionato (36 squadre, 8 giornate) | `championsito-2026` | **Live** dall'8 set 2026; è la vetrina da chiudere bene | segno 3, esatto +10, bonus 30 ×3, fascia 15/3/8, posizione esatta 40/12/12 (tabella "E", calibrata con Monte Carlo) |

Vincoli di brand: ognuna ha identità propria (Wimbledino verde/viola/lime, Championsito blu UEFA, ecc.). Pronò! ha identità "Arena" (blu notte `#12213b`, arancio `#ff7a33`, Space Grotesk/Inter), vedi CLAUDE.md. **Le app satellite non vengono migrate dentro Pronò!** (decisione 2026-09-03); il piano 14/9 aggiunge però la migrazione del gruppo Championsito sulla Fase 2.

## 2. Architettura comune (il "pattern gemello")

- **Moduli client** in `js/`: `app.js` (router + `STATE`), `auth.js`, `db.js` (wrapper Firestore), `ui.js`, `classifica.js`, `profilo.js` (scheda propria e altrui, con privacy), `live.js`/`risultati.js` (risultati read-only), `admin.js` (approvazioni, risultati, bonus, ricalcolo), `pronostici.js` (form), `punteggi.js`, e un modulo di formato (`bracket.js`, `griglia.js`, `calendario.js`).
- **Collezioni Firestore piatte**: `partecipanti/{uid}` (nome, nickname, isAdmin, isOwner, approvato, disabilitato), `pronostici/{uid}`, `risultati/ufficiali`, `classifica/snapshot`, `sistema/config` (`pronostici_aperti`). Formulito sposta tutto sotto `competizioni/{compId}/...` lasciando `partecipanti` globale: **è il primo passo reale verso il modello multi-competizione di Pronò!** e il suo `firestore.rules` (funzione `pronosticiAperti(compId)`, lock lato regole) è il miglior punto di partenza per le security rules della piattaforma.
- **Dati evento statici** in `<evento>_db.json` (squadre/giocatori/partite/regolamento), copiati in `functions/` al deploy.
- **Sync risultati**: Wimbledino/Medusino usano ESPN (`functions/espn.js`, polling adattivo 2/15/60/720 min, override manuale `manuale: true` mai sovrascritto, matching nomi per cognome). Mondialito usava football-data.org (`FOOTBALL_DATA_API_KEY`, ritenuto "rotto" in seguito). Championsito e Formulito: **inserimento manuale** (Formulito ha `live.js` e `espn.js` minimale). Va sostituito da fornitore con licenza prima di aprire al pubblico (piano §2).
- **Ricalcolo classifica**: previsto come Cloud Function su `risultati/ufficiali`, ma **le Functions non si deployano** (Championsito: `Failed to create function … europe-west1`; Mondialito: errore IAM). Workaround consolidato: ricalcolo **client-side dall'admin** (`ricalcolaClassificaLocale`, snapshot con `calcolataDa: 'admin-browser'`). Conseguenza: **doppia copia del motore** (`js/punteggi.js` ESM e `functions/punteggi.js` CJS) tenuta allineata a mano e verificata da `test_punteggi.js`.
- **Deploy**: file via GitHub → Codespaces `git pull` → `firebase deploy --only hosting[,firestore:rules]`; le rules **non** partono dal push, vanno pubblicate a mano. Workflow Actions in Formulito/Medusino/Wimbledino/Mondialito (`deploy-hosting.yml`, `deploy-functions.yml`).

## 3. Cosa è già stato generalizzato: `engine/`

Funzioni pure, ESM, senza Firebase; `package.json` ha `"test": "node --test engine/test/*.test.js"` (17 test dichiarati verdi il 2026-09-03; **non rieseguiti oggi**, `npm` non è disponibile nella shell: usare `node --test engine/test/*.test.js`).

- `ranking.js` — classifica gironi con criteri dichiarativi, scontri diretti, ordine manuale come ultimo criterio.
- `punteggi.js` — `calcolaPunteggioPartiteGironi` (segno + esatto annidato), `…Qualificazione`, `…PostoGriglia` (gate), `…BracketKO` (forgiving per squadra), `calcolaPunteggioTotale` guidato da `descrittoreTorneo`.
- `bracket.js` — `risolviSlot/risolviBracket`, `calcolaMappaRipescaggio` generica (la tabella FIFA `COMB_3I` resta un plugin), `estraiVincitoriPerTurno`.

**Aggiornamento 2026-11-02:** il motore ora copre anche il bonus "set esatto" del tennis, la propagazione dei turni del bracket con override manuali, la gara a classifica d'arrivo (Formulito), la classifica a 36 con fasce (Championsito), i bonus statistici/una tantum, gli spareggi tra partecipanti e gli slot annullati per ritiri (Medusino `db.sostituiti`). Sono verificati con test di parità sul codice di Formulito, Championsito e Medusino (43 test in tutto). **Ancora fuori dal motore:** tabelloni a doppia sfida andata/ritorno (Champions Fase 2), adapter di sync, bracket propagato dai gironi. Vedi [engine/README.md](../engine/README.md).

## 4. Mappa: formato → cosa serve al motore

Il CLAUDE.md dice che i formati veri sono **due** (bracket KO con gironi a monte; gara a classifica d'arrivo). Dall'analisi dei satelliti ne emerge un terzo caso già in produzione:

| Formato | Esempio reale | Cosa riusare | Gap nel motore |
|---|---|---|---|
| **Bracket KO** | Wimbledino, Medusino | `punteggi.js` (esiti per turno + set, forgiving), `bracket.js`/`bracket.tennis.js`, `giocatore.js` (scheda atleta ESPN), classifiche ace/break/tie-break, `punteggi` Monte Carlo | bonus dettaglio (set) annidato; propagazione turni; sostituzioni; bracket grafico da portare in componente |
| **Gironi + KO** | Mondialito | `SPEC_FASE_A_GIRONI.md`, `engine/*`, UI gironi con classifica live, congelamento admin | `COMB_3I` come plugin; propagazione KO |
| **Gara a classifica d'arrivo** | Formulito | `punteggi.js` (ordinamento 22 piloti, posizione esatta/vicina/podio), `griglia.js` (drag/ordinamento), `competizioni.js` (registro competizioni + flag `sprint`), rules multi-competizione | non esiste ancora in `engine/`; il flag `sprint` è **duplicato** client/Functions: nel descrittore diventa una "sessione" in più |
| **Classifica unica con fasce** (campionato a 36) | Championsito Fase 1 | `ranking.js` su un unico girone, fasce 8/16/12, simulazione `sim_championsito_v2.py` | funzione di qualificazione "per fascia"; bonus una tantum con selettore giocatori (`giocatori.js`, 1.072 giocatori da ESPN) |

Nota di coerenza: CLAUDE.md esclude il "campionato a girone unico lungo tutta la stagione" (tipo Serie A), ma Championsito Fase 1 è un'unica classifica da 36 con 8 giornate: è un **caso intermedio** (si conclude, poi alimenta un KO) e rientra nella decisione "fase a gironi come qualificazione al bracket". Da formalizzare nel descrittore.

## 5. Lezioni e debiti tecnici ricorrenti (da non portare nella piattaforma)

1. **Doppia implementazione** client/server di punteggi e ranking (ESM vs CJS) → un solo modulo condiviso (`engine/`), bundle per le Functions.
2. **Cloud Functions non deployabili** su più progetti (IAM/Cloud Build in `europe-west1`): risolvere **all'inizio** nel progetto Firebase unico, con log di Cloud Build letti. Possibile function vecchia ancora attiva che sovrascrive `classifica/snapshot` (Championsito, punto 2 dello stato lavoro).
3. **Rules Firestore pubblicate a mano**; il blocco "giornata chiusa" in Championsito è solo UI. Nel progetto unico: rules partizionate per competizione/lega scritte **prima** del codice, con lock per sessione/giornata lato regole.
4. **Pronostici orfani** all'eliminazione utente; array Firestore che tornano come oggetti `{0:…}`; `classifica` salvata lato client non affidabile; segno sempre subordinato al risultato.
5. **Id duplicati tra pagine della SPA** (admin ↔ live): prefissare gli id per pagina.
6. **Filesystem montato**: dopo Write/Edit i file possono risultare troncati per `node --check`; i tool Read/Grep sono autoritativi (episodio `js/punteggi.js` troncato in Wimbledino).
7. **Email fittizie** (Mondialito) rendevano impossibile il reset password: Pronò! usa email reali.
8. **File portati a mano nel Codespace**: deploy che salta file nuovi (`giocatori.js`, `rose.js`) → errore MIME `text/html`. Con repository unico e CI va eliminato.
9. **Copie e backup dentro altre cartelle**: `Wimbledino/FORMULITO BACKUP/` è una copia di Formulito; `Medusino/img/` e `Formulito/img/` contengono `wimbledino.png` e `proposte/`; `Wimbledino/` contiene materiale non-codice (pagelle, snapshot, teaser). In migrazione conviene partire da una sola sorgente per app (Formulito/ è la più recente).
10. **Dati sensibili in cartella**: `Mondialito/contatti_mondialito.csv`, export pronostici JSON/xlsx, script con `sa.json` (service account) mai da committare. Nessun repo git locale rilevato in questa cartella.

## 6. Stato e prossimi passi aperti per i satelliti

- **Championsito**: Cloud Functions da sistemare (rifiuto utente non cancella l'account Auth), podio 50/30/20 da confermare, Fase 2 KO da progettare (competizione separata, classifica da zero, ingresso dalle fasce), sync automatico non implementato, PDF soci senza precisazione cartellini rossi.
- **Formulito**: aggiungere i GP restanti 2026 al registro `COMPETIZIONI`; aggiornare in parallelo `haSprint` nelle Functions (lista duplicata); `migra_monza_a_competizioni.js` e rules `LEGACY` da rimuovere a migrazione completata.
- **Wimbledino / Medusino / Mondialito**: archivio storico (regole, simulazioni, UI); non sono in sviluppo.

## 7. Come usare questo contesto nelle prossime sessioni

- Per **un nuovo formato** parti da `engine/` + la riga corrispondente della tabella al §4; scrivi il `descrittoreTorneo` e i test, non nuovo codice per torneo.
- Per **security rules / multi-competizione** parti da `Formulito/firestore.rules` e dal modello `competitions/{id}/…` di schema-dati.md.
- Per **calibrare un punteggio** riusa il metodo Monte Carlo (`Championsito/simulazione/sim_championsito_v2.py`, script tennis citati in `MEMORY_EXPORT_wimbledino-mondialito.md`): metriche di suspense (P(chi guida vince), partecipanti ancora in corsa prima dell'ultima giornata, Spearman abilità↔classifica).
- Il **vecchio ordine di verità** è: codice > `CLAUDE.md`/`schema-dati.md` > spec dei satelliti (`SPEC_FASE_A_GIRONI.md`, `STATO_LAVORO_2026-09-12.md`, `HANDOFF_PROGETTO.md`, `MEMORY_EXPORT_…`), quest'ultimi datati giugno–settembre 2026.
- Nome della cartella: **`14-Pronò!`** (con il punto esclamativo): chi scrive percorsi senza `!` non la trova.
