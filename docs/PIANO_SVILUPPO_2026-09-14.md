# Pronò! — piano di sviluppo, diffusione e sostenibilità

*Versione 5 — 16 settembre 2026 (v1 del 14/9 + sezione 6-bis su IVA, commissioni e tasse; scenari in ipotesi SRL con banner, video premiato e sponsor locali in-game; numeri dal modello Excel `Prono_Scenari_Costi_Ricavi_v2.xlsx`). Ipotesi di partenza concordate: ambizione da startup, nessun denaro dentro l'app (quote e montepremi restano fra amici, fuori), team = Andrea + 1-2 persone su design e marketing, partenza dalla cerchia dei gruppi attuali in Italia.*

Nota: questo documento contiene valutazioni normative e finanziarie fatte da chi non è né avvocato né commercialista. Prima di costituire la società, pubblicare i termini di servizio o incassare il primo euro, i punti marcati ⚖️ vanno confermati da un professionista.

---

## 1. La tesi in una frase

Pronò! è "il gioco di pronostici tra amici che gestisce tutto tranne i soldi": regole, punteggi, classifiche, risultati in automatico, per qualsiasi sport e formato — mentre la posta, se c'è, resta un accordo fra le persone, come al bar. In Italia esiste il Fantacalcio (milioni di utenti, un solo sport, un solo formato) e dall'estero Kicktipp (Germania, gratuito con pubblicità, forte nel B2B). Non esiste un prodotto italiano che faccia bene *tutti* gli sport a eliminazione diretta e a gironi, con il livello di cura dei punteggi che abbiamo già costruito nei satelliti (simulazioni Monte Carlo, classifica derivata, bonus).

Cosa abbiamo già, e che nessun concorrente in partenza ha: quattro competizioni reali giocate da gruppi veri (Wimbledino, Medusino, Formulito, Championsito) con regole calibrate e un'architettura già pensata per generalizzare. Il rischio principale non è tecnico: è che il prodotto resti un hobby ben fatto. Il piano serve a decidere, con numeri, se e quando smette di esserlo.

## 2. I vincoli che decidono il modello ⚖️

**Niente denaro dentro l'app, mai.** Il D.Lgs. 496/1948, art. 1, riserva allo Stato i giochi di abilità e i concorsi pronostici "per i quali si corrisponda una ricompensa di qualsiasi natura e per la cui partecipazione sia richiesto il pagamento di una posta in denaro". La riserva scatta quando ci sono *entrambe* le cose: premio e posta. Pronò! quindi non incassa quote, non distribuisce premi, non offre link di pagamento fra membri di una lega, non tiene contabilità dei soldi delle leghe. I "crediti" già previsti nel brief di Championsito restano punti virtuali senza valore. Questo va scritto nei termini di servizio e va evitato anche nel marketing (niente "vinci", "montepremi", "quota"): la posizione da tenere è "noi contiamo i punti".

**Niente pubblicità del gioco d'azzardo.** Il cosiddetto Decreto Dignità (L. 96/2018, art. 9) vieta in Italia la pubblicità di giochi con vincite in denaro. L'affiliazione con i bookmaker — il modo più ovvio con cui le app di pronostici estere fanno soldi — è esclusa. Va scritto nel piano perché è una tentazione che ricorrerà.

**Premi da sponsor = manifestazione a premio.** Se un giorno uno sponsor vuole regalare biglietti o maglie al vincitore di una competizione pubblica, si entra nel DPR 430/2001 (regolamento depositato, cauzione, funzionario/notaio alla chiusura). Fattibile, ma con costi fissi da 1.500-3.000 € per concorso: ha senso solo con sponsor veri. Fino ad allora: solo gloria, badge, classifiche.

**Marchi e dati.** I nomi delle squadre e dei giocatori sono dati di fatto e si possono usare; loghi, "Champions League", "Serie A", "Wimbledon" come marchi no — e non vanno nei nomi delle competizioni pubbliche ("Coppa dei campioni 2026/27", non "Champions League"). L'API ESPN che usiamo oggi non è ufficiale né licenziata: va bene per i gruppi di amici, non per un prodotto con utenti paganti. Nel piano c'è il passaggio a un fornitore con licenza (API-Football: da 19 $/mese per 7.500 richieste al giorno, 29 $ per 75.000) prima di aprire al pubblico.

**GDPR e minori.** Privacy policy, termini, registro trattamenti, età minima 14 anni (consenso digitale in Italia) con dichiarazione all'iscrizione. Costo una tantum 500-1.500 € per farli fare bene, più eventuale DPO non necessario a queste dimensioni.

## 3. Il prodotto: da quattro app a una piattaforma

Il brief in `CLAUDE.md` e `schema-dati.md` descrive già l'architettura. Qui la sequenza di costruzione, ordinata per valore e per il calendario sportivo reale.

**MVP (da ora a gennaio 2027).** Un solo login, più competizioni. Motore-competizione con i due formati veri: *bracket a eliminazione diretta* (con eventuale fase a gironi a monte, il caso Mondialito/Championsito) e *gara a classifica d'arrivo* (Formulito). Leghe private con capitano di lega che approva i membri — è il meccanismo di diffusione, non una funzione fra le altre. Scheda profilo, classifica con evidenziazione, risultati con sync automatico dal fornitore dati (l'orchestratore polling-adattivo di Wimbledino, con adapter per sport). Pannello admin di competizione come oggi in Championsito. PWA installabile: si evita per un anno la tassa degli store e le loro revisioni, e su Android una PWA si mette nel Play Store come TWA quando serve.

**Cosa NON fare nell'MVP.** Notifiche push native (si parte con email + WhatsApp condivisione), sezione "Esplora" completa (basta un elenco), campionati a girone unico stagionali (Serie A: escluso dal brief, resta escluso), tutto ciò che è personalizzazione del punteggio da parte degli utenti.

**Sequenza di competizioni-pilota, agganciata al calendario reale**, perché ogni lancio ha una data che non si sposta e porta utenti da sola:

| Quando | Competizione | Formato | Perché |
|---|---|---|---|
| Ora → gen 2027 | Champions, fase a campionato (già in corso su Championsito) | girone unico → qualificazione | Il gruppo pilota esiste già; si migra su Pronò! a fine fase |
| Feb–mag 2027 | Champions, Fase 2 (spareggi, ottavi… finale) | bracket KO | Prima competizione **nata** su Pronò!, con gli stessi utenti |
| Gen 2027 | Australian Open | bracket a 128 | Riuso diretto di Wimbledino, pubblico tennis |
| Mar 2027 → | Formula 1 2027 | gare a classifica | Riuso di Formulito, 24 tappe = 24 occasioni di rientro |
| Giu–lug 2027 | Wimbledon 2027 | bracket a 128 | Il brand originale, un anno dopo, sulla piattaforma |
| Estate 2027 | Mondiale per club / Europei U21 / Nations League | gironi + KO | Se il pubblico c'è, il calcio estivo tiene viva l'app |

**Motore unico, regole dichiarative.** Ogni competizione è un descrittore (struttura, criteri di ranking, tabella punti) interpretato dallo stesso codice — così la ventunesima competizione costa un file di configurazione, non tre settimane. Questo è il vero asset industriale del progetto e va costruito subito, non "dopo".

## 4. Come si diffonde: il capitano di lega

La crescita non passa dagli store né dalla pubblicità. Passa da un meccanismo solo, da rendere perfetto: **una persona crea una lega e invita il suo gruppo con un link WhatsApp**. Tutto il resto è secondario.

Il ciclo: uno dei soci di Championsito crea la lega "Ufficio" o "Calcetto del giovedì" su Pronò! per la Fase 2; manda il link; 8-15 persone si iscrivono in un minuto (login social oltre a email, nickname, dentro); ogni giornata l'app manda un promemoria "chiudono i pronostici fra 3 ore, 4 dei tuoi non hanno ancora giocato"; il capitano ha una pagina con i contatori (quella che abbiamo appena fatto in admin) e il tasto WhatsApp per sollecitare. A fine competizione, ogni membro riceve la propria scheda "stagione" condivisibile come immagine — è l'unico contenuto social che vale la pena produrre, perché lo produce l'utente.

Obiettivi numerici del meccanismo, da misurare dalla prima settimana: ogni utente attivo crea o entra in almeno 1,3 leghe; ogni lega porta in media 8 membri di cui 5 nuovi; almeno il 60% degli iscritti gioca la prima giornata utile e il 40% è ancora attivo all'ultima. Se dopo la Fase 2 della Champions il fattore di invito (nuovi utenti per utente esistente) è sotto 0,5, il prodotto non si diffonde da solo e il piano va rivisto prima di spendere in marketing.

**Cerchie di partenza, in ordine.** Uno: i gruppi attuali (soci di Championsito, Wimbledino, Formulito) — poche decine di persone, ma sono i primi capitani. Due: i loro luoghi — ufficio, squadra di calcetto, bar, gruppo di quartiere — ognuno una lega. Tre: contenuti leggeri sui social (un'immagine a settimana: "il pronostico più azzardato della giornata", "la classifica delle leghe più numerose") con un solo scopo, far cliccare "crea la tua lega". Quattro: dal secondo anno, il B2B (sezione 5).

**Store.** Play Store da subito come TWA della PWA (25 $ una tantum, revisione leggera). App Store più avanti (99 $/anno e una revisione più esigente): serve una versione nativa o un wrapper tipo Capacitor, e vale la pena solo quando gli utenti iOS che chiedono "dov'è l'app" sono tanti — su iPhone la PWA "aggiungi a Home" funziona già bene per un gioco che si apre due volte a settimana.

## 5. Da dove arrivano i soldi

Senza denaro in-app, e senza affiliazioni con i bookmaker, restano tre fonti realistiche, che vanno attivate in quest'ordine.

**Pronò! Pro per il singolo utente — 9,99 €/anno.** Il riferimento italiano è Fantacalcio: la sua Premium costa 12,49 €/anno e non dà vantaggi in campo (toglie la pubblicità, aggiunge la simulazione live). Kicktipp vende il "senza pubblicità" a 4,99 €/anno. Pronò! non parte con pubblicità, quindi il Pro deve valere per quello che aggiunge: statistiche personali complete (la scheda profilo estesa a tutte le stagioni), confronto con gli amici, badge e storico, scelta dei temi, leghe illimitate contro un tetto di 3 per chi non paga. Conversione attesa 3-5% degli utenti attivi: è il numero che si vede nei giochi freemium senza pay-to-win, non di più.

**Lega Pro per chi organizza — 19,90 € a competizione, 39,90 € a stagione.** È la fonte più coerente con la meccanica del capitano: chi crea una lega numerosa (ufficio da 40 persone, gruppo da 100) vuole nome e logo della lega, regole personalizzate (tabella punti propria, bonus in più), esportazione della classifica, più admin, e una pagina pubblica. Kicktipp vive esattamente di questo con il "Professional account", da 9,90 €/mese per 100 giocatori a 399,90 €/mese per 10.000. Qui la conversione si misura sulle leghe con più di 15 membri, non sugli utenti, e può essere alta (20-30%) perché paga una persona sola per il gruppo.

**Pronò! per aziende, bar, associazioni — 300-1.500 € a stagione.** Dal secondo anno: la stessa piattaforma con brand del cliente, iscrizione riservata, competizioni scelte dal cliente, report di partecipazione. Un CRAL con 300 dipendenti o una catena di bar che vuole animare il mercoledì di Champions non compra "un'app di pronostici", compra engagement, e lo paga come pagherebbe un evento. Dieci clienti coprono da soli i costi vivi di un anno. Richiede una persona che venda, ed è il motivo per cui la seconda persona del team dovrebbe essere commerciale più che designer, dal 2028.

**Sponsorizzazioni di visibilità** (un logo sulla competizione pubblica, senza premi): possibili da subito con sponsor locali, valori piccoli (200-500 €), utili più come prova sociale che come ricavo.

**Banner pubblicitari, rimossi dal Premium (deciso 2026-09-15).** Piccoli banner nelle schermate di consultazione — classifica, risultati, profilo — mai nel form dei pronostici, che è il momento in cui l'utente deve concentrarsi. Chi paga Pronò! Pro non li vede: è la leva di conversione più collaudata del settore (Fantacalcio e Kicktipp vendono esattamente "senza pubblicità"), e alza la conversione attesa dal 4% al 6%. Come ricavo diretto valgono poco: un banner in Italia rende 0,40-1,00 € per mille impressioni, un utente attivo ne genera circa 400 l'anno (3-4 aperture a settimana di partita, qualche schermata per volta, 8 mesi di competizioni), cioè **0,15-0,40 € per utente all'anno**. Diventano una voce che si vede solo sopra i 10-20.000 attivi. Tre condizioni pratiche: (1) sulla PWA si usa Google AdSense (AdMob è solo per app native); le pagine dietro login vengono monetizzate ma con rendimento più basso perché il crawler non le legge, quindi vale la pena avere pagine pubbliche (classifiche delle competizioni, regolamento) dove i banner rendono di più; (2) **bloccare la categoria "giochi e scommesse"** nelle impostazioni della rete pubblicitaria, altrimenti il Decreto Dignità si viola per interposta persona; (3) un consent banner conforme (CMP certificata Google, 0-30 €/mese) e l'aggiornamento della privacy policy.

**Video premiato, solo per cosmetici e dati live (deciso 2026-09-16).** L'utente sceglie di guardare un video di 15-30 secondi in cambio di un tema, un badge, o l'accesso per una giornata a dati in tempo reale (statistiche live, forma dei giocatori). Rende 5-9 € per mille visualizzazioni in Italia, dieci volte il banner, perché è volontario. Regola non negoziabile: **mai vantaggi in classifica** — niente jolly, niente punti, niente pronostici modificabili dopo la chiusura — perché Pronò! vende l'equità dei punteggi. Nel modello pesa poco (1.700-85.000 visualizzazioni l'anno secondo lo scenario, 120-760 €) ma è la forma di pubblicità che non irrita nessuno.

**Sponsor locali dentro il gioco (deciso 2026-09-16).** Non si vendono impressioni, si vende una presenza: "la classifica marcatori offerta da [pizzeria / concessionaria / palestra]", logo sulla competizione e nella scheda "stagione" che gli utenti condividono a fine fase. Uno sponsor locale paga 300-800 € a stagione; con 5.000 utenti attivi in una città, quattro sponsor valgono il doppio di tutti i banner. È la voce pubblicitaria che conta davvero, e richiede che qualcuno vada a venderli — la terza persona del team, a provvigione (20% nel modello). Vincoli identici al B2B: nessun bookmaker, nessun premio ai partecipanti (altrimenti scatta la manifestazione a premio).

## 6. Quanto costa, per stadio

L'infrastruttura non è il problema: Firebase a consumo fa pagare 0,06 $ per 100.000 letture Firestore e 0,18 $ per 100.000 scritture, con 50.000 letture e 20.000 scritture al giorno gratuite. Un utente attivo genera nell'ordine di 30-50 letture e 5 scritture in un giorno di partite. Il conto, arrotondato per eccesso e in euro al mese:

| Voce | 0-1.000 utenti (2026-27) | 1.000-10.000 (2027-28) | 10.000-50.000 (2028+) |
|---|---|---|---|
| Firebase (Firestore, Hosting, Auth, Functions) | 0-10 | 15-60 | 100-400 |
| Dati sportivi con licenza (API-Football o simile) | 0 (ESPN, solo per i gruppi chiusi) → 20 | 30-40 | 40-100 |
| Dominio, email transazionali, monitoraggio | 10 | 20 | 50 |
| Store (Google 25 $ una tantum, Apple 99 $/anno) | 3 | 10 | 10 |
| Strumenti design/social (Figma, Canva, scheduler) | 0-20 | 30-50 | 50-100 |
| Legale (privacy/termini 1.000 € una tantum) e fiscale — **P.IVA forfettaria**: commercialista 600-900 €/anno | 100-150 | 150 | — |
| Fiscale con **SRL(S)**, quando serve: commercialista con bilancio 1.500-2.500 €/anno, deposito bilancio e diritto camerale ≈ 450 €, tassa libri sociali 310 €, PEC/firma 50 € → 2.500-3.500 €/anno anche a ricavi zero | — | 250-300 | 300 |
| Marketing (contenuti, piccole campagne locali) | 0 | 100-300 | 500-1.500 |
| **Totale vivo al mese** | **≈ 130-200 €** | **≈ 450-800 €** | **≈ 1.000-2.500 €** |

Le persone sono il costo vero. Fino a 10.000 utenti il piano regge solo se Andrea e i collaboratori lavorano per equity o per compensi simbolici; il primo stipendio, anche parziale (1.500 €/mese), arriva quando i ricavi ricorrenti superano i 25-30.000 €/anno.

## 6-bis. Cosa resta di ogni euro: IVA, commissioni, tasse ⚖️

I ricavi delle sezioni 5 e 7 sono **lordi**. Fra il prezzo pagato dall'utente e i soldi in tasca ci sono quattro prelievi, e il loro peso dipende dalla forma giuridica più di qualunque altra scelta del piano.

**Canale di incasso.** Vendendo dal sito (PWA, Stripe): commissione ≈ 1,5% + 0,25 € a transazione, cioè 0,40 € su 9,99. Vendendo dagli store: Apple e Google trattengono il **15%** del prezzo al netto dell'IVA (regime "small business", sotto 1 milione di dollari l'anno), e Apple riversa l'IVA per conto tuo. Su 9,99 € restano 7,79 € dal web contro 6,96 € dallo store: è il motivo economico, oltre a quello di velocità, per cui il piano parte dalla PWA.

**IVA.** Al consumatore il prezzo è IVA inclusa: di 9,99 € il 22% (1,80 €) va allo Stato, il ricavo è 8,19 €. Alle aziende (B2B) l'IVA si aggiunge sopra e il cliente la detrae: nessuna perdita. In regime forfettario l'IVA non si applica affatto — è il primo grande vantaggio di quella forma.

**Tasse e contributi, tre forme a confronto:**

| | P.IVA forfettaria (ATECO 62.01 software) | SRL / SRLS | Prestazione occasionale |
|---|---|---|---|
| IVA sulle vendite ai privati | nessuna: 9,99 € restano ricavo | 22%: ricavo 8,19 € | — |
| Base imponibile | 67% dei ricavi (coefficiente forfait, costi non deducibili) | utile reale (ricavi − costi) | compenso |
| Imposte | sostitutiva **5%** per 5 anni (nuova attività), poi 15% | IRES 24% + IRAP 3,9% ≈ 28% sull'utile; **+26%** sui dividendi distribuiti ai soci | IRPEF ad aliquota marginale (23-43%) |
| Contributi | INPS gestione separata **26,07%** sull'imponibile (24% se hai già altra copertura previdenziale) | sui compensi agli amministratori: gestione separata 26-35% + IRPEF | gestione separata oltre 5.000 €/anno |
| Prelievo complessivo sui ricavi lordi | **≈ 21%** (primi 5 anni) | **≈ 55-60%** del ricavo se l'utile esce come dividendo | — |
| Costi fissi annui a ricavi zero | 600-900 € | 2.500-3.500 € | 0 |
| Limiti | ricavi < 85.000 €; **esclusa se nell'anno prima hai avuto redditi da lavoro dipendente > 35.000 €**; niente soci con quote | nessuno | **non utilizzabile**: vendere abbonamenti è attività abituale, serve P.IVA dal primo incasso |

Un esempio su 9,99 € Pro dal web: in forfettario in tasca restano **≈ 7,50 €**; in SRL con utile distribuito **≈ 4,20 €** prima ancora dei costi. A questi volumi il forfettario è la forma giusta e va verificata subito la tua eleggibilità (soglia dei redditi da dipendente). Il passaggio a SRL ha senso in due casi soltanto: quando entrano soci con quote (i collaboratori "co-fondatori"), o quando i ricavi si avvicinano a 85.000 €. In quel momento vale la pena valutare la **startup innovativa** (registro speciale delle imprese: niente diritto camerale né tassa libri per i primi anni, credito d'imposta 30-50% per chi investe, contratti di lavoro flessibili) — richiede requisiti come 15% di spese in R&S o software registrato.

## 7. Tre scenari a 24 mesi (ipotesi SRL: Pro + banner + video premiato + sponsor in-game)

Ipotesi comuni, anno 2 (luglio 2027 – giugno 2028), forma giuridica SRL(S) dall'inizio: Pro 9,99 €/anno con conversione **6%** degli attivi medi (era 4% senza pubblicità: togliere banner e video è il primo motivo per cui si paga); una Lega Pro ogni 40 utenti attivi, 30 € medi; B2B 0 / 5.000 / 20.000 €; banner con eCPM 0,40 / 0,60 / 1,00 € e 400 impressioni per utente non-Pro all'anno; video premiato guardato dal 20-30% dei non-Pro, 10-20 volte l'anno, a 5-9 € per mille; sponsor locali 1 / 4 / 10 a 300 / 500 / 800 € con provvigione 20% al venditore; utenti attivi medi dell'anno = 60% del valore di giugno 2028. Prelievi: IVA 22% sul consumer (non su B2B, sponsor e pubblicità), commissioni di pagamento 5% sul consumer, costi fissi societari 3.000-3.500 €, strumenti pubblicitari 300-600 €, IRES+IRAP 28% sull'utile, 26% sui dividendi.

I numeri qui sotto sono calcolati dal modello `Prono_Scenari_Costi_Ricavi_v2.xlsx` (stessa cartella), che è la fonte di verità: ogni ipotesi è una cella modificabile, tutto il resto è formula.

| | Prudente | Base | Ottimista |
|---|---|---|---|
| Attivi a giugno 2028 (media anno) | 1.500 (900) | 8.000 (4.800) | 25.000 (15.000) |
| Pro 9,99 € × 6% degli attivi medi | 540 € | 2.880 € | 8.990 € |
| Lega Pro | 675 € | 3.600 € | 11.250 € |
| B2B | 0 € | 5.000 € | 20.000 € |
| Banner | 135 € | 1.080 € | 5.640 € |
| Video premiato | 10 € | 120 € | 760 € |
| Sponsor locali in-game | 300 € | 2.000 € | 8.000 € |
| **Ricavi lordi** | **1.660 €** | **14.680 €** | **54.640 €** |
| Ricavi netti di IVA, commissioni e provvigioni | 1.320 € | 12.790 € | 48.380 € |
| Costi vivi + società + pubblicità | 4.965 € | 7.415 € | 17.325 € |
| Utile lordo | −3.650 € | 5.370 € | 31.060 € |
| **Utile netto (IRES/IRAP)** | **perdita** | **≈ 3.870 €** | **≈ 22.390 €** |
| … in tasca ai soci come dividendo | — | ≈ 2.870 € | ≈ 16.570 € |
| Anno 1 (5 mesi di monetizzazione) | −5.580 € | −5.410 € | −4.120 € |
| Pubblicità totale, netto provvigioni | 380 € | 2.800 € | 12.800 € |
| Attivi medi necessari per coprire i costi (senza B2B e sponsor) | 4.100 | 5.800 | 11.800 |

**Cosa pesa davvero nella pubblicità.** Le tre forme insieme valgono il 22-27% dei ricavi lordi nell'anno 2, ma con pesi opposti a quanto si crederebbe: gli sponsor locali fanno 300 / 2.000 / 8.000 €, i banner 135 / 1.080 / 5.640 €, il video premiato 10 / 120 / 760 €. Per utente non-Pro, banner e video insieme rendono 0,17-0,45 € l'anno — un decimo del Pro: il loro valore è soprattutto rendere il "senza pubblicità" desiderabile (i due punti di conversione in più valgono 960 € nel base e 3.000 € nell'ottimista). Gli sponsor invece sono ricavo vero e scalano con il lavoro commerciale, non con gli utenti: quattro pizzerie in una città valgono il doppio dei banner. Conclusione operativa: banner e video si accendono con il Premium (Fase 2 Champions, febbraio 2027); gli sponsor si vendono da subito, uno alla volta, ai contatti dei soci.

**Il primo anno è in perdita in tutti gli scenari** (4.100-5.600 €: costituzione, legale, commercialista, con cinque mesi di ricavi) e va coperto con capitale dei fondatori. Senza B2B e sponsor il pareggio sta fra 4.000 e 6.000 utenti attivi medi, cioè 7-10.000 attivi a fine anno: la parte "venduta a mano" (aziende, sponsor) è ciò che separa il base dal prudente.

**Il confronto con il forfettario resta valido** (sezione 6-bis): a parità di scenario base, la P.IVA forfettaria lascerebbe in tasca ≈ 5.700 € contro i 2.870 della SRL, perché non paga l'IVA sul consumer, non ha i 3.000 € di costi fissi societari e tassa al 5%. Partire in SRL è una scelta di struttura (soci con quote, credibilità verso B2B, sponsor e investitori), non di convenienza fiscale: nei primi due anni costa 2.000-9.500 € l'anno più del forfettario, e va messa in conto come investimento.

Lo scenario prudente è una perdita secca in SRL: niente di male, ma non è una startup e va riconosciuto in tempo. Lo scenario base copre i costi e poco più — non paga un collaboratore, e per questo la seconda persona del team deve entrare per equity o per una quota dei ricavi che porta, non con un compenso fisso. Solo l'ottimista giustifica di cercare capitale, e a quel punto lo si cerca con numeri in mano, non con un pitch.

**Criteri di decisione (kill/continue), da scrivere ora e rispettare dopo:**
- Marzo 2027 (dopo un mese di Fase 2 Champions su Pronò!): almeno 300 utenti registrati e fattore di invito ≥ 0,5. Altrimenti si resta side project e si smette di investire tempo di terzi.
- Luglio 2027 (dopo Wimbledon): almeno 1.000 attivi e le prime 20 leghe Pro pagate. Altrimenti niente SRLS, niente store Apple, niente marketing a pagamento.
- Dicembre 2027: primi 3 clienti B2B firmati. Altrimenti il B2B non è la strada e si punta tutto sul consumer, o si cerca un partner che venda.

## 8. Team, società, tempo

**Ruoli.** Andrea: prodotto e sviluppo (con Claude come acceleratore, come finora). Persona 2: design e identità (dal brief "Arena": blu notte, arancio fischietto, Space Grotesk/Inter) più i contenuti social — 5-8 ore a settimana bastano nel primo anno. Persona 3, dal secondo anno: commerciale per il B2B e le leghe Pro, a provvigione.

**Forma giuridica.** Finché non si incassa, niente: tutto gratuito. Dal primo abbonamento venduto serve la partita IVA — la "prestazione occasionale" non è utilizzabile, perché vendere abbonamenti è attività abituale — e la forma giusta è la **P.IVA in regime forfettario** intestata ad Andrea (vedi 6-bis: prelievo ≈ 21% invece del 55-60% di una SRL con dividendi, costi fissi minimi), da aprire con codice ATECO 62.01 e con la verifica preliminare della soglia dei 35.000 € di redditi da dipendente. I collaboratori, in questa fase, vanno compensati con una quota dei ricavi che generano (fattura o ritenuta), non con quote societarie. La **SRLS** (capitale minimo, atto standard, 1.000-1.500 €, poi 2.500-3.500 €/anno di costi fissi) arriva quando entrano soci con quote o quando i ricavi si avvicinano a 85.000 €: a quel punto quote e vesting a 3-4 anni vanno definiti *prima* di costituirla, ed è il momento di valutare la startup innovativa. ⚖️

**Tempo.** Da qui a marzo 2027, l'obiettivo tecnico è uno: la Fase 2 di Champions gira su Pronò! con gli utenti di Championsito migrati, e Australian Open e F1 sono competizioni configurate, non riscritte. Sono circa 300-400 ore di sviluppo: fattibile in sei mesi a 12-15 ore a settimana, che è l'impegno da mettere a bilancio personale prima di cominciare.

## 9. Cosa misurare, ogni settimana

Cinque numeri, in una pagina admin, dalla prima competizione: iscritti totali e nuovi della settimana; attivi (hanno salvato un pronostico) sull'ultima giornata; leghe create e membri medi per lega; fattore di invito (nuovi iscritti arrivati da link di lega / utenti attivi); percentuale di "completamento" della giornata (pronostici salvati / partite disponibili). Il sesto, dal primo incasso: ricavo ricorrente annuo. Tutto il resto — download, visualizzazioni, follower — non decide nulla.

## 10. Rischi e come si contengono

Una sola persona sviluppa: il motore dichiarativo e la documentazione (i CLAUDE.md, i test come `test_punteggi.js`) sono l'assicurazione, e vanno mantenuti come si è fatto finora. Il fornitore dati non ufficiale (ESPN) può sparire da un giorno all'altro: l'adapter è già un'interfaccia separata, il passaggio a un'API con licenza si fa in giorni, e va fatto prima di aprire al pubblico. Stagionalità: il calcio riempie l'autunno e la primavera, il tennis l'estate, la F1 tutto l'anno — il calendario in sezione 3 è scelto anche per questo. Un concorrente grande (Fantacalcio che aggiunge i pronostici, Kicktipp che traduce in italiano): la difesa è la nicchia dei formati che loro non fanno bene — tennis, bracket, F1 — e la qualità dei punteggi. Il rischio normativo lo abbiamo neutralizzato tenendo i soldi fuori; resta da non farsi trascinare dentro dagli utenti che chiederanno "perché non gestite voi le quote?". La risposta è no, per scritto, sempre.

## 11. I prossimi 30 giorni

Chiudere Championsito bene (functions o ricalcolo locale, PDF ai soci, vecchia function cancellata): è la vetrina, deve funzionare. Scrivere il descrittore di torneo per la Fase 2 Champions e per un bracket a 128 (Australian Open): se un solo motore li digerisce entrambi, l'architettura è giusta. Aprire il progetto Firebase unico di Pronò! con lo schema di `schema-dati.md` e le security rules partizionate per lega. Registrare il dominio e mettere online una pagina di attesa con un solo bottone: "Crea la tua lega per la Champions, da febbraio". Parlare con i 20-30 soci attuali e chiedere a cinque di loro di fare i capitani di lega a febbraio, con i loro gruppi. Chiedere un preventivo a un legale per privacy e termini, così il numero è vero e non stimato.

---

### Fonti consultate il 14 settembre 2026
- Kicktipp, prezzi del Professional account: [kicktipp.com/info/professional/prices](https://www.kicktipp.com/info/professional/prices); abbonamento senza pubblicità 4,99 €/anno: [scheda app](https://mwm.ai/apps/kicktipp/570703120)
- Leghe Fantacalcio Premium 12,49 €/anno: [ConsiglioFantacalcio](https://consigliofantacalcio.altervista.org/quanto-costa-leghe-fantacalcio-abbonamento-per-diventare-utente-premium/), [Fantacalcio.it](https://www.fantacalcio.it/news/redazionali/01_02_2024/premium-app-leghe-fantacalcio-in-promo-flash-per-i-primi-6-mesi-e-un-piccolo-aumento-di-prezzo-455927)
- Prezzi Firebase/Firestore: [firebase.google.com/pricing](https://firebase.google.com/pricing), [Firebase Pricing 2026](https://www.budgetforge.dev/tools/firebase-pricing-2026)
- API-Football, piani e prezzi: [api-football.com/pricing](https://www.api-football.com/pricing)
- D.Lgs. 14 aprile 1948 n. 496, testo ADM: [adm.gov.it](https://www.adm.gov.it/portale/documents/20182/1100014/D_Lgs_14_4_1948_n._496.pdf/7d9ec808-332d-430b-ae4c-98bf83f12ea1)
- Regime forfettario 2026 (limite 85.000 €, esclusione dipendenti > 35.000 €, imposta 5%/15%): [Fiscomania](https://fiscomania.com/regime-forfettario/), [coefficienti di redditività](https://www.calcoloforfettario.it/blog/coefficienti-redditivita-forfettario-2026.php)
- INPS gestione separata 2026 (26,07% / 24%, circolare INPS n. 8/2026): [Fisco e Tasse](https://www.fiscoetasse.com/new-rassegna-stampa/3491-gestione-separata-inps-2026-aliquote-e-massimali-contributivi.html)
- eCPM banner mobile 2026 (USA 0,30-0,80 $, Italia mercato di seconda fascia): [Maf.ad](https://maf.ad/en/blog/mobile-ads-ecpm/), [RevenueLab benchmarks](https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026); display Europa tier 2: [AdStimate](https://adstimate.com/blog/adsense-rpm-by-country.html)
- Apple App Store Small Business Program (15%): [developer.apple.com](https://developer.apple.com/app-store/small-business-program/); Google Play 15% sul primo milione: [Play Console Help](https://support.google.com/googleplay/android-developer/answer/10632485?hl=en)
