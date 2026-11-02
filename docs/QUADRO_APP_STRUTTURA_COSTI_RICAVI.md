# Pronò! — il quadro completo: struttura, allineamento, costi e ricavi

*Redatto il 2026-11-02, prima di avviare lo scheletro dell'app. Riunisce quello che è già scritto in [CLAUDE.md](../CLAUDE.md), [schema-dati.md](./schema-dati.md), [il piano di settembre](./PIANO_SVILUPPO_2026-09-14.md) e [il confronto backend](./CONFRONTO_BACKEND_FIREBASE_SUPABASE.md), più quello che ho verificato oggi nei satelliti. Le valutazioni legali e fiscali non sono consulenza: i punti ⚖️ vanno confermati da un professionista.*

## 1. In una pagina

**Cos'è.** Una piattaforma dove un account unico partecipa a più competizioni di pronostici tra amici: sport (calcio, tennis, F1, basket…) e, con lo stesso motore, anche eventi non sportivi a classifica (Sanremo, Eurovision, reality). Regole e punteggi sono dati, non codice: aggiungere una competizione costa una configurazione, non una nuova app.

**Su cosa si regge.** Il motore di calcolo (fatto: 43 test, punteggi identici a Formulito, Championsito e Medusino), le leghe private con un capitano che invita via WhatsApp (il meccanismo di crescita) e l'assenza di denaro dentro l'app.

**In breve sui numeri.**
- **Costruire:** 300–400 ore di lavoro (stima del piano), meno il motore già fatto. È il vincolo vero, vedi §4.
- **Gestire:** da 150 a 220 €/mese nel primo anno, 450–800 a 10.000 utenti, 1.000–2.500 oltre i 10.000.
- **Incassare:** circa **1,6 € lordi per utente attivo all'anno** da consumatori (Pro, Lega Pro, banner), più sponsor e aziende.
- **Pareggio:** servono 4.000–6.000 utenti attivi medi senza aziende né sponsor. Oggi, tra tutti i satelliti, abbiamo qualche centinaio di persone.
- **Il primo anno è in perdita** in ogni scenario: circa 2,5–4 mila € con partita IVA forfettaria, 4–6 mila € con una SRL (dal piano).

## 2. La struttura dell'app

### 2.1 Tre livelli

```
LIVELLO 1 · PIATTAFORMA — un account, 4 sezioni (tab bar)
  Home        "In evidenza" (scadenze di pronostico) + "Notizie per te"
  Esplora     competizioni per sport o evento, consigliate, future
  Profilo     Bacheca (medaglie, badge) · Stagione (albo d'oro, percentuali) · le mie leghe
  Impostazioni  sport di interesse, notifiche, account, privacy
        │  si apre una competizione
        ▼
LIVELLO 2 · COMPETIZIONE  (es. "GP Messico", "Wimbledon 2027", "Sanremo 2027")
  Pronostici  il form dipende dal formato (vedi §2.2)
  Classifica  lega pubblica + le leghe a cui partecipo
  Risultati   dati reali, aggiornati in automatico o a mano
  Regole      generate dal descrittore (punteggi, scadenze, spareggi)
  Admin       solo per chi gestisce: risultati, chiusura pronostici, congelamento
        │  si sceglie la lega
        ▼
LIVELLO 3 · LEGA  (la pubblica è implicita; le private le crea chiunque)
  Membri, invito con link, classifica, capitano (approva e sollecita chi non ha giocato)
```

Il livello 2 **non è descritto nei documenti attuali**: il CLAUDE.md definisce le 4 sezioni, ma non cosa c'è dentro una competizione. L'ho ricavato dalle app che funzionano oggi (Classifica, Risultati, Pronostici, Regolamento, Admin di Formulito).

### 2.2 Formati di competizione (ogni formato = componenti diversi, stesso motore)

| Formato | Cosa pronostica l'utente | Esempi | Motore |
|---|---|---|---|
| **Ordinamento** | un ordine (griglia, arrivo, classifica) | F1, Sanremo, Eurovision, classifica finale | ✅ fatto |
| **Gironi + tabellone** | risultato di ogni partita; il resto si deriva | Mondiali, Europei, Coppe | ✅ gironi fatti; propagazione dai gironi da completare |
| **Tabellone a eliminazione** | chi passa il turno (+ dettaglio, es. i set) | Tennis (Slam), basket, rugby | ✅ fatto |
| **Campionato a fasce** | risultati di tutte le partite → classifica derivata | Champions fase a campionato | ✅ fatto |
| **Andata/ritorno** | chi passa il turno su due gare | Champions fase finale | ⛔ da fare |

### 2.3 Ruoli
- **Utente:** gioca, crea leghe, entra nelle leghe degli amici.
- **Capitano di lega:** approva i membri, invia i solleciti, vede chi manca.
- **Admin di competizione:** inserisce o corregge i risultati, chiude i pronostici, congela le classifiche.
- **Proprietario della piattaforma:** protetto (non revocabile), gestisce tutto.

### 2.4 Dati e architettura
- **Dati:** utenti, competizioni (con il loro descrittore), iscrizioni, pronostici, risultati, leghe, membri, classifiche, statistiche di stagione. Il pronostico è **uno per competizione** e alimenta più classifiche (pubblica e leghe) senza duplicarsi.
- **Pezzi:** app web installabile (PWA) → motore di calcolo → backend (database, login, permessi, ricalcolo) → adapter di sync dei risultati → email/notifiche.
- **Backend:** da scegliere (Firebase o Supabase, vedi il confronto). Il motore non cambia.

### 2.5 Cosa si riusa e cosa è nuovo

| Già pronto | Da costruire |
|---|---|
| Motore di punteggio e classifica (verificato) | Scheletro dell'app e login unico |
| Regole di sicurezza multi-competizione (Formulito) come base | Regole per leghe e capitani |
| Schemi grafici e stile "Arena" | Componenti dei form per formato (ordinamento, gironi, tabellone) |
| Funzioni nate in Formulito: Bacheca, Stagione, badge, conto alla rovescia, temi di edizione | Sync dei risultati con fonte con licenza |
| Registro competizioni e temi (`tema` per edizione speciale) | Creazione leghe, inviti, solleciti |
| | Admin di competizione |
| | Privacy, termini, età minima |

## 3. Verifica di allineamento con quello che vuoi

Legenda: ✅ in linea, ⚠️ da decidere, ❓ non so, devi dirmelo tu.

| # | Tema | Cosa dicono i documenti | Cosa ho trovato | Stato |
|---|---|---|---|---|
| 1 | Piattaforma unica, un login, più competizioni | Deciso (2026-09-03) | Coerente con tutto | ✅ |
| 2 | **Formati e priorità** | Si parte dal tabellone, F1 "non prioritario", campionato escluso, pilota = calcio con dati finti | Le competizioni vere che i gruppi giocano sono F1 (ogni weekend), Champions a campionato e tennis. Il piano stesso ha un calendario con F1, Champions e tennis | ⚠️ Conviene partire da **ordinamento (F1)** e **campionato a fasce**, che hanno gruppi reali, e non dal calcio con dati finti |
| 3 | **"Non solo sport"** | Non compare | Il motore a ordinamento lo permette già. Manca la decisione di prodotto: categorie, sorgente dati manuale, calendario degli eventi non sportivi | ⚠️ Da confermare come obiettivo e da testare con una prima competizione |
| 4 | **Soldi dentro l'app** | "Niente denaro in-app, mai": scatta la riserva statale (D.Lgs. 496/1948) quando ci sono premio **e** quota ⚖️ | Formulito ha un tracciatore di quote pagate, metodo e incasso, con montepremi e ripartizione 60/30/10 in euro. Championsito prevede crediti e premi | ⚠️ In Pronò! non possono esistere. I gruppi che passano perdono quella funzione: da dirlo loro e da far valutare a un professionista |
| 5 | Migrazione dei satelliti | Wimbledino e Medusino non migrano; il piano porta il gruppo Championsito sulla Fase 2 | Formulito non è citato, ma è il più attivo | ❓ Formulito migra o resta satellite? |
| 6 | **Funzioni nate dopo i documenti** | Non descritte | Bacheca, Stagione, albo d'oro, badge, conto alla rovescia, temi di edizione speciale: sono già apprezzate e verificate | ⚠️ Vanno inserite nella struttura (Profilo e Competizione) |
| 7 | **Backend** | "Un unico progetto Firebase" è deciso | Il confronto suggerisce di provare Supabase per leghe e classifiche | ⚠️ Scelta aperta: prova di 1–2 giorni |
| 8 | **Tempi** | MVP entro gennaio, Champions Fase 2 a febbraio | Vedi §4: 13 settimane da qui a febbraio | ⚠️ Rischio concreto |
| 9 | Privacy, età, termini | Previsti prima dell'apertura al pubblico | Non fatti | ❓ Preventivo legale da chiedere |
| 10 | Dati con licenza | ESPN non ufficiale, da sostituire prima di aprire | Costo 20–40 $/mese | ✅ |
| 11 | Identità visiva "Arena" | Deciso | Le grafiche dei satelliti restano separate, come previsto | ✅ |

## 4. Costi

### 4.1 Costruire: tempo
- **Stima del piano:** 300–400 ore. Il motore è già fatto, ma non so dirti quante ore valesse (non l'avevo isolato nella stima): conto un risparmio modesto, di qualche decina di ore.
- **Tempo disponibile:** da oggi alla Fase 2 della Champions (febbraio) sono 13 settimane. A 12–15 ore a settimana sono **156–195 ore**, meno di quelle che servono. Per l'Australian Open (metà gennaio) sono ancora meno.
- **Come rientrare:** (a) salire a 20–25 ore a settimana, (b) un MVP più stretto (account, competizione, form a ordinamento, classifica, lega con invito), lasciando fuori Esplora, notifiche e admin evoluto, (c) tenere Championsito come satellite per la Fase 2 se la piattaforma non è pronta.

### 4.2 Gestire: costo mensile per fase (euro)

| Voce | Primo anno (0–1.000 utenti) | 1.000–10.000 | 10.000–50.000 |
|---|---|---|---|
| Backend (Firebase 0–10; Supabase 25–30; vedi confronto) | 0–30 | 15–60 | 100–400 |
| Dati sportivi con licenza | 0–20 | 30–40 | 40–100 |
| Dominio, email, monitoraggio | 10 | 20 | 50 |
| Store (Google 25 $ una tantum; Apple 99 $/anno più avanti) | 3 | 10 | 10 |
| Design e social | 0–20 | 30–50 | 50–100 |
| Legale e commercialista (forfettario) | 100–150 | 150 | — |
| Marketing | 0 | 100–300 | 500–1.500 |
| **Totale** | **≈ 150–220** | **≈ 450–800** | **≈ 1.000–2.500** |

Con una società (SRLS) i costi fissi salgono di 2.500–3.500 € all'anno ⚖️.

### 4.3 Una tantum
- Privacy e termini: 500–1.500 €.
- Costituzione SRLS (solo quando entrano soci): 1.000–1.500 €.
- Manifestazione a premio (solo con sponsor che regalano premi): 1.500–3.000 € a concorso. Fino ad allora, niente premi.

### 4.4 Primo anno da mettere a bilancio
Circa **2,5–4 mila €** con partita IVA forfettaria (12 mesi di costi della prima colonna, che già includono commercialista, più privacy e termini una tantum) e **4–6 mila €** con una SRL (perdita dell'anno 1 nel piano: da −4.120 a −5.580 €), in tutti gli scenari. Va coperto con capitale proprio.

## 5. Ricavi

### 5.1 Da dove arrivano (nessun denaro dentro l'app, nessun bookmaker)
| Fonte | Prezzo | Chi paga | Note |
|---|---|---|---|
| **Pronò! Pro** | 9,99 €/anno | il singolo utente | statistiche complete, confronto con gli amici, badge, temi, leghe oltre le 3; **mai vantaggi in classifica**. Conversione attesa 3–6% |
| **Lega Pro** | 19,90 €/competizione o 39,90 €/stagione | chi organizza | nome e logo della lega, regole personalizzate, più admin, esportazione. Conversione 20–30% sulle leghe grandi |
| **Aziende, bar, associazioni** | 300–1.500 €/stagione | il cliente | marchio del cliente, iscrizione riservata. Dal secondo anno, serve chi venda |
| **Sponsor locali in gioco** | 300–800 €/stagione | l'attività locale | logo sulla competizione o sull'edizione, niente premi ai partecipanti |
| **Banner** | 0,40–1,00 € ogni 1.000 visualizzazioni | rete pubblicitaria | piccoli, mai nel form dei pronostici, categoria scommesse bloccata |
| **Video premiato** | 5–9 € ogni 1.000 | rete pubblicitaria | solo per temi e dati live, mai punti |

**Due ricavi nuovi che il lavoro di queste settimane rende facili:**
- **Edizioni speciali sponsorizzabili.** La Kimi Edition ha mostrato che un tema, un banner e un badge si configurano con poche righe. Lo stesso meccanismo vale per un marchio: una pizzeria sponsorizza "il GP del Messico" con logo e colori. È la voce pubblicitaria più sana del piano.
- **Marchio del cliente (white-label) per le aziende.** Il tema per competizione è già il meccanismo che serve.

### 5.2 Scenari a 24 mesi (dal piano, ipotesi SRL)
| | Prudente | Base | Ottimista |
|---|---|---|---|
| Attivi a giugno 2028 (media dell'anno) | 1.500 (900) | 8.000 (4.800) | 25.000 (15.000) |
| Ricavi lordi anno 2 | 1.660 € | 14.680 € | 54.640 € |
| Costi totali anno 2 | 4.965 € | 7.415 € | 17.325 € |
| Utile netto anno 2 | perdita | ≈ 3.870 € | ≈ 22.390 € |
| Anno 1 | −5.580 € | −5.410 € | −4.120 € |

Con la partita IVA forfettaria invece della SRL, nello scenario base resterebbero circa 5.700 € contro i 2.870 €.

### 5.3 Controllo con la realtà
- **Valore per utente:** nello scenario base, i soli ricavi da consumatori (Pro, Lega Pro, banner, video) fanno circa **1,6 € lordi per utente attivo all'anno**. Il resto è aziende e sponsor.
- **Pareggio:** per coprire 150–220 €/mese servono circa 1.000–1.500 utenti attivi; per 450–800 €/mese servono 3.400–6.000.
- **Da dove partiamo:** dai dati che ho trovato, Mondialito ha avuto **118 partecipanti** (un Mondiale, quindi un picco), Wimbledino **17**, il gruppo di Championsito è di **20–30 soci** (per il piano). Formulito e Medusino non li ho rilevati. Anche contando che si sovrappongono, siamo nell'ordine di **100–250 persone**.
- **Cosa deve succedere:** dai 100–250 di oggi ai 1.000 attivi di luglio 2027 serve moltiplicare per 4–10 in otto mesi. Il piano lo affida al passaparola delle leghe (fattore di invito ≥ 0,5). **Nessuno scenario regge senza questo**: è la cosa da misurare per prima, già a marzo 2027.
- **Ipotesi da testare, non dato:** gli eventi non sportivi (Sanremo, Eurovision) potrebbero essere occasioni di crescita fuori dal calendario sportivo. Si possono provare con una sola competizione configurata, senza costruire nulla di nuovo.

### 5.4 Criteri per decidere se continuare (dal piano)
- **Marzo 2027:** almeno 300 utenti registrati e fattore di invito ≥ 0,5. Altrimenti resta un progetto personale e si smette di investire il tempo di altri.
- **Luglio 2027:** almeno 1.000 attivi e 20 Lega Pro a pagamento. Altrimenti niente SRLS, niente App Store, niente marketing a pagamento.
- **Dicembre 2027:** primi 3 clienti aziendali firmati.

## 6. Decisioni aperte (in ordine di importanza)

1. **Formati di partenza:** confermi F1 (ordinamento) e Champions (campionato a fasce) davanti al calcio con dati finti?
2. **"Non solo sport":** è un obiettivo dichiarato? Se sì, scelgo con te la prima competizione non sportiva da provare.
3. **Soldi:** accetti che i montepremi e le quote restino fuori dall'app, anche per Formulito e Championsito? Preventivo legale incluso.
4. **Formulito:** migra su Pronò! o resta un satellite?
5. **Backend:** facciamo la prova di 1–2 giorni su Supabase oppure resti su Firebase?
6. **Tempi:** quante ore a settimana puoi mettere davvero? Da questo dipende l'MVP.
7. **Forma giuridica:** partita IVA forfettaria (verificare la soglia dei 35.000 € da lavoro dipendente) o SRLS?

## 7. Cosa farei subito dopo la tua risposta
1. Creare il repository e mettere sotto controllo di versione il motore (oggi la cartella non lo è).
2. Fare la prova di backend, se scegli di farla.
3. Scheletro dell'app: login unico, competizione, form a ordinamento, classifica e lega con invito, usando Formulito come prima competizione reale.
