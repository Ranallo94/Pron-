import { NavLink, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Esplora } from './pages/Esplora';
import { Profilo } from './pages/Profilo';
import { Impostazioni } from './pages/Impostazioni';
import { firebaseConfigurato } from './firebase';

// Le quattro sezioni della piattaforma (CLAUDE.md → "Struttura app").
const SEZIONI = [
  { to: '/', etichetta: 'Home', icona: '🏠', fine: true },
  { to: '/esplora', etichetta: 'Esplora', icona: '🧭' },
  { to: '/profilo', etichetta: 'Profilo', icona: '🏅' },
  { to: '/impostazioni', etichetta: 'Impostazioni', icona: '⚙️' },
] as const;

export function App() {
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
          <Route path="/" element={<Home />} />
          <Route path="/esplora" element={<Esplora />} />
          <Route path="/profilo" element={<Profilo />} />
          <Route path="/impostazioni" element={<Impostazioni />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <nav className="tabbar" aria-label="Sezioni">
        {SEZIONI.map(s => (
          <NavLink key={s.to} to={s.to} end={'fine' in s} className={({ isActive }) => 'tab' + (isActive ? ' attiva' : '')}>
            <span className="tab-icona" aria-hidden="true">{s.icona}</span>
            <span>{s.etichetta}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
