# Pronò! Beta — la prima versione vera, gratuita

*Redatto il 2026-11-03. Sostituisce l'idea di "demo di prova": la Beta è un'app funzionante in tutto, dove gli utenti entrano, giocano e invitano gli amici. Le stime di ore sono mie.*

## 1. Obiettivo e vincoli

**Tre obiettivi:**
1. **Affinare il gioco** sulle varie competizioni (F1, campionato breve, eventi non sportivi, tabellone).
2. **Provare le funzioni che un giorno saranno premium**, per capire quali piacciono davvero.
3. **Far girare il passaparola**, senza spendere in pubblicità.

**Vincoli:** nessun denaro, nessuna pubblicità, nessun abbonamento. Tutto è gratuito: le funzioni "premium" sono accese per tutti e misurate.

## 2. Cosa cambia con utenti veri (rispetto alla demo)

| Tema | Con la demo | Con la Beta |
|---|---|---|
| **Progetto Firebase** | di prova, buttabile | **definitivo**: l'identificativo di un progetto non si cambia dopo, quindi va scelto bene adesso. Si crea a nome personale; più avanti si aggiunge il cofondatore come Proprietario e, quando esiste l'organizzazione Google, si sposta il progetto. **Gli utenti non vanno mai migrati** |
| **Piano Firebase** | gratuito, senza carta | **Blaze con carta e avviso di budget** (5–10 €): servono le funzioni server per il ricalcolo e le scadenze. Ai volumi attesi (centinaia di utenti) il costo resta nelle quote gratuite |
| **Privacy** | dati di prova | **informativa, termini, contatto, età minima 14 anni, cancellazione dell'account**. Finché non c'è la società, titolare del trattamento sei tu ⚖️ |
| **Tracciamento** | nessuno | **solo conteggi propri**, aggregati, senza strumenti di terzi: così non serve il banner dei cookie |
| **Nomi di terzi** | di esempio | **nomi descrittivi** per le competizioni ("Serie A" come descrizione sì, loghi e marchi no) ⚖️ |
| **Sicurezza** | minima | **email verificata, regole di accesso provate con gli emulatori, limiti di creazione account** (le email finte del Mondialito sono un problema da non ripetere) |
| **Link da condividere** | `…web.app` | Si può **partire senza comprare il dominio** con l'indirizzo gratuito di Firebase (`<sito>.web.app`). **`prono.web.app` è già occupato** (un'app olandese) e il nome non può avere l'accento (`pronò` non è ammesso). Il **dominio proprio** (≈ 10–18 €/anno, intestabile a te e trasferibile) conviene **prima di aprire ai non-amici**: link più memorabile e, soprattutto, **email di verifica e di accesso che non finiscono nello spam** (quelle inviate da `…firebaseapp.com` spesso ci finiscono). Libero al controllo del 2026-11-02: `pronoapp.app` |

## 3. Cosa c'è nella Beta

**Dentro**
- Account, profilo, ruoli (utente, capitano, admin di competizione, proprietario).
- Catalogo delle competizioni ("Esplora") create dall'admin a partire da un descrittore, con iscrizione aperta o con approvazione.
- Pronostici per formato: **ordinamento** (F1, X Factor, MasterChef, classifiche) e **partite con classifica a fasce** (campionato breve, Championsito, L'ITALIANO). Il **tabellone** (tennis, gironi + KO) arriva dopo.
- Inserimento dei risultati da parte dell'admin, chiusura dei pronostici, giornate provvisorie e definitive, convalida finale.
- **Ricalcolo lato server** con il motore (stessi punteggi dei satelliti, garantiti dai test di parità).
- Classifica pubblica e **leghe private con link di invito**.
- Profilo con **Bacheca, Stagione, badge, albo d'oro**, conto alla rovescia, temi di edizione speciale (tutto già nato in Formulito).
- App installabile (PWA), condivisione su WhatsApp.

**Fuori (per ora):** soldi, pubblicità, abbonamenti, notifiche push, store, sincronizzazione automatica dei risultati (all'inizio si inseriscono a mano), app nativa.

## 4. Funzioni "premium" da testare, per tutti

Ogni funzione sta dietro un **interruttore per piano**. Nella Beta il piano è uno solo e accende tutto. Quando arriverà il Pro basterà cambiare chi lo vede.

| Funzione candidata al Pro | Cosa misuriamo |
|---|---|
| Statistiche di stagione complete e percentuali | aperture della scheda Stagione, tempo trascorso |
| Confronto testa a testa con un amico | utilizzi a settimana |
| Badge e albo d'oro | utenti che li aprono, condivisioni |
| Temi e edizioni speciali | uso dei temi, condivisioni |
| Lega con nome, logo e regole personalizzate (Lega Pro) | leghe create, leghe personalizzate |
| Più di N leghe, esportazione della classifica | richieste e uso |

**Come si misura senza strumenti di terzi:** contatori propri nel database (quante volte una funzione è usata, aggregati per giorno), senza profilare le persone. Una domanda diretta ("Questa funzione ti sarebbe utile?") dentro l'app vale più di mille click.

## 5. Passaparola

- **Link di invito di lega** con anteprima e testo pronto per WhatsApp; chi arriva entra già nella lega.
- **Schermata di benvenuto** per l'invitato: in due tocchi ha la sua scheda.
- **Immagine condivisibile** della propria stagione, di una medaglia o di un badge: è l'unico contenuto social che producono gli utenti.
- **Promemoria al capitano:** "4 dei tuoi non hanno ancora giocato", con tasto per sollecitarli.
- **Numeri da guardare ogni settimana** (dal piano): iscritti totali e nuovi, attivi sull'ultima giornata, leghe e membri medi, **fattore di invito** (obiettivo ≥ 0,5), completamento della giornata.

## 6. Piano di lavoro

| Rilascio | Contenuto | Ore | Quando (a 12–15 ore a settimana, stima) |
|---|---|---|---|
| **Fondamenta** | repository, progetto Firebase, regole di sicurezza con test, pubblicazione automatica, accesso | 20–30 | settimane 1–2 |
| **v0.1** | una competizione a ordinamento giocabile da capo a fondo (utente + admin + classifica server) | 40–60 | fino a metà dicembre |
| **v0.2** | leghe, inviti, Bacheca, Stagione, badge, temi, condivisione | 40–50 | gennaio |
| **v0.3** | campionato breve a giornate, ciclo di vita, nuova edizione de L'ITALIANO | 40–60 | febbraio |
| **v0.4+** | tabellone, importazione degli archivi, notifiche, sincronizzazione risultati | 80–120 | primavera |

La prima competizione reale della v0.1 può essere **la F1 o un evento non sportivo**, con il gruppo di Formulito come primi utenti.

## 7. Cosa serve da te adesso

1. **Account Google personale** per Firebase, con verifica in due passaggi.
2. **Nome del progetto** (identificativo permanente) e area **europea** (`eur3`). Scegli un nome breve e neutro: lo propongo, lo confermi tu quando crei il progetto.
3. **Piano Blaze** con carta personale e **avviso di budget** a 5–10 €.
4. **Java** (JDK 17+) per gli emulatori: chiedilo all'IT insieme a Node, oppure installalo da te se puoi.
5. **Repository GitHub privato** sul tuo account (poi si trasferisce a un'organizzazione).
6. **Dominio** (facoltativo ma consigliato per il passaparola).

## 8. Rischi

- **Abusi:** account falsi, nickname offensivi. Mitigazioni: email verificata, regole di accesso, avviso di budget, possibilità per l'admin di disabilitare.
- **Costi imprevisti:** con Blaze un uso anomalo può costare. Avviso di budget e quote impostate.
- **Dati personali:** persone reali senza società alle spalle. Informativa chiara e cancellazione a richiesta.
- **Tempo:** la Beta v0.1 a metà dicembre è realistica solo se la fase delle fondamenta non si allunga (Java, Cloud Functions).
- **Datore di lavoro ⚖️:** account, computer e OneDrive aziendali sono da evitare per questo progetto; controlla il contratto di lavoro.
