import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { elencoCompetizioni, type Competizione } from './archivio/dati';
import { firebaseConfigurato } from './firebase';

const SEZIONI = [
  { to: '/', etichetta: 'Home', icona: '🏠', fine: true },
  { to: '/esplora', etichetta: 'Esplora', icona: '🧭' },
  { to: '/profilo', etichetta: 'Profilo', icona: '🏅' },
  { to: '/impostazioni', etichetta: 'Impostazioni', icona: '⚙️' },
] as const;

/**
 * Menu laterale: si apre toccando il logo in alto a sinistra (che ruota).
 * Mostra le competizioni attive con link rapido, poi le sezioni dell'app.
 */
export function Menu({ aperto, chiudi }: { aperto: boolean; chiudi: () => void }) {
  const [comp, setComp] = useState<Competizione[] | null>(null);
  const { pathname } = useLocation();

  // Si carica l'elenco solo alla prima apertura
  useEffect(() => {
    if (!aperto || comp !== null || !firebaseConfigurato) return;
    elencoCompetizioni().then(setComp).catch(() => setComp([]));
  }, [aperto, comp]);

  // Si chiude cambiando pagina o premendo Esc; all'apertura il focus va sul pulsante di chiusura
  useEffect(() => { chiudi(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aperto, chiudi]);

  const attive = (comp ?? []).filter(c => !c.archivio && c.stato !== 'conclusa');
  const archivio = (comp ?? []).filter(c => c.archivio);

  return (
    <>
      <div className={'menu-velo' + (aperto ? ' aperto' : '')} onClick={chiudi} aria-hidden="true" />
      <aside id="menu-laterale" className={'menu' + (aperto ? ' aperto' : '')} aria-label="Menu" aria-hidden={!aperto}
        {...(aperto ? {} : { inert: true })}>
        <h2 className="menu-titolo">Competizioni attive</h2>
        {comp === null && <p className="muto piccolo">Caricamento…</p>}
        {comp !== null && attive.length === 0 && <p className="muto piccolo">Nessuna competizione attiva al momento.</p>}
        <ul className="menu-lista">
          {attive.map(c => (
            <li key={c.id}><Link to={`/c/${c.id}`} className="menu-voce">{c.nome}</Link></li>
          ))}
        </ul>

        {archivio.length > 0 && (
          <>
            <h2 className="menu-titolo">Archivio</h2>
            <ul className="menu-lista">
              {archivio.map(c => (
                <li key={c.id}><Link to={`/c/${c.id}`} className="menu-voce">{c.nome}</Link></li>
              ))}
            </ul>
          </>
        )}

        <h2 className="menu-titolo">Sezioni</h2>
        <ul className="menu-lista">
          {SEZIONI.map(s => (
            <li key={s.to}>
              <NavLink to={s.to} end={'fine' in s} className={({ isActive }) => 'menu-voce' + (isActive ? ' attiva' : '')}>
                <span aria-hidden="true">{s.icona}</span> {s.etichetta}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="menu-piede"><Link to="/privacy">Privacy</Link></p>
      </aside>
    </>
  );
}
