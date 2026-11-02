# Pronò!

Piattaforma di pronostici tra amici: sport e non solo, un account unico, regole e punteggi come **dati** (il "descrittore di torneo"), non codice.

Il brief di progetto e le decisioni sono in [CLAUDE.md](./CLAUDE.md). Tutta la documentazione è in [docs/](./docs/).

## Cosa c'è qui

| Cartella | Contenuto |
|---|---|
| `engine/` | Motore di calcolo puro (classifiche, punteggi, tabelloni). Senza Firebase. Vedi [engine/README.md](./engine/README.md) |
| `docs/` | Piani, schema dati, confronto backend, quadro costi e ricavi, piano di migrazione |
| `scripts/` | Utilità (copia dei documenti su OneDrive) |
| `app/` | L'applicazione (React + TypeScript + Vite, installabile come PWA). Scheletro con le 4 sezioni; Firebase si collega con `.env.local`. Piano in [BETA_PUBBLICA.md](./docs/BETA_PUBBLICA.md) |

## Su un computer nuovo

1. Installa **Node.js 22 o superiore** e **Git**. Per provare le regole di sicurezza servirà anche **Java (JDK 17+)**.
2. Clona il repository dove vuoi (il percorso non conta: nel codice non ce ne sono scritti).
3. Copia `.env.example` in `.env.local` e adatta i due percorsi OneDrive.
4. Esegui `npm test`: devono passare tutti i test.

## Comandi

```bash
npm install            # una volta, dopo aver clonato
npm test               # test del motore (include la parità con le vecchie app, se PRONO_SATELLITI_DIR è impostata)
npm run test:regole    # prova le regole di sicurezza di Firestore con l'emulatore (serve Java, vedi PRONO_JAVA_HOME)
npm run dev            # avvia l'app in locale (http://localhost:5173)
npm run typecheck      # controllo dei tipi (genera prima i tipi del motore)
npm run build          # compila l'app in app/dist
npm run onedrive       # copia i documenti nella cartella OneDrive (per leggerli dal telefono)
```

## Regole di portabilità

- **Nessun percorso assoluto nel codice.** Percorsi diversi tra computer si gestiscono con variabili d'ambiente (`.env.local`, ignorato da Git).
- **Nessun segreto nel repository:** chiavi di servizio, `.env`, `sa.json` sono nel `.gitignore`.
- **Il repository su GitHub è la versione di riferimento.** La cartella OneDrive contiene solo copie di lettura, materiali (grafiche, PDF, fogli di calcolo) e le vecchie app.
- Fine riga uniforme (LF), codifica UTF-8.

## Le vecchie app

Mondialito, Wimbledino, Medusino, Formulito, Championsito e L'ITALIANO non sono in questo repository. Stanno nella cartella OneDrive `14-Pronò!` e migrano dentro Pronò! secondo il [piano](./docs/PIANO_MIGRAZIONE_TOTALE.md).
