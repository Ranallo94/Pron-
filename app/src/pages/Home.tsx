export function Home() {
  return (
    <section>
      <h1>In evidenza</h1>
      <p className="muto">
        Qui compariranno le competizioni con una scadenza vicina: pronostici da compilare, giornate da chiudere.
      </p>
      <div className="scheda vuota">
        <strong>Ancora nessuna competizione</strong>
        <span>Quando ti iscrivi a una competizione, la trovi qui con il conto alla rovescia.</span>
      </div>

      <h2>Notizie per te</h2>
      <p className="muto">Risultati, movimenti nelle leghe e nuovi badge.</p>
    </section>
  );
}
