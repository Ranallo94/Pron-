import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATALOGO, ETICHETTA_FORMATO } from '../domain/catalogo';
import { elencoCompetizioni, type Competizione } from '../archivio/dati';
import { firebaseConfigurato } from '../firebase';

export function Esplora() {
  const [comp, setComp] = useState<Competizione[]>([]);
  const [caricata, setCaricata] = useState(!firebaseConfigurato);

  useEffect(() => {
    if (!firebaseConfigurato) return;
    elencoCompetizioni().then(setComp).catch(() => setComp([])).finally(() => setCaricata(true));
  }, []);

  const archivi = comp.filter(c => c.archivio);
  const attive = comp.filter(c => !c.archivio);

  return (
    <section>
      <h1>Esplora</h1>
      <p className="muto">Scegli una competizione e gioca con i tuoi amici.</p>

      {attive.length > 0 && (
        <>
          <h2>In corso</h2>
          <ul className="lista">
            {attive.map(c => (
              <li key={c.id}><Link to={`/c/${c.id}`} className="scheda blocco"><strong>{c.nome}</strong><span className="muto">{c.descrizione}</span></Link></li>
            ))}
          </ul>
        </>
      )}

      {archivi.length > 0 && (
        <>
          <h2>Archivio</h2>
          <p className="muto piccolo">Le competizioni già concluse, con classifiche, risultati e pronostici.</p>
          <ul className="lista">
            {archivi.map(c => (
              <li key={c.id}>
                <Link to={`/c/${c.id}`} className="scheda blocco">
                  <div className="riga"><strong>{c.nome}</strong><span className="etichetta">Concluso</span></div>
                  <span className="muto">{c.descrizione} · {c.numeri?.partecipanti ?? '?'} partecipanti</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {caricata && comp.length === 0 && firebaseConfigurato && <p className="muto">Nessuna competizione disponibile al momento.</p>}

      <h2>In arrivo</h2>
      <ul className="lista">
        {CATALOGO.map(c => (
          <li key={c.id} className="scheda">
            <div className="riga">
              <strong>{c.nome}</strong>
              <span className="etichetta">{ETICHETTA_FORMATO[c.formato]}</span>
            </div>
            <span className="muto">{c.sport}</span>
            <p>{c.descrizione}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
