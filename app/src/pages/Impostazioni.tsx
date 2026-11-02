import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { cambiaNickname, esci, giorniAlCambio, messaggioErrore, MSG_NICKNAME, nicknameLibero, REGEX_NICKNAME } from '../auth/servizio';

function CambiaNickname() {
  const { utente, profilo, aggiorna } = useAuth();
  const [nuovo, setNuovo] = useState('');
  const [errore, setErrore] = useState('');
  const [ok, setOk] = useState('');
  const [occupato, setOccupato] = useState(false);
  if (!utente || !profilo) return null;
  const attesa = giorniAlCambio(profilo);

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    setErrore(''); setOk('');
    const n = nuovo.trim();
    if (!REGEX_NICKNAME.test(n)) { setErrore(MSG_NICKNAME); return; }
    setOccupato(true);
    try {
      if (n.toLowerCase() !== profilo.nicknameLower && !(await nicknameLibero(n))) {
        setErrore('Questo nickname è già preso: scegline un altro.');
        return;
      }
      await cambiaNickname(utente.uid, profilo.nicknameLower, n);
      await aggiorna();
      setNuovo('');
      setOk('Nickname aggiornato.');
    } catch (err) { setErrore(messaggioErrore(err)); }
    finally { setOccupato(false); }
  };

  return (
    <div className="scheda">
      <strong>Nickname: {profilo.nickname}</strong>
      {attesa > 0 ? (
        <span className="muto">Potrai cambiarlo di nuovo tra {attesa} {attesa === 1 ? 'giorno' : 'giorni'}.</span>
      ) : (
        <form onSubmit={e => void invia(e)} className="modulo">
          <label>Nuovo nickname
            <input value={nuovo} maxLength={20} onChange={e => setNuovo(e.target.value)} />
          </label>
          <span className="muto piccolo">Si può cambiare una volta ogni 7 giorni.</span>
          {errore && <p className="errore" role="alert">{errore}</p>}
          {ok && <p className="ok" role="status">{ok}</p>}
          <button type="submit" className="bottone" disabled={occupato || !nuovo.trim()}>Cambia nickname</button>
        </form>
      )}
    </div>
  );
}

export function Impostazioni() {
  const { stato, utente } = useAuth();
  return (
    <section>
      <h1>Impostazioni</h1>
      {stato === 'pronto' && utente && (
        <>
          <div className="scheda">
            <strong>Account</strong>
            <span className="muto">{utente.email}</span>
            <div className="azioni">
              <button className="bottone secondario" onClick={() => void esci()}>Esci</button>
            </div>
          </div>
          <CambiaNickname />
          <div className="scheda">
            <strong>Eliminare l'account</strong>
            <span className="muto">
              La cancellazione dall'app arriva a breve. Nel frattempo puoi chiederla scrivendo al contatto indicato
              nella <Link to="/privacy">privacy</Link>.
            </span>
          </div>
        </>
      )}
      <ul className="lista">
        <li className="scheda"><strong>Sport e temi di interesse</strong><span className="muto">Decide cosa vedi in Esplora e in Home.</span></li>
        <li className="scheda"><strong>Notifiche</strong><span className="muto">Promemoria prima della scadenza di una competizione.</span></li>
        <li className="scheda"><strong>Privacy dei pronostici</strong><span className="muto">Chi può vedere la tua schedina prima della scadenza.</span></li>
      </ul>
      <p className="muto piccolo"><Link to="/privacy">Informativa sulla privacy</Link></p>
    </section>
  );
}
