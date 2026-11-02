import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseConfigurato } from '../firebase';
import { aggiornaVerifica, leggiProfilo, type Profilo } from './servizio';

/**
 * Stato di accesso dell'app:
 *  - caricamento: non sappiamo ancora chi è l'utente
 *  - ospite: nessuno ha fatto l'accesso
 *  - da_verificare: ha l'account ma non ha ancora confermato l'email
 *  - senza_profilo: email confermata, manca la scelta del nickname
 *  - pronto: può usare l'app
 */
export type Stato = 'caricamento' | 'ospite' | 'da_verificare' | 'senza_profilo' | 'pronto';

type Contesto = {
  stato: Stato;
  utente: User | null;
  profilo: Profilo | null;
  /** Rilegge verifica email e profilo (dopo aver cliccato il link, o dopo aver creato/cambiato il nickname). */
  aggiorna: () => Promise<void>;
};

const Ctx = createContext<Contesto>({ stato: 'ospite', utente: null, profilo: null, aggiorna: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Stato>(firebaseConfigurato ? 'caricamento' : 'ospite');
  const [utente, setUtente] = useState<User | null>(null);
  const [profilo, setProfilo] = useState<Profilo | null>(null);

  const calcola = useCallback(async (u: User | null) => {
    setUtente(u);
    if (!u) { setProfilo(null); setStato('ospite'); return; }
    if (!u.emailVerified) { setProfilo(null); setStato('da_verificare'); return; }
    try {
      const p = await leggiProfilo(u.uid);
      setProfilo(p);
      setStato(p ? 'pronto' : 'senza_profilo');
    } catch {
      // Lettura negata o rete assente: si riparte dalla scelta del nickname invece di restare bloccati.
      setProfilo(null);
      setStato('senza_profilo');
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigurato) return;
    return onAuthStateChanged(auth(), u => { void calcola(u); });
  }, [calcola]);

  const aggiorna = useCallback(async () => {
    const u = auth().currentUser;
    if (u) await aggiornaVerifica(u);
    await calcola(u);
  }, [calcola]);

  const valore = useMemo(() => ({ stato, utente, profilo, aggiorna }), [stato, utente, profilo, aggiorna]);
  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}
