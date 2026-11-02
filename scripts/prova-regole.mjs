/**
 * Prova le regole di sicurezza di Firestore con l'emulatore, senza toccare il progetto vero.
 *
 *   npm run test:regole
 *
 * Serve Java (JDK 17 o superiore). Il percorso si legge da PRONO_JAVA_HOME (variabile d'ambiente
 * o riga in .env.local); se non c'è, si usa il `java` che c'è nel PATH. Nessun percorso è scritto qui.
 * L'emulatore usa un progetto fittizio ("demo-prono"): non si collega a Firebase e non serve il login.
 */
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

const javaHome = process.env.PRONO_JAVA_HOME || leggiEnvLocale().PRONO_JAVA_HOME;
const env = { ...process.env };
if (javaHome) {
  if (!existsSync(join(javaHome, 'bin'))) {
    console.error(`PRONO_JAVA_HOME non valido: ${javaHome}`);
    process.exit(1);
  }
  env.JAVA_HOME = javaHome;
  env.PATH = join(javaHome, 'bin') + delimiter + (env.PATH || env.Path || '');
}

// Su alcuni Windows (cartella temporanea con nome breve 8.3, tipo "ANDREA~1.RAN") Java non riesce ad aprire
// la connessione interna di loopback e l'emulatore si ferma con "Unable to establish loopback connection".
// Una cartella senza "~" per i socket interni lo risolve (verificato con Java 21).
if (process.platform === 'win32') {
  const socketTmp = join(homedir(), '.prono-tmp');
  mkdirSync(socketTmp, { recursive: true });
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS ? env.JAVA_TOOL_OPTIONS + ' ' : ''}-Djdk.net.unixdomain.tmpdir=${socketTmp}`;
}

const comando = 'npx';
const args = [
  '--yes', 'firebase-tools', 'emulators:exec', '--only', 'firestore', '--project', 'demo-prono',
  // tra virgolette: con shell:true gli argomenti si uniscono con spazi e il comando di test deve restare un blocco unico
  '"node --test firebase/test/*.test.js"',
];
const r = spawnSync(comando, args, { cwd: radice, env, stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
