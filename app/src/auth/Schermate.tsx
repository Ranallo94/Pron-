import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import {
  accedi, accediConGoogle, creaProfilo, esci, messaggioErrore, MSG_NICKNAME, nicknameLibero,
  recuperaPassword, registrati, REGEX_NICKNAME, reinviaVerifica,
} from './servizio';

/** Esegue un'azione asincrona mostrando "in corso" ed eventuale errore in italiano. */
function useAzione() {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState('');
  const [info, setInfo] = useState('');
  const esegui = async (fn: () => Promise<string | void>) => {
    setOccupato(true); setErrore(''); setInfo('');
    try { const m = await fn(); if (m) setInfo(m); }
    catch (e) { setErrore(messaggioErrore(e)); }
    finally { setOccupato(false); }
  };
  return { occupato, errore, info, esegui, setErrore };
}

export function Accesso() {
  const [modo, setModo] = useState<'accedi' | 'registrati'>('accedi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [maggiorenne, setMaggiorenne] = useState(false);
  const { occupato, errore, info, esegui, setErrore } = useAzione();
  const nuovo = modo === 'registrati';

  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (nuovo && !maggiorenne) { setErrore('Per registrarti devi dichiarare di avere almeno 14 anni.'); return; }
    if (nuovo && password.length < 8) { setErrore('La password deve avere almeno 8 caratteri.'); return; }
    void esegui(() => (nuovo ? registrati(email, password) : accedi(email, password)));
  };

  const dimenticata = () => {
    if (!email.trim()) { setErrore('Scrivi prima la tua email, poi tocca "Password dimenticata".'); return; }
    void esegui(async () => {
      await recuperaPassword(email);
      return 'Se esiste un account con questa email, ti abbiamo scritto per scegliere una nuova password.';
    });
  };

  return (
    <section className="accesso">
      <h1>{nuovo ? 'Crea il tuo account' : 'Entra in Pronò!'}</h1>
      <p className="muto">Pronostici tra amici. Gratis, senza soldi e senza pubblicità.</p>

      <button type="button" className="bottone secondario" disabled={occupato}
        onClick={() => void esegui(accediConGoogle)}>
        Continua con Google
      </button>
      <p className="separatore"><span>oppure con l'email</span></p>

      <form onSubmit={invia} className="modulo">
        <label>Email
          <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" autoComplete={nuovo ? 'new-password' : 'current-password'} required
            minLength={nuovo ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {nuovo && (
          <label className="casella">
            <input type="checkbox" checked={maggiorenne} onChange={e => setMaggiorenne(e.target.checked)} />
            <span>Dichiaro di avere almeno 14 anni e ho letto l'<Link to="/privacy">informativa sulla privacy</Link>.</span>
          </label>
        )}
        {errore && <p className="errore" role="alert">{errore}</p>}
        {info && <p className="ok" role="status">{info}</p>}
        <button type="submit" className="bottone" disabled={occupato}>{nuovo ? 'Registrati' : 'Accedi'}</button>
      </form>

      <p className="muto piccolo">
        {nuovo ? 'Hai già un account? ' : 'Non hai un account? '}
        <button type="button" className="link" onClick={() => { setModo(nuovo ? 'accedi' : 'registrati'); setErrore(''); }}>
          {nuovo ? 'Accedi' : 'Registrati'}
        </button>
        {!nuovo && <> · <button type="button" className="link" onClick={dimenticata}>Password dimenticata</button></>}
      </p>
      <p className="muto piccolo"><Link to="/privacy">Privacy</Link></p>
    </section>
  );
}

export function VerificaEmail() {
  const { utente, aggiorna } = useAuth();
  const { occupato, errore, info, esegui } = useAzione();

  // Controlla da solo ogni 5 secondi: chi clicca il link in un'altra scheda torna e trova l'app già sbloccata.
  useEffect(() => {
    const t = setInterval(() => { void aggiorna(); }, 5000);
    return () => clearInterval(t);
  }, [aggiorna]);

  return (
    <section className="accesso">
      <h1>Conferma la tua email</h1>
      <p>Ti abbiamo scritto a <strong>{utente?.email}</strong>. Apri il messaggio e tocca il link per confermare.</p>
      <p className="muto piccolo">Non lo trovi? Guarda anche nella posta indesiderata.</p>
      {errore && <p className="errore" role="alert">{errore}</p>}
      {info && <p className="ok" role="status">{info}</p>}
      <div className="azioni">
        <button className="bottone" disabled={occupato} onClick={() => void esegui(aggiorna)}>Ho confermato</button>
        <button className="bottone secondario" disabled={occupato}
          onClick={() => void esegui(async () => { if (utente) await reinviaVerifica(utente); return 'Email inviata di nuovo.'; })}>
          Reinvia l'email
        </button>
      </div>
      <p className="muto piccolo"><button className="link" onClick={() => void esci()}>Esci</button></p>
    </section>
  );
}

export function ScegliNickname() {
  const { utente, aggiorna } = useAuth();
  const [nickname, setNickname] = useState('');
  const { occupato, errore, esegui, setErrore } = useAzione();

  const invia = (e: FormEvent) => {
    e.preventDefault();
    const n = nickname.trim();
    if (!REGEX_NICKNAME.test(n)) { setErrore(MSG_NICKNAME); return; }
    void esegui(async () => {
      if (!utente) return;
      if (!(await nicknameLibero(n))) { setErrore('Questo nickname è già preso: scegline un altro.'); return; }
      await creaProfilo(utente.uid, n);
      await aggiorna();
    });
  };

  return (
    <section className="accesso">
      <h1>Come ti chiami in gioco?</h1>
      <p className="muto">È il nome che vedranno gli altri nelle classifiche. Lo potrai cambiare più avanti.</p>
      <form onSubmit={invia} className="modulo">
        <label>Nickname
          <input value={nickname} maxLength={20} autoComplete="nickname" required onChange={e => setNickname(e.target.value)} />
        </label>
        {errore && <p className="errore" role="alert">{errore}</p>}
        <button type="submit" className="bottone" disabled={occupato}>Continua</button>
      </form>
      <p className="muto piccolo"><button className="link" onClick={() => void esci()}>Esci</button></p>
    </section>
  );
}
