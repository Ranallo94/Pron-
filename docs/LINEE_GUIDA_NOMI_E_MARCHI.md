# Pronò! — nomi, marchi e dati di terzi: linee guida

*Redatto il 2026-11-03. **Non è un parere legale**: sono regole prudenti ricavate da principi generali (marchi, diritto al nome e all'immagine, diritto d'autore sulle banche dati). Le questioni ⚖️ vanno confermate da un professionista della proprietà intellettuale prima di un lancio commerciale.*

## 1. L'idea in una riga

**Nominare è quasi sempre possibile; farsi passare per l'organizzatore o usare i suoi segni distintivi no.** Si può scrivere "pronostici sul Gran Premio di Monza" o "giocatori della Juventus"; non si può usare il loro logo, le loro foto, o dare l'impressione che Pronò! sia ufficiale o approvato.

## 2. Tre zone

| Zona | Cosa vuol dire | Esempi |
|---|---|---|
| ✅ **Normale** | Nomi in **solo testo**, per descrivere o identificare, in un contesto di gioco e di informazione | nomi di squadre e giocatori nelle schede; "Wimbledon", "Serie A", "Gran Premio d'Italia" come titolo descrittivo di una competizione; risultati, classifiche, date del calendario |
| ⚠️ **Con cautela** | Usi più "di marketing" o che si avvicinano a un'endorsement | nome di un atleta nel titolo di un'edizione speciale o in una grafica promozionale; nome del torneo nelle storie social e nelle schede degli store; colori molto riconoscibili di un marchio |
| ⛔ **Da evitare** | Segni distintivi e identificazione con il titolare | **loghi, stemmi, mascotte, caratteri ufficiali, foto dei giocatori, magliette**; marchi di terzi **nel nome dell'app, nel dominio, negli account social, nelle parole chiave degli store**; scritte come "ufficiale", "partner", "licenza"; sembrare un prodotto del torneo |

## 3. Le tue domande, una per una

- **"Wimbledon", "Slam", "Gran Premio", "Serie A" in app?** Sì come **nome descrittivo** della competizione e nel testo ("Pronostici su Wimbledon 2027"). Sono marchi (Wimbledon, Serie A, Formula 1…) o termini d'uso comune ("Gran Premio", "slam"): il rischio nasce se diventano **il nome del prodotto**, il dominio o il logo. Da evitare i loghi e i caratteri ufficiali.
- **Nomi dei giocatori?** Sì **in solo testo**, come dato della competizione (è la base di ogni gioco di pronostici). No foto, no uso del nome come richiamo pubblicitario ("gioca con X"), no presentazione come testimonial. Il nome e l'immagine di una persona hanno una tutela propria ⚖️.
- **Nomi delle squadre?** Sì in solo testo, meglio con sigle e colori neutri. **No stemmi né magliette.**
- **Nomi dei tornei?** Come sopra: nel titolo descrittivo sì, come brand no. Meglio "Pronostici – Wimbledon 2027" che "Wimbledon Predictor".
- **Calendari e risultati?** Fatti pubblici; ma **i feed ufficiali sono dati con licenza**. Usare le API non ufficiali (come ESPN oggi) va bene per i gruppi chiusi, **non** per un prodotto aperto: il piano prevede il passaggio a un fornitore con licenza prima di aprire al pubblico. ⚖️

## 4. Cosa applico io nell'app

1. **Solo testo** per squadre, giocatori e tornei. Nessun logo, stemma o foto. Colori ed icone nostri.
2. **Titoli descrittivi** delle competizioni ("Pronostici – Serie A, giornate 6–10").
3. **Frase di chiarimento** nelle regole e nelle schede degli store: *«Pronò! è un gioco tra amici, non affiliato né approvato dagli organizzatori delle competizioni citate.»*
4. **Niente marchi di terzi** nel nome dell'app, nel dominio, negli account social, nelle parole chiave.
5. **Edizioni speciali dedicate a persone reali:** vanno trattate con cautela (vedi §5).
6. **Se arriva una diffida**, si rinomina subito: la competizione è un dato, non cambia il motore.

## 5. Una correzione a quello che ho fatto

Per Formulito ho preparato una **"Kimi Edition"** con la scritta "Edizione speciale · Andrea Kimi Antonelli" in banner e grafiche. Dentro un gruppo di amici il rischio è minimo, ma nella **Beta pubblica** è un uso promozionale del nome di una persona reale, quindi nella zona ⚠️. Per Pronò! consiglio di **non** usare nomi di atleti nei titoli delle edizioni: si può fare un'edizione "a tema" con colori e grafica senza il nome (per esempio "Edizione Messico · Mercedes teal" senza richiamare la persona) oppure chiedere un consenso. Nel codice di Pronò! l'edizione speciale è un tema generico (`tema`, `edizione`), quindi la scelta è solo di testi.

## 5-bis. Verifica preliminare sul nome "Pronò!" (2026-11-03)

Ricerca fatta su **TMview** (banca dati di EUIPO e UIBM), nomi che **contengono "prono"**: 167 risultati tra marchi dell'Unione europea e italiani. Gli accenti e il punto esclamativo non cambiano il confronto. **Non è una ricerca professionale** e non è un registro ufficiale (lo dice TMview stesso).

| Marchio | Ufficio | Classi | Stato | Rilevanza |
|---|---|---|---|---|
| **PRONO CORSE** (richiedenti: due persone fisiche) | Italia (UIBM), dep. 2002 | **9, 41, 42** (software, intrattenimento e giochi, servizi informatici) | Registrato | **La più rilevante**: stesse classi di un'app di pronostici. Nome diverso (con "CORSE"), ma da far valutare |
| **PRONO 1897** (titolare: persona fisica) | UE (EUIPO), dep. 2017 | 36, 37, 42 | Registrato | Bassa: servizi finanziari e costruzioni, in parte software |
| Altri ~160 (PRONOVA, PRONOX, PRONOIA…) | UE e Italia | farmacia, chimica, abbigliamento… | vari | Nessuna: parole diverse e settori diversi |

**Letture:**
- Nessun marchio **identico** "PRONO" o "PRONÒ" nelle classi giuste, nei due uffici controllati.
- **"Prono" è debole come marchio:** è l'abbreviazione di "pronostico" (in francese è gergo corrente per "pronostic"), quindi **descrittivo** per un gioco di pronostici. Questo ha due conseguenze: è **difficile da registrare** come sola parola (rischio di rifiuto) ⚖️, e **non lo proteggerebbe** da chi usa nomi simili.
- **Il mercato è affollato di "Prono":** ho trovato app con questo nome o simile (soprattutto francesi: *Prono SPORTS*, *Mon Petit Prono*, *Corsaire Prono*) e un sito che usa già `prono.web.app` (un'app olandese). Nessuna app italiana col nome esatto "Prono" nei risultati che ho visto.
- **Non coperto:** altri paesi, marchi internazionali (WIPO), Google Play e le liste complete degli store. Nessuna ricerca di marchi **simili** (per esempio "Pronostico", "Pronos").

**Consiglio:** per la Beta si può usare il nome. **Prima di investire in grafica, store e promozione** conviene che un consulente valuti (a) il rischio verso *PRONO CORSE* e (b) se aggiungere un elemento distintivo al nome (per esempio un secondo vocabolo o il logo "bracket") per renderlo registrabile.

## 6. Prima di un lancio commerciale ⚖️
- **Ricerca del marchio "Pronò!"** (nome dell'app) su UIBM ed EUIPO (TMview, gratuito): per verificare che non esista già un marchio uguale o simile nelle classi software e giochi.
- **Parere di un legale** su marchi sportivi, diritto d'immagine dei giocatori e dati con licenza: il preventivo già previsto per privacy e termini può includere questo punto.
- **Nome e immagini nelle schede degli store:** Apple e Google controllano la proprietà intellettuale e possono rimuovere l'app a seguito di segnalazione.
