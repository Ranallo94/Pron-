# Migrazione de L'ITALIANO dentro Pronò!

*Stato al 2026-11-02. L'ITALIANO è il gioco sulla Serie A 2026/27 (giornate 6–10, prova generale con 28 partecipanti) che un amico ha ricreato dalla struttura di Championsito. Qui si dice cosa è già migrato, cosa no e cosa serve per finire.*

## 1. Cosa è già dentro Pronò!

Le **regole** sono state tradotte in dati e verificate con test (56 in tutto, tutti verdi). Non ho copiato codice dell'amico: ho letto il suo Regolamento e l'ho riscritto sul motore.

| Regola del regolamento | Dove vive ora | Verifica |
|---|---|---|
| Segno +10, esatto +6 in aggiunta (16) | `descrittori/litaliano-serie-a.js` → `tabellaPunti.gironi` | test |
| Classifica prevista derivata dai risultati esatti | motore già esistente (`classificaGirone`) | test |
| Ordine delle squadre: punti → scontri diretti (punti, poi differenza reti) → differenza reti generale → gol fatti → sorteggio | **nuovo**: criteri `h2h.punti` e `h2h.differenzaReti` in `ranking.js`, con le parità residue evidenziate e non inventate | 4 test, compreso il caso in cui la differenza reti generale darebbe un ordine opposto |
| Fasce 1ª–3ª +15, 4ª–10ª +8, 11ª–17ª +6, 18ª–20ª +10; posizione esatta +10 | `tabellaPunti.ordinamenti.classificaFinale.fasce` | massimi 173 (fasce) e 200 (posizioni) verificati |
| Speciali +20 ciascuno (cannoniere, assistman, squadra più cattiva) | `tabellaPunti.bonus` | test |
| Spareggi degli speciali (gol → meno minuti → più assist, ecc.), senza vincitori inventati su parità o dati mancanti | **nuovo**: `engine/speciali.js` | 3 test |
| Cartellini: giallo 1, rosso diretto 1, doppia ammonizione = 2 | **nuovo**: `riepilogoCartellini` | test |
| Vincitore di giornata (punti → più esatti → più segni, parità = tutti vincitori) e turni vinti solo da giornate definitive | **nuovo**: `vincitoriGiornata`, `turniVinti` in `classifica.js` | 3 test |
| Classifica generale: punti → turni vinti → esatti → posizioni esatte → fasce → segni; parità residua = pari merito | `classificaPartecipanti` + `spareggioPrefisso` nel descrittore | test |
| Massimo teorico 800 + 373 + 60 = **1233** | test su un'edizione completa di 20 squadre e 50 partite | ✅ |
| Fasce, posizioni e speciali solo dopo la convalida finale | il chiamante passa il reale solo da quel momento | test |

Verifica di sensibilità: cambiando di proposito un valore (fascia 15→14) o l'ordine dei criteri, i test falliscono.

## 2. Cosa NON è ancora migrato (e perché)

1. **L'app.** Pronò! non ha ancora scheletro, login né backend: non c'è dove far girare schedine, classifica e gestione. È il passo successivo del piano.
2. **I partecipanti e i loro pronostici (28 persone).** Servono: l'app, un account per ciascuno, un'esportazione dall'admin del gioco e l'informativa privacy.
3. **Le funzioni di gestione.** Le ho viste dal regolamento e dalla schermata "Gestione": giornate provvisorie/definitive, riapri pronostici (con svelamento), riapri risultati, reset, "termina edizione", convalida finale, iscrizioni aperte/chiuse a mano, bonus con finestra indipendente. Sono descritte in [schema-dati.md](./schema-dati.md) §6 ma da costruire.
4. **Parti del gioco che non ho aperto:** "Risultati", "Il mio profilo", "Calendario", "Dati Serie A" (fonti alternative solo per statistiche), "Punteggi e finale", "La competizione" e "Controllo compilazioni". Le conosco solo per nome.
5. **Il Conto del Bar.** Dal regolamento sembra una classifica a parte con gli spareggi invertiti (il "peggiore"), ma non ne conosco il significato esatto: serve la tua spiegazione prima di modellarla. Se è un'idea di "paga il caffè chi è ultimo", può restare solo come etichetta, senza denaro.
6. **I punti "PUNTO DA DEFINIRE" del regolamento:** procedura del sorteggio, parità residue nel Conto del Bar e negli speciali. Nel motore restano visibili come parità, senza decidere al posto di nessuno.

## 3. Perché non si può migrare tutto oggi

- **Tempi:** la 10ª giornata è in corso (risultati 8/10 confermati). L'edizione finisce tra pochi giorni, molto prima che Pronò! abbia un'app.
- **Dati personali:** i 28 partecipanti hanno dato username e pronostici a un altro gioco. Per spostarli serve il consenso e un'informativa chiara (nome, scopo, durata, come cancellarsi).
- **Il lavoro dell'amico:** il codice è suo. Ho riscritto le regole dal regolamento, ma per riusare codice, grafica o dati serve il suo ok.

## 4. Percorso proposto

1. **Ora:** l'edizione corrente finisce sul gioco dell'amico (prova generale).
2. **Con lo scheletro dell'app** (dopo la scelta del backend): L'ITALIANO è la **competizione pilota** di Pronò!, con il formato "campionato breve a giornate" e i 28 partecipanti reali. Sostituisce il calcio con dati finti.
3. **Alla prossima edizione** (nuovo blocco di giornate o nuova stagione): il gruppo si iscrive su Pronò! con l'invito di lega. Se vuoi portare lo storico, si fa un'importazione una tantum da un'esportazione dell'admin, con il consenso di tutti.
4. **Cosa serve da te:** l'ok dell'amico, la risposta sul Conto del Bar, come è costruito il gioco (indirizzo `pronomultisport.workers.dev`, quindi probabilmente Cloudflare) e se esiste un'esportazione dei dati.

## 5. Aperto

- **Backend:** se il gioco dell'amico gira già su Cloudflare, c'è una terza opzione oltre a Firebase e Supabase. Va messa nel [confronto](./CONFRONTO_BACKEND_FIREBASE_SUPABASE.md) solo dopo aver capito com'è costruito.
- **Formato escluso nel CLAUDE.md:** il "campionato a girone unico lungo tutta la stagione" resta escluso, ma il **campionato breve a giornate** (qualche giornata di una lega) rientra, come già Championsito.
