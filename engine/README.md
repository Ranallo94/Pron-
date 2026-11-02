# engine/ — motore di Pronò!

Calcolo puro in JavaScript (moduli ES), senza dipendenze e senza Firebase/Supabase: lo stesso codice gira nel browser, in una funzione server o in un test. Le regole sono **dati** (il "descrittore di torneo", vedi [../schema-dati.md](../docs/schema-dati.md) §2 e §5), non codice per sport.

## Come eseguire i test

```bash
npm test
```

Serve Node 22 o superiore (sul PC di Andrea c'è la 26). 56 test, circa 1 secondo.

## Moduli

| File | Cosa fa |
|---|---|
| `ranking.js` | Classifica di un girone o campionato: criteri dichiarativi (punti, differenza reti, gol fatti, scontri diretti, ordine manuale, `nome`) e, nuovi, gli **scontri diretti in posizione** (`h2h.punti`, `h2h.differenzaReti`: si applicano alle sole squadre ancora in parità, come in Serie A) |
| `speciali.js` | Vincitore di un premio speciale (cannoniere, assistman, squadra più cattiva) con catena di spareggi; parità o dato mancante non producono un vincitore inventato |
| `partite.js` | Risultato pronosticato da esatto o dal solo segno (convenzione 1-0 / 1-1 / 0-1) |
| `punteggi.js` | Punteggio delle partite, qualificazioni, posto in griglia e **`calcolaPunteggioTotale`**, che compone tutto dal descrittore |
| `ordinamenti.js` | Pronostici a ordinamento: posizione esatta, scarto 1, bonus primi N, fasce. Per F1, classifica d'arrivo, campionati a fasce e gare non sportive |
| `bonus.js` | Bonus a indovinello (identico o numerico) |
| `ko.js` | Tabellone a eliminazione: turni da dimensione, propagazione dagli esiti, override manuali, punteggio con dettaglio annidato (set) e giocatori annullati |
| `bracket.js` | Slot simbolici gironi → tabellone, ripescaggio delle terze (qualificazione) |
| `classifica.js` | Classifica dei **partecipanti**: totale, spareggio, pari merito; vincitore di giornata e turni vinti |
| `descrittori/` | Descrittori reali: Formulito (F1, con e senza Sprint), Championsito (36 squadre a fasce), Wimbledino e Medusino (tennis 128), **L'ITALIANO** (Serie A a 20 squadre, massimo 1233) |

## Test di parità con le app esistenti

`test/parita-app.test.js` confronta il motore con il codice dei satelliti su centinaia di pronostici casuali, con seme fisso (quindi ripetibile): Formulito (con e senza Sprint), Championsito e Medusino. Se passano, migrare un gruppo su Pronò! non cambia i suoi punteggi. Se la cartella di un satellite non esiste, il test relativo viene saltato.

Verifica di sensibilità: ho cambiato di proposito un valore in ciascun descrittore (25→24 per la vittoria in gara, fascia 3→4 a Championsito, semifinale 55→56 a Medusino) e i test hanno fallito, quindi non passano "a vuoto".

## Cosa non c'è ancora

- Tabelloni a doppia sfida andata/ritorno (Champions Fase 2).
- Adapter di sync dei risultati (ESPN e altre fonti).
- Propagazione turno per turno del bracket che parte dai gironi.
- Tipi TypeScript: i moduli sono JavaScript con commenti JSDoc. Node 26 esegue anche file `.ts` senza compilare, quindi la conversione è a basso costo quando parte lo scheletro dell'app.
