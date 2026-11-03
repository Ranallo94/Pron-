/**
 * Tema grafico di una competizione: ripristina i colori originali della vecchia app (verde/oro per Mondialito
 * e Wimbledino, blu notte/giallo palla per Medusino). Il tema sta nel documento della competizione (`tema`);
 * se manca si usa quello predefinito per id, così le competizioni già pubblicate funzionano subito.
 */
export interface Tema {
  sfondo: string;
  superficie: string;
  superficie2?: string;
  bordo: string;
  accento: string;
  /** Colore del testo scritto SOPRA l'accento (pulsanti, scheda attiva) */
  suAccento: string;
  secondario?: string;
  testo: string;
  muto: string;
}

const VERDE_ORO: Tema = {
  sfondo: '#0a1f10', superficie: '#132a18', superficie2: '#1a3520', bordo: '#2a4a30',
  accento: '#f0b429', suAccento: '#0d1b12', secondario: '#1a6b35', testo: '#f0f4f1', muto: '#8aab8f',
};
// Wimbledon: viola Pantone 268 C e lime "pallina da tennis" (design system di Wimbledino), in versione scura
const VIOLA_LIME: Tema = {
  sfondo: '#1b0f2e', superficie: '#28173f', superficie2: '#34204f', bordo: '#4a3270',
  accento: '#c2e03a', suAccento: '#1c2406', secondario: '#00703c', testo: '#f7f4ea', muto: '#b4a6cf',
};
const BLU_GIALLO: Tema = {
  sfondo: '#071a2f', superficie: '#0e2740', superficie2: '#143352', bordo: '#23486d',
  accento: '#f2e63d', suAccento: '#06182b', secondario: '#1d6fb8', testo: '#eef4fa', muto: '#8fa9c4',
};

export const TEMI_PREDEFINITI: Record<string, Tema> = {
  'mondialito-2026': VERDE_ORO,
  'wimbledino-2026': VIOLA_LIME,  // la vecchia app andò online verde e oro; il viola/lime fu progettato e mai usato
  'medusino-2026': BLU_GIALLO,
};

const VARIABILI: [string, keyof Tema][] = [
  ['--blu', 'sfondo'], ['--blu-superficie', 'superficie'], ['--blu-bordo', 'bordo'], ['--arancio', 'accento'],
  ['--su-accento', 'suAccento'], ['--testo', 'testo'], ['--muto', 'muto'],
];

/** Un tema valido ha almeno i colori di base; altrimenti si ignora. */
function valido(t: unknown): t is Tema {
  const o = t as Partial<Tema> | null;
  return !!o && typeof o.sfondo === 'string' && typeof o.accento === 'string' && typeof o.superficie === 'string';
}

/** Applica il tema a tutta l'app; ritorna la funzione che ripristina l'aspetto Arena. */
export function applicaTema(id: string, daDocumento?: unknown): () => void {
  const tema = valido(daDocumento) ? daDocumento : TEMI_PREDEFINITI[id];
  if (!tema) return () => {};
  const radice = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const metaPrima = meta?.getAttribute('content') ?? null;
  for (const [nome, chiave] of VARIABILI) {
    const v = tema[chiave];
    if (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) radice.style.setProperty(nome, v);
  }
  if (tema.secondario && /^#[0-9a-fA-F]{3,8}$/.test(tema.secondario)) radice.style.setProperty('--secondario', tema.secondario);
  meta?.setAttribute('content', tema.sfondo);
  return () => {
    for (const [nome] of VARIABILI) radice.style.removeProperty(nome);
    radice.style.removeProperty('--secondario');
    if (metaPrima !== null) meta?.setAttribute('content', metaPrima);
  };
}
