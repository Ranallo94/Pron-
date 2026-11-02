# Pronò! — brief di progetto

## Dove vive il progetto (dal 2026-11-02)
- **Repository Git: `C:\Pronò!`** (versione di riferimento; poi su GitHub). Nessun percorso assoluto nel codice: i percorsi che cambiano da un computer all'altro stanno in `.env.local` (vedi `.env.example`). Su un PC nuovo: [README.md](./README.md).
- **Cartella OneDrive `14-Pronò!`:** contiene le **vecchie app** (satelliti), i materiali (grafiche, PDF, fogli di calcolo) e le **copie di lettura** dei documenti, aggiornate con `npm run onedrive`, per consultarli dal telefono. Non si modifica lì il codice né i documenti: si modifica il repository.
- I test di parità con le vecchie app leggono la loro cartella da `PRONO_SATELLITI_DIR`; se manca, vengono saltati.

## Cos'è
App di pronostici sportivi tra amici, multi-sport fin dal lancio (non un singolo torneo come Wimbledino/Medusino, ma la piattaforma ombrello che li può contenere entrambi come "competizioni" al suo interno).

Nome: **Pronò!** (accento grave sulla o, punto esclamativo nel branding/logo). Store name suggerito: "Pronò! – Pronostici tra amici". Vedi decisione di naming completa nella memoria di sessione.

## Eredità da Wimbledino / Medusino
Wimbledino (tennis, Wimbledon 2026) e Medusino (tennis, US Open 2026) sono webapp gemelle: stesso codice vanilla JS + Firebase, palette/dati diversi. Pronò! non è un terzo clone — è il tentativo di generalizzare quel pattern a *qualsiasi sport e formato*, così le prossime competizioni si configurano invece di essere riscritte.

Cosa ha funzionato in Wimbledino/Medusino e va portato avanti come **principio**, generalizzato:

- **Sync risultati gratuito da fonti pubbliche (ESPN API)**, polling adattivo in base a "c'è una partita in corso/imminente", con override manuale admin che l'API non sovrascrive mai. Da generalizzare: ogni sport ha la sua fonte dati e il suo parser, ma l'orchestrazione (polling adattivo, lock su override manuali, sync log) può essere lo stesso motore.
- **Punteggi calcolati da uno schema dichiarativo per fase** (esiti + bonus, "forgiving per giocatore": conta chi avanza, non l'esatto avversario), validato con simulazione Monte Carlo prima di adottarlo. Da generalizzare: uno schema-punteggi per sport/formato, non hardcoded come in Wimbledino.
- **Login email reale + Auth Firebase**, pannello admin con approvazione utenti, toggle apertura/chiusura pronostici.
- **Bracket/tabellone grafico riusabile** per sport a eliminazione diretta (tennis, ma anche calcio a gironi+KO); per sport senza bracket (es. campionati a girone unico, gare individuali tipo F1) serve un componente di visualizzazione diverso.
- **Classifiche bonus editabili da admin** (es. ace/break/tie-break nel tennis) — generalizzabile a "statistiche extra per sport" configurabili.
- **Scheda giocatore/atleta con dati live** (ranking, forma recente) da fonte pubblica.

## Cosa deve cambiare rispetto a Wimbledino (architetturalmente)
Wimbledino ha regole tennis, sync ESPN tennis e bracket a 128 hardcoded nel codice. Per Pronò! multi-sport, il codice deve separare **motore generico** da **configurazione per sport/competizione**:

1. **Modello "competizione"**: ogni competizione (es. "Tennis — Wimbledon 2027", "Calcio — Mondiale 2026") ha un `tipo_sport`, un formato (bracket KO / girone / classifica individuale), una fonte dati, e uno schema punteggi — tutto configurabile, non nuovi file JS per ogni evento.
2. **Motore di sync pluggable**: un adapter per fonte dati (ESPN tennis, ESPN calcio, altre API) dietro un'interfaccia comune (fetch → match conclusi → propagazione).
3. **Descrittore di torneo dichiarativo**: struttura gironi, criteri di ranking, regole di qualificazione, bracket e tabella punti come dati (JSON/config), non funzioni scritte ad hoc per torneo — un motore unico li interpreta. Vedi [schema-dati.md](./docs/schema-dati.md) "Idea chiave #2".
4. **UI dei pronostici modulare per formato**: form "vincitore + set" (tennis) è un caso specifico di "pronostico su esito match"; un girone di calcio o una gara F1 hanno form diversi. Serve un set di componenti per formato, selezionati dalla config della competizione.
5. **Un utente, più competizioni**: a differenza di Wimbledino/Medusino (ogni progetto Firebase = una competizione, utenti da riregistrare), Pronò! dovrebbe avere un account utente unico che partecipa a più competizioni contemporaneamente.

## Decisioni prese (2026-09-03)

**Sport/formati al lancio.** Focus su competizioni **a eliminazione diretta**: tennis (bracket KO, come Wimbledino/Medusino), calcio a gironi+KO, basket, rugby, Olimpiadi. Eventuali fasi a girone/preliminari sono trattate **solo come qualificazione** al tabellone a eliminazione diretta (non come formato a sé stante con classifica propria). La gara individuale (F1/ciclismo — pronostico su ordine d'arrivo/podio per gara di calendario) è un formato riconosciuto ma non prioritario per il primo pilota. Formato "campionato a girone unico lungo tutta la stagione" (tipo Serie A) **escluso** dal lancio.
→ Implicazione architetturale: il motore-competizione deve trattare "fase a gironi" come sotto-stato interno di una competizione a bracket (produce le qualificazioni agli slot del tabellone), non come un modulo di formato indipendente. I formati veri e propri da progettare sono quindi due: **bracket KO** (con eventuale fase a gironi a monte) e **gara a classifica d'arrivo**.

**~~Wimbledino e Medusino restano satelliti indipendenti.~~ SUPERATA il 2026-11-02:** tutte le app esistenti (Mondialito, Wimbledino, Medusino, Formulito, Championsito, L'ITALIANO) migrano in un'unica app. Pronò! resta una piattaforma nuova, con proprio progetto Firebase; i satelliti vengono congelati a fine competizione, archiviati dentro Pronò! e spenti. Vedi [PIANO_MIGRAZIONE_TOTALE.md](./docs/PIANO_MIGRAZIONE_TOTALE.md).

**Modello di iscrizione e leghe.** Fase 1 (lancio): competizione pubblica unica, iscrizione con **approvazione admin** (come oggi in Wimbledino). Fase 2 (evoluzione pianificata, stesse regole/punteggi della competizione, cambia solo l'ambito): un utente può creare una **lega privata** tra amici dentro una competizione, e può partecipare sia alla lega privata sia (facoltativamente) alla competizione pubblica con lo stesso pronostico.
→ Implicazione dati: il livello "pronostico" e "punteggio" va tenuto disaccoppiato dal livello "classifica" — la stessa entry di pronostico deve poter alimentare più classifiche (quella pubblica + quella/e di lega) senza duplicare i dati. Una competizione quindi ha N leghe (almeno una implicita, quella "pubblica"), ogni lega ha una sua classifica calcolata sugli stessi pronostici/punteggi grezzi.

**Backend: un unico progetto Firebase.** Tutte le competizioni (e le future leghe) vivono come sotto-collezioni Firestore in un solo progetto, un solo Auth condiviso da tutti gli utenti. Deciso perché è l'unica architettura compatibile con "un utente, un login, iscritto a più competizioni/leghe" — con progetti Firebase separati per competizione (come Wimbledino/Medusino oggi) le leghe private annidate non sarebbero realizzabili senza un sistema di identità federata, complessità non necessaria qui. Contropartita da tenere a mente in fase di implementazione: security rules Firestore disegnate con attenzione per partizionare i permessi tra competizioni/leghe (un admin di lega non deve poter toccare dati di un'altra lega o della competizione pubblica).

**Identità visiva: direzione "Arena".** Palette blu notte da stadio (`#12213b` primario, `#1b2e50` superfici) + accento arancio fischietto (`#ff7a33`), font titoli **Space Grotesk**, testo **Inter**. Non si riusa verde/viola/lime di Wimbledino (che resta identità dei satelliti). Concetto guida del marchio: il **bracket/tabellone** (non il pronostico in sé) — il logo-mark è un tabellone stilizzato le cui linee convergono a stella; il bracket in miniatura, col percorso dell'utente evidenziato in arancio, è anche l'elemento visivo centrale della Home (non solo il logo). Esplorato anche un rebrand del nome stesso attorno a "bracket" (scartate "Brackly", già un prodotto concorrente identico — generatore di tabelloni su brackly.gg — e "Bracketto", libera ma alla fine non scelta): **il nome resta Pronò!**, il concetto-bracket vive nell'identità visiva.

**Struttura app: 4 sezioni (tab bar).**
1. **Home** — "In evidenza" (competizioni con azione richiesta ora, es. scadenza pronostico) sopra; "Notizie per te" (feed passivo: risultati, movimenti nelle leghe) sotto.
2. **Esplora** — motore di scoperta: competizioni consigliate/di tendenza tra i propri amici, sfoglia per sport, eventi futuri non ancora aperti.
3. **Profilo** — statistiche aggregate personali (piazzamenti, % esiti indovinati) + elenco delle proprie leghe (pubblica e private) con posizione in classifica. Punto d'accesso unico sia allo storico pronostici sia alle leghe.
4. **Impostazioni** — sport di interesse (filtro a monte: determina cosa appare in Esplora e quali notizie arrivano in Home), notifiche, account, privacy pronostici.

**Sport pilota: calcio a gironi + KO, formato generico.** Non legato a una competizione reale specifica per ora (niente vincoli di date/fonte-dati reale da subito) — si testa il motore con un torneo di prova o dati fittizi. Scelto proprio perché più complesso del tennis: introduce da subito la fase a gironi come qualificazione al bracket, quindi valida l'astrazione più a fondo rispetto a partire dal tennis (che è già un caso risolto, quello di Wimbledino).
→ **Pronostico sulla fase a gironi (aggiornato 2026-09-03, dopo `SPEC_FASE_A_GIRONI.md` dal progetto reale Mondialito 2026 — supera la decisione iniziale)**: l'utente **non** pronostica il piazzamento direttamente. Pronostica il **risultato di ogni partita del girone**; classifica, qualificate e slot del bracket sono **derivati automaticamente** in un modello a tre livelli (partita → classifica girone → griglia). Un solo gesto d'input alimenta più voci di punteggio (segno corretto, risultato esatto, posto in griglia, qualificazione). Dettagli completi, incluso il meccanismo di spareggio manuale e il congelamento classifiche lato admin, in [schema-dati.md](./docs/schema-dati.md) §3.
→ Il pattern architetturale generale è un **descrittore di torneo** dichiarativo (struttura gironi, criteri di ranking, regole di qualificazione, bracket, tabella punti) interpretato da un motore unico — sostituisce quello che qui sotto era ancora chiamato "motore punteggi dichiarativo" come concetto a sé. Vedi schema-dati.md §"Idea chiave #2".

**Leghe private (fase 2): creazione libera con admin di lega.** Qualunque utente iscritto alla competizione pubblica può creare una lega privata e ne diventa admin (approva membri, gestisce/elimina la lega). Coerente col modello "competizione pubblica con approvazione admin" già in uso — stesso pattern ripetuto a livello di lega, con l'utente creatore nel ruolo che oggi ha l'admin unico della competizione.

## Piano di sviluppo e sostenibilità (2026-09-14)
Scenario completo — vincoli normativi (niente denaro in-app, niente affiliazioni bookmaker), prodotto/MVP agganciato al calendario sportivo 2026-27, meccanismo di diffusione "capitano di lega", ricavi (Pro utente 9,99 €/anno, Lega Pro, B2B), costi per stadio, tre scenari a 24 mesi con criteri kill/continue — in [PIANO_SVILUPPO_2026-09-14.md](./docs/PIANO_SVILUPPO_2026-09-14.md). Ipotesi concordate: startup vera, soldi fuori dall'app, Andrea + 1-2 persone, partenza dai gruppi attuali.

## App esistenti (satelliti) e migrazione
Inventario di Mondialito, Wimbledino, Medusino, Formulito, Championsito (stack, progetti Firebase, punteggi, stato, debiti tecnici, mappa formato → motore) in [CONTESTO_APP_ESISTENTI.md](./docs/CONTESTO_APP_ESISTENTI.md). Il gruppo di Championsito è il primo candidato a migrare (Fase 2 su Pronò!, feb 2027); Formulito è già multi-competizione e fornisce le security rules di partenza.

## Schema dati
Modello Firestore dettagliato (competizione → leghe → pronostici/risultati/classifiche, schema punteggio dichiarativo, interfaccia adapter sync) in [schema-dati.md](./docs/schema-dati.md).

## Decisioni del 2026-11-03: Beta pubblica
- **Si costruisce una Beta funzionante in tutto**, con utenti veri che entrano, competono e invitano gli amici. **Tutto gratuito: niente soldi, pubblicità o abbonamenti.** Obiettivi: affinare il gioco sulle competizioni, **testare le funzioni che saranno premium** (accese per tutti, dietro interruttori per piano, con conteggi d'uso propri) e far girare il **passaparola**. Piano, vincoli e tempi in [BETA_PUBBLICA.md](./docs/BETA_PUBBLICA.md).
- **Progetto Firebase: `prono-arena`** (account personale, Firestore `europe-west8` Milano, edizione Standard, app web "Pronò!"). Collegato in `.firebaserc`; la configurazione web sta in `.env.local` (ignorato da Git). Sito pubblico **online dal 2026-11-03: https://prono-beta.web.app** (secondo sito Hosting del progetto; pubblicazione con `npm run deploy`, previo `firebase login`). Le regole di Firestore pubblicate sono **tutte chiuse**: nessuna lettura né scrittura finché non sono scritte e provate quelle vere.
- **Niente Google Analytics.** L'app non importa mai `firebase/analytics` né altri strumenti di tracciamento di terzi (niente banner cookie): le statistiche d'uso sono solo conteggi propri. Se il progetto Firebase è stato creato con Analytics attivo, il valore `measurementId` nella configurazione si ignora.
- **Progetto Firebase definitivo fin da subito** (non di prova): con utenti veri non si migra. Piano Blaze con avviso di budget, area europea, privacy e cancellazione account da subito.
- **Conseguenza sulla migrazione:** i dati storici dei satelliti arrivano in un secondo momento; la Beta parte con competizioni nuove.

## Decisioni del 2026-11-02 (sera)
- **Backend: Firebase, confermato.** La prova su Supabase non si fa. Il confronto resta in [CONFRONTO_BACKEND_FIREBASE_SUPABASE.md](./docs/CONFRONTO_BACKEND_FIREBASE_SUPABASE.md) come riferimento per i costi. Le regole di sicurezza multi-competizione e il ricalcolo lato server vanno progettati e provati con gli emulatori **prima** del codice dell'app.
- **Migrazione di tutte le app esistenti** in un'unica app: Mondialito, Wimbledino, Medusino, Formulito, Championsito, L'ITALIANO. Piano per fasi in [PIANO_MIGRAZIONE_TOTALE.md](./docs/PIANO_MIGRAZIONE_TOTALE.md).
- **L'ITALIANO** è di un amico che è anche **cofondatore** di Pronò!: nessun vincolo sul riuso di codice e grafica. Il **Conto del Bar** è un elemento goliardico senza funzione pratica: nessuna priorità, al massimo un'etichetta.
- **Niente soldi, anche nei dati storici:** nella migrazione non si portano quote, pagamenti, montepremi né premi in euro dei satelliti.

## Decisioni del 2026-11-02
- **Anche eventi non sportivi:** la piattaforma ospita competizioni tipo X Factor, MasterChef e simili, oltre agli sport. Il formato a ordinamento del motore le copre già; restano da definire categorie, fonte dei risultati (inserimento manuale) e calendario degli eventi.
- **Nessun denaro nell'app, confermato.** Niente quote, pagamenti, montepremi o ripartizioni di premi in euro, in nessuna forma. Da Formulito sono stati tolti: scheda Admin "Montepremi", sezione "Premi" del Regolamento, funzione `setPagamento` e relativi stili; resta da lanciare `Formulito/rimuovi_dati_montepremi.js` (prima in modalità prova) per cancellare i dati già salvati su Firestore. Medusino, Wimbledino, Mondialito e la copia in `Wimbledino/FORMULITO BACKUP` conservano ancora il vecchio codice, perché restano archivi.
- **L'ITALIANO entra in Pronò!** Gioco sulla Serie A 2026/27 (giornate 6–10, 28 partecipanti) ricreato da un amico a partire da Championsito. Le regole sono già nel motore (`engine/descrittori/litaliano-serie-a.js`, 56 test); l'app e i dati dei partecipanti seguono con lo scheletro. Diventa la **competizione pilota** al posto del calcio con dati finti. Il "campionato breve a giornate" rientra tra i formati; resta escluso solo il campionato lungo tutta la stagione. Dettagli in [MIGRAZIONE_LITALIANO.md](./docs/MIGRAZIONE_LITALIANO.md).
- Quadro completo di struttura, costi e ricavi in [QUADRO_APP_STRUTTURA_COSTI_RICAVI.md](./docs/QUADRO_APP_STRUTTURA_COSTI_RICAVI.md).

## Scelta del backend (in corso, 2026-11-02)
Confronto Firebase vs Supabase con costi e prova di 1–2 giorni per decidere in [CONFRONTO_BACKEND_FIREBASE_SUPABASE.md](./docs/CONFRONTO_BACKEND_FIREBASE_SUPABASE.md). Il motore (`engine/`) è puro calcolo e non dipende dalla scelta.

## Stack di riferimento (da Wimbledino, da confermare o rivedere)
Vanilla JS + Firebase (Firestore, Auth Email/Password, Cloud Functions su piano Blaze per il sync schedulato, Hosting). Nessun framework frontend. Deploy via GitHub Actions / Codespaces.
