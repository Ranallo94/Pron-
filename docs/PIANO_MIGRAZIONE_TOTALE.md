# Pronò! — piano di migrazione di tutte le app in un'unica app

*Redatto il 2026-11-02, dopo le decisioni di oggi: backend **Firebase**, **tutte** le app esistenti dentro Pronò!, niente denaro. Le stime di ore sono mie e vanno tarate dopo la Fase 0. Le date del calendario di F1 oltre il Messico vanno verificate.*

## 1. Principio: non si interrompe niente di vivo

Le app che oggi girano finiscono la loro stagione dove sono. **Le nuove competizioni partono su Pronò!** e le competizioni già concluse si **archiviano** dentro Pronò!. Così non serve un "giorno del trasloco" e nessun gruppo perde un weekend.

| App | Competizioni | Stato oggi | Cosa succede |
|---|---|---|---|
| **Formulito** | 7 GP 2026 (Monza → Messico; seguono gli ultimi della stagione) | Vivo, ogni weekend | Finisce la stagione 2026 sul satellite (ultima gara a dicembre, da verificare). La **F1 2027** (da marzo) parte su Pronò!. I GP 2026 si archiviano |
| **Championsito** | Champions, fase a campionato (36 squadre) | Vivo fino a gennaio | Finisce la Fase 1 sul satellite. La **Fase 2** (febbraio) parte su Pronò!. Serve l'andata/ritorno nel motore |
| **L'ITALIANO** | Serie A, giornate 6–10 | Chiude a giorni | Si archivia l'edizione. La **prossima edizione** parte su Pronò! come competizione pilota |
| **Wimbledino** | Wimbledon 2026 (17 partecipanti) | Concluso | Si importa come archivio |
| **Medusino** | US Open 2026 | Concluso | Si importa come archivio |
| **Mondialito** | Mondiale 2026 (118 partecipanti) | Concluso | Si importa come archivio |

Ogni satellite si **spegne** (sola lettura, poi chiusura) solo dopo che l'archivio è importato e verificato.

## 2. Le fasi

### Fase 0 — Fondamenta (circa 20–30 ore)
- Repository, progetto Firebase unico, struttura del codice con il motore dentro.
- App web installabile (PWA) vuota che parte e si pubblica.
- **Regole di sicurezza multi-competizione scritte e provate con gli emulatori prima di ogni schermata.** Partono da quelle di Formulito (lock lato regole, proprietario protetto) e aggiungono leghe e capitani.
- Pubblicazione automatica (GitHub Actions) e ricalcolo della classifica lato server che si deploya davvero (nei satelliti non si è mai riuscito: è il rischio tecnico più alto).
- **Uscita:** un utente si registra, entra, vede una competizione vuota; le regole rifiutano gli accessi che devono rifiutare, con i test che lo dimostrano.

### Fase 1 — Cuore dell'app (circa 80–120 ore)
- Account unico, profilo, approvazione, ruoli (utente, capitano, admin, proprietario).
- Competizione e **form a ordinamento** (il formato di Formulito), classifica, risultati, regole generate dal descrittore, admin di competizione (risultati, chiusura pronostici).
- Lega pubblica e leghe private con invito via link.
- Conto alla rovescia e temi di edizione (già pronti in Formulito, da portare).
- **Uscita:** una prova generale con un GP di Formulito (stesso risultato di punteggio del satellite, già garantito dai test di parità) giocata da qualche amico.

### Fase 2 — Campionato breve e andata/ritorno (circa 40–60 ore)
- Form a partite con classifica prevista derivata e fasce (L'ITALIANO, Championsito).
- Ciclo di vita delle giornate: provvisoria/definitiva, riapertura, reset, convalida finale (schema-dati §6).
- Vincitore di giornata e turni vinti nell'interfaccia.
- **Motore:** tabelloni a doppia sfida andata/ritorno per la Champions Fase 2.
- **Uscita:** la competizione pilota con i 28 amici de L'ITALIANO e la Fase 2 della Champions configurata.

### Fase 3 — Archivi e identità (circa 30–50 ore)
- Strumenti di esportazione dai 5 progetti Firebase e importazione normalizzata.
- Profili storici da rivendicare (§3).
- **Controllo automatico dell'import:** ogni competizione archiviata viene **ricalcolata dal motore** e confrontata con la classifica salvata dal satellite. Se un totale differisce, l'import si ferma e si indaga.
- Statistiche di stagione, medaglie, badge e albo d'oro **trasversali** a tutte le competizioni (la logica nata in Formulito).
- Descrittori mancanti: Mondialito (gironi + tabellone + capocannoniere + tabella `COMB_3I` delle terze).
- **Uscita:** tutte le competizioni concluse visibili nel profilo di chi le ha giocate.

### Fase 4 — Tabellone e sincronizzazione (circa 60–90 ore)
- Form e grafico del tabellone per tennis e gironi + KO.
- Adapter di sync dei risultati con fonte con licenza (oggi ESPN non ufficiale).
- Notifiche per email; notifiche push solo dopo.
- **Uscita:** Wimbledon 2027 configurabile come competizione; l'Australian Open (metà gennaio) solo se la Fase 4 è pronta in tempo, altrimenti salta.

**Totale stimato: circa 230–350 ore.** È dello stesso ordine delle 300–400 ore del piano di settembre, ma ora include l'archivio di tutto.

## 3. Dati e identità

### 3.1 Come si portano i dati
- **Formato di archivio normalizzato:** per ogni competizione si salvano descrittore, partecipanti (come profili storici), pronostici, risultati ufficiali e classifica finale. Un solo importatore per tutti, con un piccolo convertitore per ciascun satellite.
- **Verifica per ricalcolo:** il motore ricalcola punteggi e classifica e li confronta con quanto salvato dal satellite. È la prova che la migrazione non cambia i risultati.
- **Esportazione:** con le credenziali di servizio di ciascun progetto (il metodo già usato negli script `esporta-*.js` dei satelliti). Le chiavi non entrano mai nel repository.

### 3.2 Persone che compaiono in più app
Gli stessi amici hanno account diversi nei 6 progetti, con email diverse. Mondialito usava email finte (`nome.cognome@…app`), quindi non c'è niente da confrontare con certezza.

**Soluzione: profili storici da rivendicare.** L'importazione non crea account: crea profili storici con nickname, e i partecipanti, quando si registrano su Pronò!, **rivendicano** il proprio (e gli altri collegati) con una conferma dell'admin. Così nessuno viene collegato a un'altra persona per errore, e la storia dell'utente (medaglie, percentuali, albo d'oro) compare dopo la rivendicazione.

### 3.3 Cosa non si migra
- Quote, pagamenti, montepremi e premi in euro (Medusino, Wimbledino e Mondialito li hanno ancora nel codice; nei dati **non** si importano).
- Contatti e numeri di telefono: solo per chi si registra da sé su Pronò!.
- Chiavi di servizio, script con credenziali, file di prova e copie di backup.

### 3.4 Privacy
Chi gestisce Pronò! è titolare del trattamento: servono informativa e base giuridica anche per i dati storici importati (nickname e pronostici di persone reali). Prima di importare ⚖️: informativa a tutti, possibilità di chiedere la cancellazione del profilo storico, età minima 14 anni. Da far rivedere nel preventivo legale già previsto.

## 4. Decisioni di stack (le adotto salvo tuo veto)

| Scelta | Default | Perché |
|---|---|---|
| Linguaggio | **TypeScript** | evita gli errori ricorrenti dei satelliti (array che tornano come oggetti, id duplicati); Node 26 lo esegue senza compilare |
| Interfaccia | **React + Vite** | forme complesse e molte schermate; ecosistema più grande, quindi meno rischio |
| App | **PWA** installabile | niente store per il primo anno (come nel piano) |
| Test regole | **Emulatori Firebase** | richiede Java installato |
| Pubblicazione | **GitHub Actions** | già usata dai satelliti |
| Motore | JavaScript attuale, convertito in TypeScript quando parte lo scheletro | a basso costo |

## 5. Cosa serve da voi (non posso farlo io)

1. **Progetto Firebase unico** ("pronò"): area europea, piano Blaze con carta e **avviso di budget** (consiglio 20 €/mese). Serve un accesso che mi permetta di pubblicare, oppure lo pubblichi tu.
2. **Repository su GitHub**, meglio in un'organizzazione intestata a Pronò! e non a una persona, con te e il cofondatore come proprietari.
3. **Java** (JDK 17 o superiore) sul computer, come Node: serve per gli emulatori che provano le regole di sicurezza.
4. ~~**Dove tenere il codice in locale.**~~ **Deciso: `C:\Pronò!`**, fuori da OneDrive (le migliaia di file di `node_modules` e la cartella `.git` dentro OneDrive rallentano e possono corrompersi). La cartella OneDrive `14-Pronò!` resta archivio dei satelliti e dei materiali, più le copie di lettura dei documenti (`npm run onedrive`). Il percorso con `ò!` è provato con npm, Vite e il test runner di Node; non ancora con Firebase CLI e gli emulatori: se danno problemi, si passa a un percorso senza caratteri speciali (per esempio `C:\Prono`) cambiando solo cartella, il codice non cambia.
5. **Accessi di sola lettura ai progetti dei satelliti** per l'esportazione (Fase 3, non adesso).

> **Aggiornamento 2026-11-03:** la "demo" è diventata una **Beta pubblica funzionante e gratuita**, con utenti veri (vedi [BETA_PUBBLICA.md](./BETA_PUBBLICA.md)). Il consiglio qui sotto di usare un progetto Firebase "di prova" buttabile **non vale più**: con utenti veri il progetto è definitivo e non si migra. Resta valido che dominio, società, organizzazione GitHub e store si possono rimandare.

## 5-bis. Demo per soci e investitori: serve tutto quello di §5? No

Per **mostrare** l'app non servono dominio, società, mail aziendale, organizzazione GitHub né account degli store. Quelli servono per **aprire al pubblico e incassare**. Per una demo basta un'impostazione leggera, a nome personale, pensata per essere buttata o spostata senza dolore.

| Livello | Cosa si fa | Costo | Tempo (stima mia) |
|---|---|---|---|
| **0. Senza costruire niente** | Si presentano le app che già girano come prova di trazione (118 partecipanti al Mondialito, 28 a L'ITALIANO, statistiche di stagione e badge di Formulito), il motore con i suoi test e il quadro di costi e ricavi | 0 € | pochi giorni, per il materiale di presentazione |
| **1. Prototipo cliccabile** | Pagine statiche con dati di esempio (Home, Esplora, competizione, Profilo) che mostrano la struttura e l'identità "Arena". Nessun backend | 0 € | 2–4 giorni |
| **2. Demo funzionante** | Fondamenta + un pezzetto di cuore: account, una competizione a ordinamento giocabile, classifica, lega con invito. Su un progetto Firebase **di prova**, piano gratuito, con ricalcolo nel browser (le funzioni server richiedono la carta) | 0 € | 40–60 ore (Fase 0 + parte della Fase 1) |

**Impostazione leggera, a nome personale:**
- **GitHub:** repository **privato** sul tuo account personale, con i soci invitati come collaboratori. Si trasferisce poi a un'organizzazione senza perdere la cronologia.
- **Firebase:** un progetto **di prova** con nome neutro (per esempio `prono-demo`), piano gratuito senza carta, indirizzo `…web.app`. **Non** è il progetto definitivo: il nome del progetto non si cambia dopo, quindi quello vero si crea più avanti e il codice si ripubblica lì (la demo non ha dati da conservare).
- **Dati:** solo account e dati di prova. Niente dati personali dei partecipanti reali delle vecchie app, niente marchi di terzi nei nomi delle competizioni di esempio, niente soldi.
- **Sicurezza:** anche in demo servono regole di accesso (non "tutto aperto") e la verifica in due passaggi sul tuo account.

**Attenzione a un punto ⚖️:** account e file di Pronò! su infrastrutture **del tuo datore di lavoro** (mail aziendale, OneDrive "Pini Group", computer aziendale) possono creare dubbi su accesso e proprietà. Conviene tenerli su account e dispositivi personali e controllare il contratto di lavoro (esclusiva, proprietà intellettuale).

**Da fare solo prima di aprire al pubblico o incassare:** dominio, mail di Pronò!, organizzazione GitHub, progetto Firebase definitivo con piano Blaze e avviso di budget, informativa privacy, società, account degli store.

## 6. Rischi

- **Ore disponibili.** 230–350 ore sono tante: a 12–15 ore a settimana sono quasi 6 mesi. Se mancano ore salta per primo l'Australian Open, poi le notifiche push, poi la sync automatica (si resta con l'inserimento manuale dei risultati).
- **Cloud Functions.** Nei satelliti non si sono mai riuscite a pubblicare in due casi su tre. Va risolto nella Fase 0, non rimandato.
- **Identità.** Il collegamento tra profili è il pezzo più delicato: meglio manuale e confermato che automatico e sbagliato.
- **Due codici in parallelo** per qualche mese (satelliti vivi + app nuova): le correzioni ai satelliti vanno limitate allo stretto necessario.
- **Mondialito** ha il punteggio più complicato (tabelle, terze ripescate, fasi a eliminazione, capocannoniere): è l'ultimo da portare perché è già concluso.

## 7. Prossimi passi concreti
1. Mi dici dove va il repository (consiglio fuori da OneDrive) e che ti metti d'accordo con l'IT per Java.
2. Crei il progetto Firebase e il repository GitHub, e mi dici il nome del progetto.
3. Io parto dalla **Fase 0**: struttura, regole di sicurezza con test, prima pubblicazione.
