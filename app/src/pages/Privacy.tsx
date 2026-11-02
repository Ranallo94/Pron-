import { Link } from 'react-router-dom';

/**
 * Informativa sulla privacy (bozza per la Beta). Va riletta da chi ne risponde legalmente prima di
 * invitare utenti veri: i punti tra parentesi quadre vanno completati. Non è consulenza legale.
 */
export function Privacy() {
  return (
    <section className="testo">
      <h1>Privacy</h1>
      <p className="muto">Versione Beta · aggiornata a novembre 2026</p>

      <h2>Chi tratta i tuoi dati</h2>
      <p>Pronò! è un gioco di pronostici tra amici, in fase di prova (Beta). Titolare del trattamento: Andrea Ranalli (persona fisica). Contatto per ogni richiesta sui tuoi dati: andrea.ranalli.94@gmail.com.</p>

      <h2>Quali dati raccogliamo</h2>
      <ul>
        <li><strong>Account:</strong> indirizzo email (o quello del tuo account Google, se accedi con Google) e password cifrata. La password non è mai leggibile da noi.</li>
        <li><strong>Profilo:</strong> il nickname che scegli, visibile agli altri iscritti.</li>
        <li><strong>Gioco:</strong> i tuoi pronostici, i punteggi e le tue iscrizioni a competizioni e leghe. Tu scegli se i tuoi pronostici sono visibili agli altri prima della scadenza; alla scadenza diventano visibili agli iscritti alla competizione.</li>
      </ul>
      <p>Non raccogliamo foto, posizione, contatti del telefono né dati di pagamento. In Pronò! non circola denaro.</p>

      <h2>A cosa servono</h2>
      <p>Solo a far funzionare il gioco: farti accedere, registrare i pronostici, calcolare le classifiche, mandarti i messaggi di servizio (conferma dell'email, password dimenticata). La base giuridica è l'esecuzione del servizio che chiedi usando l'app.</p>

      <h2>Niente tracciamento, niente pubblicità</h2>
      <p>Non usiamo Google Analytics né strumenti di tracciamento o pubblicità di terzi. Per questo non c'è un banner dei cookie: il sito usa solo lo spazio del tuo browser strettamente necessario a tenerti collegato. Le statistiche d'uso sono conteggi anonimi generati da noi.</p>

      <h2>Dove stanno i dati</h2>
      <p>Su Google Firebase (Firestore e Authentication). Il database è in Europa (Milano). Google agisce come nostro fornitore (responsabile del trattamento). Se accedi con Google, Google ci comunica email e nome del tuo account.</p>

      <h2>Per quanto tempo</h2>
      <p>Finché mantieni l'account. Quando lo elimini cancelliamo account, profilo e pronostici. I dati di classifica già calcolati possono restare in forma che non ti identifica.</p>

      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, correzione, cancellazione, limitazione e copia dei tuoi dati, e opporti al trattamento, scrivendo al contatto qui sopra. Puoi inoltre rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).</p>

      <h2>Età minima</h2>
      <p>Per registrarti devi avere almeno 14 anni.</p>

      <p className="muto piccolo"><Link to="/">← Torna all'app</Link></p>
    </section>
  );
}
