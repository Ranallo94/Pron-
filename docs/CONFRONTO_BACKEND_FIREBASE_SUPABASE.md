# Pronò! — confronto backend: Firebase vs Supabase

*Redatto il 2026-11-02. Serve a decidere il backend della piattaforma unica. Prezzi in dollari, IVA esclusa; gli importi in euro sono approssimativi (1 $ ≈ 0,9 €, da verificare al cambio del giorno).*

> **Decisione del 2026-11-02: si procede con Firebase.** Il documento resta come riferimento per costi e rischi; la prova su Supabase non si fa.

## 1. In breve

- **I costi sono dello stesso ordine di grandezza.** Fino a 10.000 utenti attivi si parla di 0–40 $/mese con Firebase e 25–30 $/mese con Supabase. Oltre i 50.000 utenti si arriva a circa 90–220 $ con Firebase e 75–125 $ con Supabase. **Il costo non è il criterio che decide.**
- **Cambia il tipo di rischio.** Firebase costa a consumo: una scrittura di query poco accorta (es. ricalcolare la classifica a ogni evento) moltiplica la bolletta. Supabase ha un canone fisso e scatti di potenza prevedibili.
- **Per leghe, iscrizioni e classifiche Supabase è tecnicamente più adatto** (database relazionale, permessi per riga, ricalcolo dentro il database). Firebase vince su offline integrato, strumenti già noti e ripartenza più rapida.
- **La mia raccomandazione:** provare Supabase con una prova di 1–2 giorni (§6) prima di scegliere. Se la prova va bene, adottarlo; altrimenti restare su Firebase con TypeScript.

## 2. Cosa è verificato e cosa no

| Dato | Stato |
|---|---|
| Supabase: Free, Pro 25 $/mese, Team 599 $/mese; MAU, disco, egress, calcolo, Realtime, Edge Functions | **Verificato** sulla pagina ufficiale supabase.com/pricing (letta il 2026-11-02) |
| Supabase: regioni disponibili (es. UE) | **Non presente** sulla pagina prezzi. Mi risulta che esistano regioni europee, ma va confermato alla creazione del progetto |
| Firebase: quote gratuite Firestore, Hosting, Functions, Auth | **Verificato** su firebase.google.com/pricing |
| Firebase: prezzi oltre la quota (letture/scritture Firestore, MAU oltre 50.000, GB-secondi Functions) | **Non verificato**: la pagina rimanda a pagine Google Cloud non leggibili. Uso i valori del piano di settembre (0,06 $ per 100.000 letture, 0,18 $ per 100.000 scritture, area UE); fonti terze danno intervalli diversi |

## 3. Prezzi ufficiali che contano

**Supabase** (pagina ufficiale)
| | Free | Pro (da 25 $/mese) |
|---|---|---|
| Utenti attivi (MAU) | 50.000 | 100.000, poi 0,00325 $ ciascuno |
| Database | 500 MB | 8 GB, poi 0,125 $/GB |
| Traffico in uscita | 5 GB | 250 GB, poi 0,09 $/GB |
| File | 1 GB | 100 GB, poi 0,0213 $/GB |
| Calcolo | condiviso, 500 MB RAM | credito 10 $ (un'istanza Micro); Micro 10 $, Small 15 $, Medium 60 $, Large 110 $ |
| Realtime | 2 M messaggi, 200 connessioni | 5 M messaggi (poi 2,50 $/M), 500 connessioni (poi 10 $ ogni 1.000) |
| Funzioni Edge | 500.000 chiamate | 2 M (poi 2 $/M) |
| Backup | nessuno | giornalieri, 7 giorni (ripristino puntuale +100 $/mese) |
| Pausa | **dopo 1 settimana di inattività** | mai |

**Firebase** (pagina ufficiale)
- **Firestore, quota giornaliera gratuita:** 50.000 letture, 20.000 scritture, 20.000 cancellazioni; 1 GiB; 10 GiB/mese in uscita. Oltre: tariffe Google Cloud.
- **Autenticazione:** gratis fino a 50.000 MAU.
- **Hosting:** 10 GB gratis di spazio, 360 MB/giorno di traffico, poi 0,15 $/GB.
- **Funzioni:** 2 M chiamate/mese gratis, poi 0,40 $/M. Richiedono il piano Blaze con carta collegata.
- **Spark contro Blaze:** Spark è gratuito ma si ferma alla quota; Blaze paga l'eccedenza.

## 4. Modello di costo mensile

**Ipotesi** (modificabili, partono da quelle del piano: 30–50 letture e 5 scritture a utente nei giorni di gara)
- Per utente attivo al mese: 600 letture e 75 scritture.
- 300 ricalcoli classifica al mese su tutta la piattaforma; ogni ricalcolo legge i pronostici del 40% degli utenti.
- Pagina da 2 KB per lettura; 8 MB al mese di traffico di pagine per utente (con cache).
- Scenari: **S1** 1.000 utenti (2 competizioni), **S2** 10.000 (6), **S3** 50.000 (15). Il "caso cattivo" moltiplica le letture per 5 e raddoppia le scritture (query poco ottimizzate).
- Supabase: calcolo Micro per S1, Small per S2, Medium per S3 (ipotesi mia); S3 con circa 3.000 connessioni in contemporanea nei picchi.

| Scenario | Firebase (tutto, Hosting incluso) | Firebase, caso cattivo | Supabase Pro (senza Hosting) |
|---|---|---|---|
| **S1 · 1.000 utenti** | 0 $ | ~1 $ | **25 $** (Free possibile ma si ferma dopo 1 settimana senza uso e non ha backup) |
| **S2 · 10.000** | ~15 $ | ~40 $ | **~30 $** |
| **S3 · 50.000** | ~92 $ | ~220 $ | **~100 $** (75–125 $ secondo calcolo e connessioni) |

**Note**
- **Hosting della pagina con Supabase:** Supabase non ospita il sito. Con Firebase Hosting si aggiungono ~10 $ (S2) e ~58 $ (S3); con Cloudflare Pages il traffico è gratuito.
- **Coerenza con il piano:** la tabella del piano di settembre dava 15–60 €/mese per Firebase tra 1.000 e 10.000 utenti e 100–400 € oltre i 10.000. Il modello qui sopra cade nello stesso intervallo.
- **Cosa non è incluso:** dominio, email di sistema, strumenti di design, dati sportivi con licenza, SMS. Sono uguali con i due fornitori.
- **Oltre 50.000 utenti con Firebase** l'autenticazione ha un costo per MAU non verificato.

## 5. Confronto tecnico

| Tema | Firebase | Supabase | Chi è più adatto a Pronò! |
|---|---|---|---|
| **Modello dati** | Documenti. Utenti ↔ leghe ↔ competizioni vanno duplicati o riletti | Tabelle collegate; classifiche con una query | Supabase |
| **Permessi** | Regole Firestore: un admin di lega non deve toccare un'altra lega; difficili da scrivere e provare | Regole per riga in SQL, verificabili con test | Supabase |
| **Ricalcolo classifica** | Funzioni cloud: in 2 app su 3 non si sono mai riuscite a pubblicare | Funzione o trigger dentro il database, atomico | Supabase |
| **Costi** | A consumo: sensibile a come si scrivono le query | Canone fisso + scatti di potenza | Pari; Supabase più prevedibile |
| **Offline e dati in tempo reale** | Cache offline integrata, realtime molto maturo | Realtime sì, offline da costruire | Firebase |
| **Login** | Email, social, Apple, telefono | Email, magic link, social, Apple (da configurare) | Pari |
| **Prova in locale** | Emulatori Firebase (serve Node/Java) | Supabase in locale (serve Docker) | Pari |
| **Dipendenza dal fornitore** | Alta (formati proprietari) | Bassa: è PostgreSQL, esportabile o installabile in proprio | Supabase |
| **Sede dei dati (GDPR)** | Regioni UE disponibili | Regioni UE da confermare | Da verificare |
| **Ripartenza** | Conosciamo già Firebase, il codice dei satelliti lo usa | Si riparte da zero: schema, regole, accesso ai dati | Firebase |
| **Motore di punteggio** | Funziona uguale: è codice puro | Idem | Nessuna differenza |

## 6. Come deciderei in 1–2 giorni

1. Creare un progetto Supabase di prova (piano Free) in regione europea.
2. Scrivere lo schema minimo: `utenti`, `competizioni`, `leghe`, `iscrizioni`, `pronostici`, `risultati`.
3. Aggiungere le regole per riga: l'admin di una lega vede solo la sua.
4. Scrivere **una funzione di classifica** che usa il motore di punteggio e aggiorna le posizioni di una lega.
5. Caricare 5.000 utenti finti e 20 leghe, misurare tempi e ripetere il ricalcolo.
6. **Criteri di scelta:** regole di sicurezza chiare e provate, ricalcolo sotto 1–2 secondi per lega, nessun ostacolo sulla regione UE. Se uno solo fallisce, resto su Firebase con TypeScript.

## 7. Rischi principali

- **Firebase:** costi che salgono con query poco accorte; permessi complessi per le leghe; Cloud Functions da risolvere all'inizio.
- **Supabase:** la prima volta si scrive SQL e si impostano le regole per riga (io lo so fare, ma serve prova); piano Free con pausa e senza backup (da evitare con utenti veri); regione UE da confermare; scatto di prezzo del Team a 599 $/mese solo se servono funzioni aziendali.
- **Tutti e due:** i dati sportivi con licenza e le competizioni di tipo non sportivo non dipendono dal fornitore.

## 8. Fonti

- Supabase, prezzi ufficiali: https://supabase.com/pricing
- Firebase, prezzi ufficiali: https://firebase.google.com/pricing
- Prezzi oltre quota (Google Cloud): https://cloud.google.com/firestore/pricing (non leggibile nella verifica del 2026-11-02, da controllare a mano)
- Guide di terzi usate solo per i confronti: makerkit.dev, jetadmin.io, activepieces.com (cifre non sempre concordi)
