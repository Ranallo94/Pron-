/**
 * Copia i documenti del repository in una cartella OneDrive, per leggerli
 * anche dal telefono. Il repository resta la versione di riferimento: la copia
 * su OneDrive è di sola lettura (si sovrascrive a ogni esecuzione).
 *
 *   npm run onedrive            copia
 *   npm run onedrive -- --prova mostra cosa copierebbe, senza scrivere
 *
 * La cartella di destinazione NON è scritta qui: si legge da PRONO_ONEDRIVE_DIR
 * (variabile d'ambiente, oppure riga in .env.local), così cambiando computer
 * basta aggiornare quella riga.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prova = process.argv.includes('--prova');

function leggiEnvLocale() {
  const f = join(radice, '.env.local');
  if (!existsSync(f)) return {};
  const out = {};
  for (const riga of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !riga.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

const destinazione = process.env.PRONO_ONEDRIVE_DIR || leggiEnvLocale().PRONO_ONEDRIVE_DIR;
if (!destinazione) {
  console.error('Manca PRONO_ONEDRIVE_DIR: copia .env.example in .env.local e imposta la cartella OneDrive.');
  process.exit(1);
}

// cosa copiare: documenti di testo e leggimi, non il codice
const daCopiare = [];
for (const f of ['README.md', 'CLAUDE.md']) if (existsSync(join(radice, f))) daCopiare.push(f);
for (const dir of ['docs', join('engine')]) {
  const base = join(radice, dir);
  if (!existsSync(base)) continue;
  for (const nome of readdirSync(base)) {
    const p = join(base, nome);
    if (statSync(p).isFile() && /\.(md|pdf|png|jpg|jpeg|xlsx)$/i.test(nome)) daCopiare.push(relative(radice, p));
  }
}

console.log(`${prova ? '[PROVA] ' : ''}Destinazione: ${destinazione}`);
for (const rel of daCopiare) {
  const da = join(radice, rel);
  const a = join(destinazione, rel);
  console.log(`  ${prova ? 'copierei' : 'copio'}  ${rel}`);
  if (!prova) {
    mkdirSync(dirname(a), { recursive: true });
    copyFileSync(da, a);
  }
}
console.log(`${daCopiare.length} file${prova ? ' (nessuno scritto)' : ' copiati'}.`);
