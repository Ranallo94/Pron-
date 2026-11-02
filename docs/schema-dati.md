# Pronò! — schema dati Firestore

Vedi [CLAUDE.md](../CLAUDE.md) per il contesto. Un unico progetto Firebase, un unico Auth. Questo documento definisce le collezioni e come si incastrano competizione → lega → pronostici → classifiche.

Aggiornato il 2026-09-03 dopo aver ricevuto `SPEC_FASE_A_GIRONI.md` (spec del progetto reale **Mondialito 2026**, 12 gironi FIFA World Cup) — che ha superato la decisione iniziale ("piazzamento esatto diretto") con un modello a tre livelli, molto più solido perché già validato su un torneo vero. Vedi §3.

## Idea chiave #1: la competizione pubblica È una lega

Per evitare di duplicare la logica di calcolo classifica, la partecipazione "pubblica" a una competizione è modellata come una lega implicita con id fisso `"pubblica"`, creata automaticamente insieme alla competizione, con l'admin della competizione come admin della lega. Così esiste un solo motore "data un insieme di membri + un descrittore di torneo + i pronostici grezzi → calcola una classifica", riusato identico per la lega pubblica e per ogni lega privata.

## Idea chiave #2: il descrittore di torneo

Pattern architetturale centrale (dal Mondialito, generalizzato). Sostituisce quello che nella prima bozza di questo documento erano due campi separati (`configFormato` + `schemaPunteggio`): un **unico oggetto dichiarativo per competizione** che un motore generico interpreta, senza codice specifico per torneo.

```
descrittoreTorneo: {
  gironi: {
    struttura: { numeroGironi, squadrePerGirone, ... },
    puntiPartita: { vittoria: 3, pareggio: 1, sconfitta: 0 },   # assente/diverso per sport senza pareggio
    criteriRanking: ["punti", "differenzaReti", "golFatti", "scontriDiretti", "ordineManuale"],
    numeroQualificate: { dirette: 24, ripescaggio: 8 },          # es. prime 2 + migliori 8 terze
    mappaAccoppiamento: "COMB_3I" | "diretta" | {...}            # tabella/plugin specifico del torneo, vedi §4
  },
  bracket: {
    dimensione: 16 | 32 | 64 | 128,
    slot: [ { id, casa:{...}, trasferta:{...} }, ... ]           # bracket dichiarativo, risolto da resolveSlot()
  },
  tabellaPunti: {
    gironi: { segnoCorretto: 10, risultatoEsatto: 5, postoInGriglia: 10, qualificazione: 5 },
    bracket: { esiti: [1,2,5,12,30,75], bonusDettaglio: [1,1,2,4,10,25] },
    bonusFinali: {...}
  }
}
```

Un motore unico interpreta il descrittore. Cambiare sport/torneo = scrivere un nuovo descrittore (dati), non nuovo codice — è la stessa idea di `schemaPunteggio` della prima bozza, ma estesa a coprire anche struttura gironi, criteri di ranking e regole di qualificazione, non solo i punti.

## Collezioni

```
users/{uid}
  displayName, email, createdAt, ultimoAccesso

competitions/{competitionId}
  nome, sport ("tennis" | "calcio" | "basket" | "rugby" | "olimpiadi" | ...)
  formato ("bracket_ko" | "gironi_piu_bracket" | "classifica_arrivo")
  stato ("bozza" | "iscrizioni_aperte" | "pronostici_aperti" | "in_corso" | "gironi_congelati" | "conclusa")
  descrittoreTorneo: {...}      # vedi sopra
  fonteDati: { adapter: "espn_calcio" | "espn_tennis" | "manuale" | ..., chiaveEvento: "..." }
  dataInizio, dataFine

  competitions/{competitionId}/iscrizioni/{uid}
    stato ("in_attesa" | "approvato" | "rifiutato")
    richiestoIl, approvatoIl

  competitions/{competitionId}/pronostici/{uid}
    # dati grezzi del pronostico dell'utente per QUESTA competizione — indipendenti dalle leghe
    gironi: { [partitaId]: { valoreCasa: n, valoreTrasferta: n, segno: "1"|"X"|"2" } }
      # l'utente pronostica IL RISULTATO DI OGNI PARTITA, non il piazzamento — vedi §3
    spareggi: { gironi: { [gironeId]: [squadraId in ordine scelto] }, ripescaggio: [gironeId in ordine] }
      # SOLO gli ordinamenti manuali per parità perfetta, non l'intera classifica — vedi §3.3
    bracket: { [roundId]: { [matchId]: { vincitore: pid, dettaglio?: {...} } } }  # se formato ha bracket
    bonus: {...}                # eventuali pronostici bonus (capocannoniere, ecc.)
    nascosto: bool               # visibilità agli altri finché la competizione è aperta
    inviatoIl, ultimaModifica

  competitions/{competitionId}/risultati/ufficiali
    # unica fonte di verità sui risultati reali, sync automatico + override manuale (come oggi in Wimbledino)
    gironi: { [partitaId]: { valoreCasa: n, valoreTrasferta: n, manuale: bool } }
    posizioniFinaliGironi: { [gironeId]: [squadraId] } | null   # null finché non congelate — vedi §3.4
    spareggioRipescaggio: [gironeId] | null
    bracket: { [roundId]: { [matchId]: { vincitore: pid, manuale: bool } } }
    bonus: {...}
    syncLog: [...]

  competitions/{competitionId}/leghe/{legaId}          # legaId = "pubblica" per la lega implicita
    nome, tipo ("pubblica" | "privata")
    adminUid
    codiceInvito                # solo leghe private
    creataIl

    competitions/{competitionId}/leghe/{legaId}/membri/{uid}
      stato ("in_attesa" | "approvato" | "rifiutato")
      ruolo ("admin" | "membro")
      unitoIl

    competitions/{competitionId}/leghe/{legaId}/classifica/snapshot
      # calcolata: per ogni membro approvato della lega, applica il motore punteggi
      # a pronostici/{uid} vs risultati/ufficiali secondo il descrittoreTorneo, ordina, salva snapshot
      righe: [ { uid, punti, breakdown, posizione } ]
      calcolataIl
```

## 3. Il modello a tre livelli per la fase a gironi (dal Mondialito)

Superata la decisione iniziale "l'utente pronostica il piazzamento esatto". Il pattern validato è più semplice per l'utente e più ricco come motore punti:

| Livello | Cosa pronostica l'utente | Come si genera |
|---|---|---|
| **1. Partita** | risultato esatto (o segno, per sport senza punteggio numerico) di ogni partita del girone | input diretto, unico gesto |
| **2. Classifica girone** | — | **derivata** automaticamente dai risultati del livello 1, con gli stessi `criteriRanking` del descrittore |
| **3. Griglia / qualificate** | — | **derivata** dal livello 2 + `mappaAccoppiamento` del descrittore |

**Principio**: un solo input (il risultato) alimenta tre categorie di punteggio (segno, risultato esatto, posto in griglia, qualificazione). Vale per qualunque sport a girone — cambia solo l'unità (gol, set, punti, mete) e se il pareggio esiste.

### 3.1 Simmetria pronostico ↔ risultato
`pronostici/{uid}.gironi` e `risultati/ufficiali.gironi` hanno **la stessa forma** (stesso `partitaId`, stessi campi). Il motore punteggi è un diff strutturale fra i due, non conosce lo sport: cambia solo cosa contiene ogni partita (gol per calcio, set per tennis a squadre, ecc. — parametrizzato nel descrittore).

### 3.2 Punteggio annidato/gerarchico
Il bonus "dettaglio esatto" è condizionato al segno corretto (se il segno è sbagliato, niente bonus, anche se per puro caso il dettaglio numerico coincidesse). Pattern trasferibile ad altri sport (es. bracket: bonus "punteggio esatto" solo se il vincitore del turno è corretto — già usato in Wimbledino).

### 3.3 Ordine manuale come ultimo criterio
Quando due squadre sono identiche su tutti i `criteriRanking` oggettivi, l'utente sceglie l'ordine (frecce ▲▼ in UI), salvato in `pronostici/{uid}.spareggi`. Regola non negoziabile: l'ordine manuale si applica **solo** se la parità è reale, e **decade automaticamente** se un cambio di risultato la rompe (non deve mai poter scavalcare un criterio oggettivo). Stesso meccanismo per lo spareggio tra le migliori terze/ripescate.

### 3.4 Congelamento (gate esplicito, lato admin)
Le voci di punteggio "posto in griglia" e "qualificazione" restano a **0** finché l'admin non congela `risultati/ufficiali.posizioniFinaliGironi` (proposto dal calcolo automatico, ma correggibile a mano per casi che l'algoritmo non copre — fair play, decisioni federali, ritiri). È un cancello esplicito nello stato della competizione (`stato: "gironi_congelati"`), non un effetto collaterale del calcolo. Da quel momento il bracket eliminatorio diventa risolvibile e la pagina risultati mostra gli accoppiamenti reali.

## 4. Mappa di accoppiamento (qualificazione → bracket)

La parte più specifica del singolo torneo. Nel Mondiale 2026 reale: 24 dirette (1e/2e) + le 8 migliori terze fra 12, la cui distribuzione sugli slot dipende da *quali* 8 gironi hanno prodotto una terza qualificata → tabella `COMB_3I` (495 combinazioni). Nel `descrittoreTorneo` questo è un plugin sostituibile (`mappaAccoppiamento`): un torneo "solo prime due passano, nessun ripescaggio" usa una mappa diretta banale, senza bisogno di tabelle di combinazione. Il bracket resta comunque dichiarato come lista di slot simbolici risolti da un `resolveSlot()` generico (`{t:'1', g:'A'}` = prima del girone A, `{t:'3slot', slot:'E'}` = terza assegnata allo slot E).

## Cosa cambia rispetto a Wimbledino

- **`pronostici/{uid}` e `risultati/ufficiali` restano a livello di competizione**, non di lega — un solo pronostico per utente per competizione, che può alimentare N classifiche (pubblica + leghe private a cui l'utente partecipa). Questo è il punto che disaccoppia dati grezzi da classifiche, richiesto dal modello leghe.
- **`iscrizioni/{uid}`** sostituisce il vecchio pattern di approvazione unico — è l'iscrizione alla competizione in sé (serve per poter fare un pronostico), distinta dall'iscrizione a una lega specifica (`leghe/{legaId}/membri/{uid}`, serve per entrare in una classifica).
- **Ogni lega (pubblica o privata) ricalcola la propria classifica** filtrando `pronostici/*` ai soli uid presenti in `leghe/{legaId}/membri` con stato `approvato`, poi applicando il motore punteggi secondo `descrittoreTorneo`. Stesso principio del `punteggi.js` di Wimbledino, reso generico: prende `pronostico`, `risultato`, `descrittoreTorneo` e restituisce breakdown + totale, senza sapere nulla di leghe.
- **Fase gironi ridisegnata**: da "piazzamento diretto" (bozza iniziale) a "risultato partita → classifica derivata → griglia derivata" (modello Mondialito, vedi §3).

## Sync risultati (adapter pluggable)

Interfaccia comune, come discusso nel brief:

```
adapter.fetchEventoGrezzo(chiaveEvento) → dati grezzi fonte
adapter.estraiConclusi(datiGrezzi) → { partiteConcluse: [...], live: bool, prossimaAttesa: Date }
adapter.propaga(pool, risultatiEsistenti, seedManuali) → nuovo stato risultati/ufficiali
```

`espn_tennis` = porting diretto di `functions/espn.js` di Wimbledino. `espn_calcio` da scrivere per il pilota (verificare endpoint ESPN soccer, struttura gironi vs bracket — probabilmente più complesso del tennis perché ESPN calcio ha competizioni con fasi miste nello stesso evento).

## UI di compilazione gironi (dal Mondialito, da riusare)

- Sub-tab orizzontale per girone, con badge di avanzamento (vuoto / `3/6` parziale / `✓` completo).
- Riga partita: bottoni segno 1/X/2 + due input numerici, **bidirezionalmente legati** (digitare il punteggio aggiorna il segno, non viceversa — il segno non altera mai il punteggio). Pre-inizializzata a 0-0/X per eliminare lo stato "vuoto".
- Classifica mini **live** sotto le partite, ricalcolata a ogni digitazione — è il feedback che rende la compilazione soddisfacente.
- **Salvataggio per sezione (per girone) ma con validazione globale**: se le sezioni sono interdipendenti (qui: la griglia richiede tutti i gironi compilati), il salvataggio di una sezione richiede il completamento di tutte, con messaggio che elenca cosa manca.

## Errori noti da evitare (lezioni dal Mondialito, §10 della spec originale)

1. **Array Firestore che tornano come oggetti** (`["A","B"]` può arrivare come `{0:"A",1:"B"}`) — serve un accessor sicuro ovunque si leggano array da Firestore.
2. **Non fidarsi di un campo "classifica" salvato lato client** — va sempre derivata dai risultati ufficiali; un campo salvato è solo fallback per compatibilità.
3. **Pronostici orfani**: cancellando un utente, `pronostici/{uid}` può sopravvivere e rientrare nel ricalcolo classifica — serve un guard esplicito (verifica che l'uid esista ancora / sia ancora membro della lega) a ogni ciclo di ricalcolo.
4. **Non duplicare il motore punteggi** client/server — un modulo condiviso, non due copie mantenute a mano (già un problema noto in Wimbledino, vedi [[wimbledino-stato-progetto]]).
5. **Una sola implementazione di ranking**, parametrizzata dal descrittore — non una per la UI (con head-to-head) e una per il motore punti (senza), altrimenti UI e classifica finale divergono.
6. **Segno sempre subordinato al risultato numerico**, mai impostabile in autonomia — altrimenti si creano schede incoerenti.

## 5. Estensioni del descrittore (2026-11-02)

Il descrittore ora copre anche i formati dei satelliti oltre ai gironi. Tutte le voci sono opzionali; ogni competizione usa quelle che servono. Esempi reali in `engine/descrittori/` (Formulito, Championsito, Wimbledino, Medusino).

```
descrittoreTorneo: {
  bracket: { dimensione: 128 },                      # tabellone KO: turni R128…F ricavati dalla dimensione
  tabellaPunti: {
    ordinamenti: {                                   # una voce per sessione a ordinamento
      qualifica:  { esatta:[10], esattaResto:3, vicino:1 },
      gara:       { esatta:[25,18,15,…], bonusPrimi:[{primi:3,punti:3},{primi:10,punti:1}] },
      classificaFinale: { fasce:[{id,da,a,fascia,esatta}, …] }     # campionato a fasce
    },
    bonus:   [ { id:'giroVeloce', tipo:'identico', punti:5 }, { id:'safetyCar', tipo:'numero', punti:5 } ],
    bracket: { esiti:{R128:1,…,F:180}, dettaglio:{R128:1,…,F:60} }  # esiti per turno + bonus dettaglio annidato (es. set)
  },
  spareggio: ['gara.vincitoreOk', 'qualifica.vincitoreOk', 'bonus.indovinati']   # percorsi nei contatori
}
```

Forme dei dati in ingresso a `calcolaPunteggioTotale({ pronostico, risultato, descrittoreTorneo })`:

| Voce | `pronostico` / `risultato` |
|---|---|
| Ordinamenti | `ordinamenti: { [sessione]: [id, id, …] }` (indice 0 = primo; vuoti = `null`) |
| Bonus | `bonus: { [idBonus]: valore }` (0 è un valore valido, `''`/`null` = non compilato) |
| Bracket con dettaglio | `bracketDoc: { [round]: { [matchId]: { vincitore, dettaglio } } }`; nel reale anche `annullati: [id]` (ritirati/rimpiazzati) |
| Gironi | `gironi: { [partitaId]: { valoreCasa, valoreTrasferta } }` (invariato) |

Principi (gli stessi dei satelliti, ora in un solo posto):
- **Posizione esatta e fasce**: la posizione esatta vale solo se la fascia è giusta (nidificato). I `bonusPrimi` sono per elemento e cumulabili.
- **Bracket "per giocatore"**: conta chi avanza turno per turno, non l'avversario. Il bonus dettaglio vale solo con il vincitore corretto.
- **Spareggio dichiarativo**: `spareggio` elenca i contatori da usare, in ordine; `classificaPartecipanti` (engine/classifica.js) assegna le posizioni, con pari merito sulla stessa posizione.
- **Criterio `nome` nel ranking**: ultimo fallback alfabetico deterministico, per classifiche grandi senza scontri diretti (Championsito).
- **Propagazione del bracket** (`propagaBracketKO`): dagli esiti reali e dagli override manuali; un override con `manuale: true` non viene mai sovrascritto.

## 6. Concetti emersi da L'ITALIANO (2026-11-02)

Dal gioco sulla Serie A (vedi [MIGRAZIONE_LITALIANO.md](./MIGRAZIONE_LITALIANO.md)) arrivano concetti che la competizione deve modellare, oltre a quelli dei satelliti:

- **Giornate con scadenza propria:** la scadenza è l'inizio della prima partita della giornata, mostrata con data, ora e squadre. Nessuna apertura automatica della successiva.
- **Stato della giornata:** `LIVE/provvisoria` → `definitiva` (comando esplicito). Una correzione la riporta provvisoria e ritira la coccarda del vincitore. I punti di una giornata non definitiva non assegnano turni vinti.
- **Riapri pronostici** (override di admin): consente recuperi, anche retroattivi, fino a una nuova chiusura; a ogni chiusura admin le schedine vengono svelate. **Riapri risultati** non riapre i pronostici.
- **Reset di giornata:** cancella dati partita e conseguenze, ma conserva account, pronostici, visibilità e fonti.
- **Termina edizione:** esclude i recuperi pendenti; i recuperi successivi non cambiano più la competizione.
- **Convalida finale dell'admin:** fasce, posizioni esatte e speciali entrano nel totale solo dopo questa convalida (gate, come il "congelamento" dei gironi).
- **Nascondi schedina:** interruttore unico per schedina (non per partita), parte spento, riutilizzabile a ogni finestra valida; gli admin possono sempre consultarla.
- **Iscrizioni** aperte/chiuse a mano; le richieste già pendenti restano approvabili. Chi è approvato dopo il blocco non può scegliere gli speciali.
- **Bonus iniziali con finestra indipendente** dalla giornata (speciali scelti una volta, fino alla chiusura dedicata).
- **Fonti alternative di dati:** alimentano solo statistiche informative, mai punti o bonus.
- **Edizione:** la competizione considera solo le giornate dell'edizione (es. 6–10); le precedenti servono come informazione pre-partita.

Nel motore: criteri `h2h.<campo>` (scontri diretti in posizione) in `ranking.js`; `vincitoriGiornata`/`turniVinti` in `classifica.js`; `scegliVincitoreSpeciale`/`riepilogoCartellini` in `speciali.js`; descrittore in `engine/descrittori/litaliano-serie-a.js`. Lo stato della giornata, le riaperture e il reset sono logica dell'app, non del motore.

## 7. Modello Firestore della Beta (2026-11-03)

Questo è il modello **in vigore** per la Beta, con le regole in `firebase/firestore.rules` e i test in `firebase/test/regole.test.js` (`npm run test:regole`, emulatore Firestore, nessun accesso al progetto vero). Sostituisce le bozze dei paragrafi precedenti dove differiscono. Le collezioni usano nomi italiani.

**Ruoli**
- **Utente:** account con **email verificata** (anche Google) e non presente in `disabilitati`.
- **Proprietario della piattaforma:** claim personalizzato `owner: true`, assegnato **solo dal server** (script con credenziali di servizio).
- **Admin di competizione:** documento `competizioni/{c}/admins/{uid}`, nominato solo dal proprietario.
- **Capitano di lega:** campo `capitano` della lega.

| Percorso | Contenuto | Chi scrive | Chi legge |
|---|---|---|---|
| `nicknames/{minuscolo}` | `{uid, creataIl}`, **unicità** del nickname (senza distinguere maiuscole) | l'utente, solo per sé | utenti attivi (solo lettura singola) |
| `profili/{uid}` | `{nickname, nicknameLower, creataIl}`, profilo pubblico; creato **insieme** al nickname (batch). Il nickname **si può cambiare** (`nicknameCambiatoIl`), al massimo **una volta ogni 7 giorni**, sempre in batch: libera il vecchio, prende il nuovo, aggiorna il profilo | l'utente, creazione e cambio nickname | utenti attivi |
| `utenti/{uid}` | preferenze e consensi: `eta14` (obbligatorio vero), `privacyAccettataIl` (non riscrivibile), `terminiVersione`, `lingua`, `sportPreferiti`, `notifiche` | l'utente | l'utente e il proprietario |
| `utenti/{uid}/leghe/{l}` | le mie leghe (comodità di lettura) | **server** | l'utente |
| `competizioni/{c}` | `nome, categoria, sport, formato, stato, iscrizione (libera/approvazione), visibilita (pubblica/su_invito), descrittore, scadenze{schedaId: data}, riaperte{schedaId}, svelati{schedaId}, pronosticiAperti, tema, creataDa, creataIl` | creazione: proprietario; modifica: admin di competizione (non cambia `creataDa`/`creataIl`) | pubbliche: utenti attivi (le liste devono filtrare `visibilita == 'pubblica'`); su invito: iscritti e admin. **Su invito richiede `iscrizione: 'approvazione'`** (altrimenti basterebbe conoscerne l'indirizzo per entrare) |
| `competizioni/{c}/admins/{uid}` | admin della competizione | proprietario | admin |
| `competizioni/{c}/iscrizioni/{uid}` | `{stato, creataIl, decisoIl}`: nasce `approvato` se la competizione è `libera`, `in_attesa` se serve l'approvazione. L'utente **non** si auto-approva | l'utente (creazione e cancellazione), l'admin (stato) | l'interessato e gli admin |
| `competizioni/{c}/schede/{uid}__{schedaId}` | il pronostico: `{uid, schedaId, dati, visibile, aggiornatoIl}`; `visibile` (bool, **di default no**) lo sceglie il giocatore. `schedaId` = `principale`, `g6`, `speciali`… | l'iscritto approvato, **solo se la scheda è aperta** (competizione non in bozza né conclusa, `pronosticiAperti` non spento, e **scadenza non passata o riaperta dall'admin**); l'admin per le correzioni | l'interessato e l'admin; gli altri **iscritti approvati** (mai gli estranei) solo se il giocatore l'ha resa `visibile`, **oppure alla scadenza (svelamento automatico)**, oppure se l'admin l'ha svelata in anticipo (`svelati[schedaId]`). Una scheda riaperta dopo la scadenza torna nascosta finché non si richiude |
| `competizioni/{c}/risultati/{doc}` | risultati ufficiali | admin di competizione (o il server) | utenti attivi |
| `competizioni/{c}/classifiche/{doc}` | classifiche calcolate | **solo il server** | utenti attivi |
| `leghe/{l}` | `{competizioneId, nome, tipo, capitano}`. Le private le vedono i membri | **server**; il capitano può solo rinominare | pubbliche: utenti attivi; private: membri |
| `leghe/{l}/membri/{uid}`, `classifica/{doc}` | appartenenza e classifica della lega | **solo il server** | membri |
| `leghe/{l}/segreti/invito` | codice di invito | **solo il server** | il capitano |
| `abbonamenti/{uid}` | il piano (oggi `beta` per tutti; in futuro Pro) | **solo il server** | l'interessato |
| `config/{doc}` | configurazione e interruttori per piano | solo server/Console | utenti attivi |
| `disabilitati/{uid}` | utenti sospesi | solo server/Console | nessuno (invisibile ai client) |
| `statistiche/**` | conteggi d'uso propri, aggregati | **solo il server** | nessuno |

**Cosa devono fare le funzioni server (non passano dalle regole):** creare lega e codice di invito, far entrare un utente in una lega con il codice, ricalcolare e scrivere le classifiche con il motore, assegnare/togliere il claim `owner`, disabilitare utenti, scrivere piani e statistiche, cancellare tutti i dati di un account.

**Scelte di sicurezza da sapere**
- **Tutto ciò che non è elencato è negato** (ultima regola).
- Le scritture di ruoli, classifiche, appartenenze e piano **non esistono lato client**: un utente non può promuoversi, né alterare i punteggi.
- Ogni data scritta dal client deve essere **l'orario del server** (`aggiornatoIl == request.time`): non si può falsificare quando si è giocato.
- Un'operazione con le regole usa al massimo ~4 letture di appoggio (limite 10).
- **Provate con mutazioni:** indebolendo di proposito 16 regole (iscrizione, scadenza, nickname e suo cambio, classifiche, creazione, su invito, visibilità e svelamento delle schede, lettura di leghe, auto-approvazione) i test falliscono.

## Prossimi passi implementativi
1. ~~Motore punteggi + motore ranking gironi~~ **FATTO** (2026-09-03): `engine/ranking.js`, `engine/punteggi.js`, `engine/bracket.js` — funzioni pure, nessuna dipendenza Firebase, 17 test (`npm test`) coprono classifica con parità/scontri diretti/ordine manuale, punteggio partite con bonus annidato, qualificazione, posto in griglia con gate, bracket KO forgiving, e un caso end-to-end. Vedi `engine/test/`.
2. Cloud Functions: motore sync generico (orchestrazione polling adattivo, uguale per tutti gli sport) + primo adapter `espn_calcio` per il pilota. Importerà `engine/` così com'è.
3. Security rules Firestore: bozza da scrivere PRIMA del codice applicativo, non dopo (vedi rischio segnalato in CLAUDE.md).
4. UI: form pronostico gironi (risultato partita, come da Mondialito) + form bracket (riuso diretto del bracket grafico di Wimbledino).
5. ~~Progressione del bracket, ordinamenti, bonus, fasce~~ **FATTO** (2026-11-02): vedi §5 qui sotto, `engine/README.md` e i test di parità con le app esistenti. Resta fuori dal motore: i tabelloni a doppia sfida andata/ritorno (Champions Fase 2), gli adapter di sync e il bracket "gironi → sedicesimi" propagato turno per turno.
