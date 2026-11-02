import { NavLink, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Esplora } from './pages/Esplora';
import { Profilo } from './pages/Profilo';
import { Impostazioni } from './pages/Impostazioni';
import { Privacy } from './pages/Privacy';
import { firebaseConfigurato } from './firebase';
import { useAuth } from './auth/AuthProvider';
import { Accesso, ScegliNickname, VerificaEmail } from './auth/Schermate';

// Le quattro sezioni della piattaforma (CLAUDE.md → "Struttura app").
const SEZIONI = [
  { to: '/', etichetta: 'Home', icona: '🏠', fine: true },
  { to: '/esplora', etichetta: 'Esplora', icona: '🧭' },
  { to: '/profilo', etichetta: 'Profilo', icona: '🏅' },
  { to: '/impostazioni', etichetta: 'Impostazioni', icona: '⚙️' },
] as const;

function Corpo() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/esplora" element={<Esplora />} />
      <Route path="/profilo" element={<Profilo />} />
      <Route path="/impostazioni" element={<Impostazioni />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

/** Sceglie cosa mostrare in base allo stato di accesso; l'app vera compare solo a utente pronto. */
function Contenuto() {
  const { stato } = useAuth();
  if (!firebaseConfigurato) return <Corpo />;
  switch (stato) {
    case 'caricamento': return <p className="muto">Caricamento…</p>;
    case 'ospite': return <Accesso />;
    case 'da_verificare': return <VerificaEmail />;
    case 'senza_profilo': return <ScegliNickname />;
    case 'pronto': return <Corpo />;
  }
}

export function App() {
  const { stato } = useAuth();
  const conTabbar = !firebaseConfigurato || stato === 'pronto';
  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Pronò<span className="logo-punto">!</span></span>
        <span className="beta">Beta</span>
      </header>

      {!firebaseConfigurato && (
        <div className="avviso" role="status">
          Firebase non è ancora configurato: l'app gira in modalità locale, senza accesso né salvataggi.
        </div>
      )}

      <main className="app-main">
        <Routes>
          {/* L'informativa è pubblica: si legge anche prima di registrarsi */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Contenuto />} />
        </Routes>
      </main>

      {conTabbar && (
        <nav className="tabbar" aria-label="Sezioni">
          {SEZIONI.map(s => (
            <NavLink key={s.to} to={s.to} end={'fine' in s} className={({ isActive }) => 'tab' + (isActive ? ' attiva' : '')}>
              <span className="tab-icona" aria-hidden="true">{s.icona}</span>
              <span>{s.etichetta}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
