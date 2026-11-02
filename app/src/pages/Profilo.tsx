import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { elencoCompetizioni, leggiClassifica, mioAbbinamento, type Competizione, type VoceClassifica } from '../archivio/dati';

interface Partecipazione {
  comp: Competizione;
  voce: VoceClassifica;
  partecipanti: number;
}

/** Percentuale di segni dei gironi indovinati, se la competizione li ha (Mondialito). */
function percentualeSegni(v: VoceClassifica): { corretti: number; totale: number } | null {
  const g = v.dettaglio.gironi_segno;
  return g && typeof g.corretti === 'number' && typeof g.totale === 'number' ? { corretti: g.corretti, totale: g.totale } : null;
}

const medaglia = (pos: number) => (pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '');

export function Profilo() {
  const { utente, profilo } = useAuth();
  const [parte, setParte] = useState<Partecipazione[] | null>(null);
  const [competizioni, setCompetizioni] = useState<Competizione[]>([]);

  useEffect(() => {
    if (!utente) return;
    let vivo = true;
    (async () => {
      const comps = (await elencoCompetizioni()).filter(c => c.archivio);
      if (!vivo) return;
      setCompetizioni(comps);
      const out: Partecipazione[] = [];
      for (const c of comps) {
        const sid = await mioAbbinamento(c.id, utente.uid);
        if (!sid) continue;
        const voci = await leggiClassifica(c.id);
        const voce = voci.find(v => v.sid === sid);
        if (voce) out.push({ comp: c, voce, partecipanti: voci.length });
      }
      if (vivo) setParte(out);
    })().catch(() => { if (vivo) setParte([]); });
    return () => { vivo = false; };
  }, [utente]);

  const podi = parte?.filter(p => p.voce.posizione <= 3).length ?? 0;
  const migliore = parte?.length ? Math.min(...parte.map(p => p.voce.posizione)) : null;
  // Percentile: 100 = primo, 0 = ultimo. La media su più competizioni dice quanto si sta sopra la metà classifica.
  const percentile = parte?.length
    ? Math.round(parte.reduce((s, p) => s + (p.partecipanti > 1 ? (1 - (p.voce.posizione - 1) / (p.partecipanti - 1)) * 100 : 100), 0) / parte.length)
    : null;
  const segni = parte?.map(p => percentualeSegni(p.voce)).filter((x): x is { corretti: number; totale: number } => x !== null) ?? [];
  const segniTot = segni.reduce((a, s) => ({ corretti: a.corretti + s.corretti, totale: a.totale + s.totale }), { corretti: 0, totale: 0 });

  return (
    <section>
      <h1>Profilo</h1>
      {profilo && <p className="muto">{profilo.nickname}</p>}

      {parte === null && <p className="muto">Caricamento delle statistiche…</p>}

      {parte && parte.length === 0 && (
        <div className="scheda vuota">
          <strong>Nessuna competizione collegata</strong>
          <span className="muto">
            Hai giocato a Mondialito, Wimbledino o Medusino? Apri la competizione da <Link to="/esplora">Esplora</Link> e tocca
            "Sono io" accanto al tuo nickname: qui compariranno le tue statistiche.
          </span>
          {competizioni.length > 0 && <span className="muto piccolo">Archivi disponibili: {competizioni.map(c => c.nome).join(', ')}.</span>}
        </div>
      )}

      {parte && parte.length > 0 && (
        <>
          <div className="tessere">
            <div className="tessera"><span className="numero">{parte.length}</span><span className="muto piccolo">competizioni</span></div>
            <div className="tessera"><span className="numero">{podi}</span><span className="muto piccolo">podi</span></div>
            <div className="tessera"><span className="numero">{migliore}º</span><span className="muto piccolo">miglior piazzamento</span></div>
            <div className="tessera"><span className="numero">{percentile}%</span><span className="muto piccolo">posizione media¹</span></div>
          </div>
          <p className="muto piccolo">¹ 100% = primo in classifica, 50% = a metà, 0% = ultimo; media tra le competizioni.</p>

          {segniTot.totale > 0 && (
            <div className="scheda">
              <strong>🎯 Indovinamento</strong>
              <span>Segni 1/X/2 dei gironi: <strong>{Math.round(segniTot.corretti / segniTot.totale * 100)}%</strong>{' '}
                <span className="muto">({segniTot.corretti} su {segniTot.totale})</span></span>
            </div>
          )}

          <h2>Le mie competizioni</h2>
          <ul className="lista">
            {parte.map(p => (
              <li key={p.comp.id}>
                <Link to={`/c/${p.comp.id}`} className="scheda blocco">
                  <div className="riga">
                    <strong>{medaglia(p.voce.posizione)} {p.comp.nome}</strong>
                    <span className="etichetta">{p.voce.posizione}º su {p.partecipanti}</span>
                  </div>
                  <span className="muto">{p.voce.totale} punti</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="scheda">
        <strong>👥 Le mie leghe</strong>
        <span className="muto">La lega pubblica e le leghe private a cui partecipi, con la tua posizione. In arrivo.</span>
      </div>
    </section>
  );
}
