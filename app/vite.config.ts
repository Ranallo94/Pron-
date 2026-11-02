import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// L'app è una PWA statica: nessun percorso assoluto, nessun segreto nel codice.
// La configurazione Firebase si legge da variabili VITE_FIREBASE_* (vedi .env.example).
export default defineConfig({
  // .env.local sta nella radice del repository (non dentro app/)
  envDir: '..',
  plugins: [react()],
  // niente mappe del codice sul sito pubblico (pesano e non servono agli utenti)
  build: { sourcemap: false },
});
