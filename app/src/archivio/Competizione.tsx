import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { messaggioErrore } from '../auth/servizio';
import {
  abbinati, leggiAbbinamenti, leggiClassifica, leggiCompetizione, leggiRisultati, leggiScheda, mioAbbinamento,
  sonoAdmin, togliAbbinamento,
  type Competizione as Comp, type Esito, type PartitaKo, type Risultati, type Scheda, type VoceClassifica,
} from './dati';

type Tab = 'classifica' | 'risultati' | 'pronostici' | 'regole';
const TABS: { id: Tab; nome: string }[] = [
  { id: 'classifica', nome: 'Classifica' },
  { id: 'risultati', nome: 'Risultati' },
  { id: 'pronostici', nome: 'Pronostici' },
  { id: 'regole', nome: 'Regole' },
];

const TURNI: { chiave: string; nome: string }[] = [
  { chiave: 'sedicesimi', nome: 'Sedicesimi' },
  { chiave: 'ottavi', nome: 'Ottavi' },
  { chiave: 'quarti', nome: 'Quarti' },
  { chiave: 'semifinali', nome: 'Semifinali' },
  { chiave: 'finale', nome: 'Finale' },
];

/** Segno 1/X/2 di un punteggio. */
const segno = (e?: Esito) =>
  e && typeof e.gol_casa === 'number' && typeof e.gol_trasferta === 'number'
    ? (e.gol_casa > e.gol_trasferta ? '1' : e.gol_casa < e.gol_trasferta ? '2' : 'X')
    : null;

function useNomiSquadre(c: Comp) {
  return useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of c.descrittore.squadre) m[s.id] = `${s.flag ?? ''} ${s.nome}`.trim();
    return (id?: string | null) => (id ? m[id] ?? id : '—');
  }, [c]);
}

export function PaginaCompetizione() {
  const { id = '' } = useParams();
  const { utente } = useAuth();
  const [comp, setComp] = useState<Comp | null | undefined>(undefined);
  const [classifica, setClassifica] = useState<VoceClassifica[]>([]);
  const [risultati, setRisultati] = useState<Risultati | null>(null);
  const [abbinamenti, setAbbinamenti] = useState<Record<string, string>>({});
  const [mio, setMio] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('classifica');
  const [scelto, setScelto] = useState<string | null>(null);
  const [errore, setErrore] = useState('');

  const ricarica = async () => {
    if (!utente) return;
    try {
      const [a, m] = await Promise.all([leggiAbbinamenti(id), mioAbbinamento(id, utente.uid)]);
      setAbbinamenti(a); setMio(m);
    } catch (e) { setErrore(messaggioErrore(e)); }
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const c = await leggiCompetizione(id);
        if (!vivo) return;
        setComp(c);
        if (!c) return;
        const [cl, ri] = await Promise.all([leggiClassifica(id), leggiRisultati(id)]);
        if (!vivo) return;
        setClassifica(cl); setRisultati(ri);
        if (utente) { setAdmin(await sonoAdmin(id, utente.uid)); await ricarica(); }
      } catch (e) { if (vivo) { setComp(null); setErrore(messaggioErrore(e)); } }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, utente?.uid]);

  if (comp === undefined) return <p className="muto">Caricamento…</p>;
  if (!comp) return <section><h1>Competizione non trovata</h1><p className="muto">{errore}</p><Link to="/esplora">← Esplora</Link></section>;

  const apriScheda = (sid: string) => { setScelto(sid); setTab('pronostici'); };

  return (
    <section>
      <p className="muto piccolo"><Link to="/esplora">← Esplora</Link></p>
      <div className="riga">
        <h1>{comp.nome}</h1>
        <span className="etichetta">{comp.archivio ? 'Archivio · concluso' : comp.stato}</span>
      </div>
      <p className="muto">{comp.descrizione} · {comp.numeri?.partecipanti ?? classifica.length} partecipanti</p>

      <div className="tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={'tabs-voce' + (tab === t.id ? ' attiva' : '')}
            onClick={() => setTab(t.id)}>{t.nome}</button>
        ))}
      </div>
      {errore && <p className="errore" role="alert">{errore}</p>}

      {tab === 'classifica' && (
        <TabClassifica comp={comp} voci={classifica} abbinamenti={abbinamenti} mio={mio} admin={admin}
          uid={utente?.uid ?? ''} apri={apriScheda} ricarica={ricarica} setErrore={setErrore} />
      )}
      {tab === 'risultati' && risultati && <TabRisultati comp={comp} ris={risultati} />}
      {tab === 'pronostici' && risultati && (
        <TabPronostici comp={comp} ris={risultati} voci={classifica} mio={mio} scelto={scelto} setScelto={setScelto} />
      )}
      {tab === 'regole' && <TabRegole comp={comp} />}
    </section>
  );
}

// ── Classifica e abbinamento ("sono io") ─────────────────────────────────────
function TabClassifica(p: {
  comp: Comp; voci: VoceClassifica[]; abbinamenti: Record<string, string>; mio: string | null; admin: boolean;
  uid: string; apri: (sid: string) => void; ricarica: () => Promise<void>; setErrore: (m: string) => void;
}) {
  const [filtro, setFiltro] = useState('');
  const [occupato, setOccupato] = useState(false);
  const visibili = p.voci.filter(v => v.nickname.toLowerCase().includes(filtro.toLowerCase()));

  const esegui = async (fn: () => Promise<void>) => {
    setOccupato(true); p.setErrore('');
    try { await fn(); await p.ricarica(); } catch (e) { p.setErrore(messaggioErrore(e)); } finally { setOccupato(false); }
  };

  return (
    <>
      <p className="muto piccolo">
        {p.mio
          ? <>Sei abbinato a <strong>{p.voci.find(v => v.sid === p.mio)?.nickname}</strong>.</>
          : 'Eri tra i partecipanti? Cerca il tuo nickname e tocca "Sono io" per collegarlo al tuo account.'}
      </p>
      <input type="search" placeholder="Cerca un nickname" value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Cerca un nickname" />
      <ol className="classifica">
        {visibili.map(v => {
          const dellAccount = p.abbinamenti[v.sid];
          const mioRiga = v.sid === p.mio;
          return (
            <li key={v.sid} className={'voce' + (mioRiga ? ' mia' : '')}>
              <span className="pos">{v.posizione}</span>
              <button className="nome link-nudo" onClick={() => p.apri(v.sid)}>{v.nickname}{dellAccount && <span className="spunta" title="Già abbinato a un account"> ✓</span>}</button>
              <span className="punti">{v.totale}</span>
              {!p.mio && !dellAccount && (
                <button className="bottone secondario mini" disabled={occupato}
                  onClick={() => void esegui(() => abbinati(p.comp.id, p.uid, v.sid))}>Sono io</button>
              )}
              {mioRiga && (
                <button className="link piccolo" disabled={occupato}
                  onClick={() => void esegui(() => togliAbbinamento(p.comp.id, p.uid, v.sid))}>Non sono io</button>
              )}
              {p.admin && dellAccount && !mioRiga && (
                <button className="link piccolo" disabled={occupato}
                  onClick={() => void esegui(() => togliAbbinamento(p.comp.id, dellAccount, v.sid))}>Libera (admin)</button>
              )}
            </li>
          );
        })}
      </ol>
      {visibili.length === 0 && <p className="muto">Nessun nickname trovato.</p>}
    </>
  );
}

// ── Risultati ────────────────────────────────────────────────────────────────
function TabRisultati({ comp, ris }: { comp: Comp; ris: Risultati }) {
  const nome = useNomiSquadre(comp);
  const [sez, setSez] = useState<'gironi' | 'eliminatorie' | 'cannonieri'>('eliminatorie');
  const gironi = Object.keys(comp.descrittore.gironi).sort();

  return (
    <>
      <div className="tabs sotto">
        {([['eliminatorie', 'Eliminatorie'], ['gironi', 'Gironi'], ['cannonieri', 'Capocannoniere']] as const).map(([k, n]) => (
          <button key={k} className={'tabs-voce' + (sez === k ? ' attiva' : '')} onClick={() => setSez(k)}>{n}</button>
        ))}
      </div>

      {sez === 'eliminatorie' && [...TURNI].reverse().map(t => {
        const partite = Object.entries(ris.fase_eliminatoria?.[t.chiave] ?? {}).sort(([a], [b]) => a.localeCompare(b));
        if (!partite.length) return null;
        return (
          <div key={t.chiave} className="scheda">
            <strong>{t.nome}</strong>
            {partite.map(([pid, m]) => <RigaKo key={pid} m={m} nome={nome} />)}
          </div>
        );
      })}

      {sez === 'gironi' && gironi.map(g => (
        <div key={g} className="scheda">
          <strong>Girone {g}</strong>
          <span className="muto piccolo">Classifica finale: {(ris.posizioni_finali_gironi?.[g] ?? []).map(nome).join(' · ')}</span>
          {comp.descrittore.gironi[g].partite.map(pt => {
            const e = ris.gironi?.[pt.id];
            return (
              <div key={pt.id} className="partita">
                <span className="sq">{nome(pt.casa)}</span>
                <span className="esito">{e ? `${e.gol_casa} – ${e.gol_trasferta}` : '—'}</span>
                <span className="sq dx">{nome(pt.trasferta)}</span>
              </div>
            );
          })}
        </div>
      ))}

      {sez === 'cannonieri' && (
        <div className="scheda">
          <strong>Classifica cannonieri finale</strong>
          <span>🥇 {ris.capocannoniere_finale?.primo ?? '—'}</span>
          <span>🥈 {ris.capocannoniere_finale?.secondo ?? '—'}</span>
          <span>🥉 {ris.capocannoniere_finale?.terzo ?? '—'}</span>
        </div>
      )}
    </>
  );
}

function RigaKo({ m, nome }: { m: PartitaKo; nome: (id?: string | null) => string }) {
  const finale = m.modalita && m.modalita !== '90min' ? ` (${m.modalita === 'rigori' ? 'rigori' : 'suppl.'})` : '';
  return (
    <div className="partita">
      <span className={'sq' + (m.vincitore === m.casa ? ' vince' : '')}>{nome(m.casa)}</span>
      <span className="esito">{m.gol_casa} – {m.gol_trasferta}{finale}</span>
      <span className={'sq dx' + (m.vincitore === m.trasferta ? ' vince' : '')}>{nome(m.trasferta)}</span>
    </div>
  );
}

// ── Pronostici di un partecipante, confrontati con la realtà ─────────────────
function TabPronostici({ comp, ris, voci, mio, scelto, setScelto }: {
  comp: Comp; ris: Risultati; voci: VoceClassifica[]; mio: string | null; scelto: string | null; setScelto: (s: string) => void;
}) {
  const nome = useNomiSquadre(comp);
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

  // Squadre davvero arrivate a ogni turno (per segnare ✓/✗ sui pronostici di passaggio del turno)
  const arrivate = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const t of TURNI) {
      out[t.chiave] = new Set(Object.values(ris.fase_eliminatoria?.[t.chiave] ?? {}).map(m => m.vincitore).filter((x): x is string => !!x));
    }
    return out;
  }, [ris]);

  return (
    <>
      <select value={sid ?? ''} onChange={e => setScelto(e.target.value)} aria-label="Partecipante">
        {voci.map(v => <option key={v.sid} value={v.sid}>{v.posizione}. {v.nickname}{v.sid === mio ? ' (tu)' : ''}</option>)}
      </select>

      {voce && (
        <div className="scheda">
          <div className="riga"><strong>{voce.nickname}</strong><span className="etichetta">{voce.totale} punti · {voce.posizione}º</span></div>
          <div className="dettaglio">
            {Object.entries(voce.dettaglio).map(([k, d]) => (
              <span key={k} className="chip">{k.replaceAll('_', ' ')}: {d.punti ?? 0}</span>
            ))}
          </div>
        </div>
      )}

      {scheda === undefined && <p className="muto">Caricamento della scheda…</p>}
      {scheda === null && <p className="muto">Scheda non disponibile.</p>}
      {scheda && (
        <>
          <div className="scheda">
            <strong>Capocannoniere</strong>
            {(['primo', 'secondo', 'terzo'] as const).map(pos => {
              const prev = scheda.capocannoniere?.[pos]; const vero = ris.capocannoniere_finale?.[pos];
              const dentro = prev && Object.values(ris.capocannoniere_finale ?? {}).includes(prev);
              return (
                <span key={pos}>
                  {pos === 'primo' ? '🥇' : pos === 'secondo' ? '🥈' : '🥉'} {prev ?? '—'}{' '}
                  <span className={prev === vero ? 'ok' : dentro ? 'quasi' : 'no'}>{prev === vero ? '✓ posto esatto' : dentro ? '≈ in terna' : '✗'}</span>
                </span>
              );
            })}
          </div>

          <div className="scheda">
            <strong>Eliminatorie: chi passa il turno</strong>
            {[...TURNI].reverse().map(t => {
              const scelte = Object.entries(scheda.fase_eliminatoria?.[t.chiave] ?? {}).sort(([a], [b]) => a.localeCompare(b));
              if (!scelte.length) return null;
              return (
                <div key={t.chiave} className="turno">
                  <span className="muto piccolo">{t.nome}</span>
                  <div className="dettaglio">
                    {scelte.map(([pid, s]) => (
                      <span key={pid} className={'chip ' + (s.vincitore && arrivate[t.chiave]?.has(s.vincitore) ? 'ok' : 'no')}>
                        {nome(s.vincitore)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="scheda">
            <strong>Gironi: risultati pronosticati</strong>
            <span className="muto piccolo">Verde = segno giusto · ★ = risultato esatto</span>
            {Object.keys(comp.descrittore.gironi).sort().map(g => (
              <div key={g} className="turno">
                <span className="muto piccolo">Girone {g}</span>
                {comp.descrittore.gironi[g].partite.map(pt => {
                  const pr = scheda.gironi?.[pt.id]; const re = ris.gironi?.[pt.id];
                  const sgnOk = pr && re && (pr.segno ?? segno(pr)) === segno(re);
                  const esatto = pr && re && pr.gol_casa === re.gol_casa && pr.gol_trasferta === re.gol_trasferta;
                  return (
                    <div key={pt.id} className={'partita ' + (sgnOk ? 'ok' : 'no')}>
                      <span className="sq">{nome(pt.casa)}</span>
                      <span className="esito">{pr ? `${pr.gol_casa}–${pr.gol_trasferta}` : '—'}{esatto ? ' ★' : ''}
                        <span className="muto piccolo"> (reale {re ? `${re.gol_casa}–${re.gol_trasferta}` : '—'})</span></span>
                      <span className="sq dx">{nome(pt.trasferta)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── Regole ───────────────────────────────────────────────────────────────────
/** Appiattisce i punteggi annidati in righe "percorso → valore", saltando le note descrittive. */
function righeRegole(o: Record<string, unknown>, prefisso = ''): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === 'note' || k === 'applicazione') continue;
    const nome = (prefisso ? prefisso + ' › ' : '') + k.replaceAll('_', ' ');
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...righeRegole(v as Record<string, unknown>, nome));
    else out.push([nome, Array.isArray(v) ? v.join(' / ') : String(v)]);
  }
  return out;
}

function TabRegole({ comp }: { comp: Comp }) {
  const r = comp.descrittore.regolamento;
  return (
    <div className="scheda">
      <strong>Come si calcolavano i punti</strong>
      <ul className="testo-lista">{righeRegole(r?.punteggi ?? {}).map(([k, v]) => <li key={k}><span className="muto">{k}</span> — <strong>{v}</strong></li>)}</ul>
      <strong>Criteri di spareggio</strong>
      <ol className="testo-lista">{(r?.criteri_spareggio ?? []).map((c, i) => <li key={i}>{c.replace(/^\d+\.\s*/, '')}</li>)}</ol>
    </div>
  );
}
