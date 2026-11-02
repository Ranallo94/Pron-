import { formulito, championsito, litalianoSerieA, medusino } from '@prono/engine';

/**
 * Catalogo iniziale delle competizioni (dati di partenza, non ancora su Firestore).
 * Ogni voce collega il descrittore del motore a come la competizione si presenta in app.
 * Le competizioni "vere" le crea l'admin e vivono su Firestore (vedi docs/schema-dati.md).
 */
export type Formato = 'ordinamento' | 'campionato-breve' | 'tabellone';
export type Categoria = 'sport' | 'intrattenimento';

export interface CompetizioneCatalogo {
  id: string;
  nome: string;
  categoria: Categoria;
  sport: string;
  formato: Formato;
  descrizione: string;
  /** Descrittore del motore: contiene regole, punteggi e spareggi. */
  descrittore: unknown;
}

export const CATALOGO: CompetizioneCatalogo[] = [
  {
    id: 'f1',
    nome: 'Gran Premio di Formula 1',
    categoria: 'sport',
    sport: 'Formula 1',
    formato: 'ordinamento',
    descrizione: 'Pronostica la griglia delle qualifiche, l\'ordine di arrivo e i bonus del weekend.',
    descrittore: formulito,
  },
  {
    id: 'campionato-breve',
    nome: 'Campionato a giornate',
    categoria: 'sport',
    sport: 'Calcio',
    formato: 'campionato-breve',
    descrizione: 'Schedina per ogni giornata, classifica prevista a fasce, vincitore di giornata e speciali.',
    descrittore: litalianoSerieA,
  },
  {
    id: 'champions',
    nome: 'Fase a campionato (36 squadre)',
    categoria: 'sport',
    sport: 'Calcio',
    formato: 'campionato-breve',
    descrizione: 'Segno ed esatto su ogni partita, classifica unica derivata e fasce di piazzamento.',
    descrittore: championsito,
  },
  {
    id: 'tennis',
    nome: 'Torneo di tennis (tabellone da 128)',
    categoria: 'sport',
    sport: 'Tennis',
    formato: 'tabellone',
    descrizione: 'Indica chi passa ogni turno e il numero di set: conta chi avanza, non l\'avversario.',
    descrittore: medusino,
  },
];

export const ETICHETTA_FORMATO: Record<Formato, string> = {
  ordinamento: 'Ordinamento',
  'campionato-breve': 'Campionato',
  tabellone: 'Tabellone',
};
