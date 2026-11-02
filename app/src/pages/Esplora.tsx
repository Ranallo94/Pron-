import { CATALOGO, ETICHETTA_FORMATO } from '../domain/catalogo';

export function Esplora() {
  return (
    <section>
      <h1>Esplora</h1>
      <p className="muto">Scegli una competizione e gioca con i tuoi amici.</p>

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
