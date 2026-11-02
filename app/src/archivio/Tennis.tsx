import { useEffect, useMemo, useState } from 'react';
import { leggiScheda, type Competizione as Comp, type Risultati, type Scheda, type VoceClassifica } from './dati';

/** Turni di un tabellone da 128, dal primo alla finale (i nomi vengono dal descrittore se presente). */
const TURNI_BASE = [
  { id: 'R128', nome: '1º turno' }, { id: 'R64', nome: '2º turno' }, { id: 'R32', nome: '3º turno' },
  { id: 'R16', nome: 'Ottavi' }, { id: 'QF', nome: 'Quarti' }, { id: 'SF', nome: 'Semifinali' }, { id: 'F', nome: 'Finale' },
];

function useTennis(comp: Comp) {
  const giocatori = comp.descrittore.giocatori ?? {};
  const turni = comp.descrittore.turni?.length ? comp.descrittore.turni : TURNI_BASE;
  const nome = (pid?: string | null) => {
    if (!pid) return '—';
    const g = giocatori[pid];
    return g ? `${g.nome}${g.seed ? ` (${g.seed})` : ''}` : pid;
  };
  return { turni, nome };
}

/** Tabellone reale: dalla finale al primo turno. */
export function TabTabellone({ comp, ris }: { comp: Comp; ris: Risultati }) {
  const { turni, nome } = useTennis(comp);
  const bonus = comp.descrittore.bonus ?? [];
  return (
    <>
      {[...turni].reverse().map(t => {
        const partite = Object.entries(ris.bracket?.[t.id] ?? {}).sort(([a], [b]) => a.localeCompare(b));
        if (!partite.length) return null;
        return (
          <details key={t.id} className="scheda" open={t.id === 'F' || t.id === 'SF' || t.id === 'QF'}>
            <summary><strong>{t.nome}</strong> <span className="muto piccolo">{partite.length} partite</span></summary>
            {partite.map(([mid, m]) => (
              <div key={mid} className="partita2">
                <span className="vince">{nome(m.vincitore)}</span>
                <span className="muto piccolo">{m.set ? `vince ${m.set}` : ''}</span>
              </div>
            ))}
          </details>
        );
      })}

      {bonus.length > 0 && (
        <div className="scheda">
          <strong>Statistiche del torneo</strong>
          {bonus.map(b => {
            const key = b.id.replace('most_', '');
            const classifica = ris.classifiche?.[key] ?? ris.classifiche?.[`${key}s`] ?? [];
            return (
              <div key={b.id} className="turno">
                <span className="muto piccolo">{b.label}</span>
                <span>🏅 <strong>{nome(ris.bonus?.[b.id])}</strong>{classifica[0] ? ` — ${classifica[0].v}` : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Pronostici di un partecipante confrontati con il tabellone reale. */
export function TabPronosticiTennis({ comp, ris, voci, mio, scelto, setScelto }: {
  comp: Comp; ris: Risultati; voci: VoceClassifica[]; mio: string | null; scelto: string | null; setScelto: (s: string) => void;
}) {
  const { turni, nome } = useTennis(comp);
  const sid = scelto ?? mio ?? voci[0]?.sid ?? null;
  const [scheda, setScheda] = useState<Scheda | null | undefined>(undefined);
  const voce = voci.find(v => v.sid === sid);

  useEffect(() => {
    if (!sid) return;
    let vivo = true;
    setScheda(undefined);
    leggiScheda(comp.id, sid).then(s => { if (vivo) setScheda(s); }).catch(() => { if (vivo) setScheda(null); });
    return () => { vivo = false; };
  }, [comp.id, sid]);

  // Per ogni turno: chi ha davvero vinto, e con quale punteggio in set
  const reali = useMemo(() => {
    const out: Record<string, Map<string, string | undefined>> = {};
    for (const t of turni) {
      out[t.id] = new Map(Object.values(ris.bracket?.[t.id] ?? {}).filter(m => m.vincitore).map(m => [m.vincitore as string, m.set]));
    }
    return out;
  }, [ris, turni]);

  return (
    <>
      <select value={sid ?? ''} onChange={e => setScelto(e.target.value)} aria-label="Partecipante">
        {voci.map(v => <option key={v.sid} value={v.sid}>{v.posizione}. {v.nickname}{v.sid === mio ? ' (tu)' : ''}</option>)}
      </select>

      {voce && (
        <div className="scheda">
          <div className="riga"><strong>{voce.nickname}</strong><span className="etichetta">{voce.totale} punti · {voce.posizione}º</span></div>
          <div className="dettaglio">
            <span className="chip">esiti: {voce.dettaglio.esiti?.punti ?? 0}</span>
            <span className="chip">set esatti: {voce.dettaglio.set?.punti ?? 0} ({voce.dettaglio.set?.corretti ?? 0})</span>
            <span className="chip">bonus: {voce.dettaglio.bonus?.punti ?? 0}</span>
          </div>
          {voce.perTurno && (
            <div className="dettaglio">
              {turni.map(t => (
                <span key={t.id} className="chip" title={t.nome}>{t.id}: {voce.perTurno?.[t.id]?.indovinati ?? 0}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {scheda === undefined && <p className="muto">Caricamento della scheda…</p>}
      {scheda === null && <p className="muto">Scheda non disponibile.</p>}
      {scheda && (
        <>
          <div className="scheda">
            <strong>Bonus statistici</strong>
            {(comp.descrittore.bonus ?? []).map(b => {
              const prev = scheda.bonus?.[b.id]; const vero = ris.bonus?.[b.id];
              return (
                <span key={b.id}>
                  {b.label}: {nome(prev)} <span className={!vero ? 'muto' : prev === vero ? 'ok' : 'no'}>{!vero ? '' : prev === vero ? '✓' : `✗ (era ${nome(vero)})`}</span>
                </span>
              );
            })}
          </div>

          <div className="scheda">
            <strong>Chi passa il turno</strong>
            <span className="muto piccolo">Verde = ha davvero superato il turno · ★ = anche il punteggio in set esatto</span>
            {[...turni].reverse().map(t => {
              const scelte = Object.entries(scheda.bracket?.[t.id] ?? {}).sort(([a], [b]) => a.localeCompare(b));
              if (!scelte.length) return null;
              const giusti = scelte.filter(([, s]) => s.vincitore && reali[t.id]?.has(s.vincitore)).length;
              return (
                <details key={t.id} className="turno" open={t.id === 'F' || t.id === 'SF' || t.id === 'QF'}>
                  <summary className="muto piccolo">{t.nome} — {giusti}/{scelte.length}</summary>
                  <div className="dettaglio">
                    {scelte.map(([mid, s]) => {
                      const ok = !!s.vincitore && !!reali[t.id]?.has(s.vincitore);
                      const esatto = ok && !!s.set && reali[t.id]?.get(s.vincitore as string) === s.set;
                      return <span key={mid} className={'chip ' + (ok ? 'ok' : 'no')}>{nome(s.vincitore)}{s.set ? ` ${s.set}` : ''}{esatto ? ' ★' : ''}</span>;
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
