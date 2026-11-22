import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { IbtAnalysis, IbtProfileLap } from "../../types/ibt";
import { lapStr } from "./fmt";

type FileItem = { path: string; name: string; size: number; mtimeMs: number };

const fmtMB = (b: number) => `${(b / 1048576).toFixed(0)} MB`;
const fmtDate = (ms: number) => new Date(ms).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const sgn = (v: number | null | undefined, d = 2) => (v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`);

/** Serie como polilínea SVG. */
function path(vals: number[], w: number, h: number, min: number, max: number): string {
  const n = vals.length;
  if (n < 2 || max <= min) return "";
  let d = "";
  for (let i = 0; i < n; i += 2) {
    const x = (i / (n - 1)) * w;
    const y = h - ((vals[i] - min) / (max - min)) * h;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

const Chart: React.FC<{
  title: string; h?: number; min: number; max: number; unit?: string; zero?: boolean;
  series: { vals: number[]; cls: string }[]; marks: { x: number; label: string }[]; lengthM: number;
}> = ({ title, h = 110, min, max, unit, zero, series, marks, lengthM }) => {
  const W = 1000;
  const zy = h - ((0 - min) / (max - min)) * h;
  return (
    <div className="pb-an__chart">
      <span className="pb-lbl">{title}{unit ? ` (${unit})` : ""}</span>
      <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" role="img" aria-label={title}>
        {marks.map((m) => <line key={m.label} x1={(m.x / lengthM) * W} x2={(m.x / lengthM) * W} y1={0} y2={h} className="pb-an__mark" />)}
        {zero && <line x1={0} x2={W} y1={zy} y2={zy} className="pb-an__zero" />}
        {series.map((s, i) => <path key={i} d={path(s.vals, W, h, min, max)} className={`pb-an__line ${s.cls}`} fill="none" />)}
      </svg>
    </div>
  );
};

/** Pestaña Análisis: informe de vueltas desde los .ibt que iRacing guarda en Documentos\iRacing\telemetry. */
export const AnalysisView: React.FC = () => {
  const api = typeof window !== "undefined" ? window.ifuelOverlay : undefined;
  const available = !!api?.ibtList && !!api?.ibtAnalyze;
  const [dir, setDir] = useState<string>("");
  const [exists, setExists] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sel, setSel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rep, setRep] = useState<IbtAnalysis | null>(null);
  const [lapSel, setLapSel] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!api?.ibtList) return;
    const r = await api.ibtList();
    setDir(r.dir); setExists(r.exists); setFiles(r.files);
    setSel((cur) => cur || r.files[0]?.path || "");
  }, [api]);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = useCallback(async (p: string) => {
    if (!api?.ibtAnalyze || !p) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.ibtAnalyze(p);
      if (!r.ok) { setErr(r.error ?? "No se pudo analizar el archivo"); setRep(null); return; }
      const a = r.result as IbtAnalysis;
      setRep(a);
      setLapSel(a.profile?.laps.find((l) => l.lap !== a.reference?.lap)?.lap ?? null);
    } finally { setBusy(false); }
  }, [api]);

  const pickOther = async () => {
    const f = await api?.ibtPick?.();
    if (f) { setFiles((cur) => [{ path: f.path, name: f.name, size: 0, mtimeMs: Date.now() }, ...cur.filter((x) => x.path !== f.path)]); setSel(f.path); void run(f.path); }
  };

  const ref = rep?.profile?.laps.find((l) => l.lap === rep.reference?.lap) ?? null;
  const cur: IbtProfileLap | null = rep?.profile?.laps.find((l) => l.lap === lapSel) ?? null;
  const marks = useMemo(() => (rep?.corners ?? []).map((c) => ({ x: c.apexM, label: `T${c.id}` })), [rep]);

  if (!available) return <div className="pb-an"><div className="pb-an__note">El análisis de .ibt solo está disponible en la app de escritorio.</div></div>;

  return (
    <div className="pb-an">
      <div className="pb-an__bar">
        <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Archivo de telemetría">
          {files.length === 0 && <option value="">Sin archivos .ibt</option>}
          {files.map((f) => <option key={f.path} value={f.path}>{f.name}{f.size ? ` · ${fmtMB(f.size)}` : ""} · {fmtDate(f.mtimeMs)}</option>)}
        </select>
        <button type="button" disabled={!sel || busy} onClick={() => void run(sel)}>{busy ? "Analizando…" : "Analizar"}</button>
        <button type="button" onClick={() => void pickOther()}>Abrir otro .ibt…</button>
        <button type="button" onClick={() => void refresh()} title="Releer la carpeta">↻</button>
      </div>

      {(!exists || files.length === 0) && (
        <div className="pb-an__note pb-an__note--warn">
          No hay telemetría .ibt en <code>{dir || "Documentos\\iRacing\\telemetry"}</code>. iRacing solo la guarda si activas la grabación en pista:
          pulsa <b>Alt+L</b> (por defecto) para empezar y parar el registro, o pon <code>telemetryDiskFile=1</code> en <code>app.ini</code> para grabar siempre.
          Cada archivo ocupa unos 4 MB por minuto. iFuel no graba nada: solo lee esos archivos.
        </div>
      )}
      {err && <div className="pb-an__note pb-an__note--warn">{err}</div>}

      {rep && (
        <>
          <div className="pb-an__head">
            <b>{rep.meta.track}</b><span>{rep.meta.car}</span><span>{rep.meta.sessionType ?? ""}</span>
            {rep.summary && (
              <span className="pb-an__sum">
                Mejor <b className="pb-num">{lapStr(rep.summary.bestS)}</b> · media <b className="pb-num">{lapStr(rep.summary.meanS)}</b>
                {rep.summary.stdS != null && <> · σ <b className="pb-num">{rep.summary.stdS.toFixed(2)} s</b></>} · {rep.summary.comparableLaps} vueltas comparables
              </span>
            )}
          </div>
          {rep.error && <div className="pb-an__note pb-an__note--warn">{rep.error}. Necesitas al menos una vuelta completa sin pasar por boxes.</div>}
          {rep.summary && rep.summary.comparableLaps < 3 && !rep.error && (
            <div className="pb-an__note">Pocas vueltas limpias ({rep.summary.comparableLaps}): las comparaciones y la consistencia mejoran con 5 o más.</div>
          )}

          <div className="pb-an__grid">
            <div className="pb-an__col">
              <span className="pb-lbl">Vueltas</span>
              <table className="pb-an__tbl">
                <thead><tr><th>V</th><th>Tiempo</th><th>vs mejor</th><th></th></tr></thead>
                <tbody>
                  {rep.laps.map((l) => {
                    const isRef = rep.reference?.lap === l.n;
                    const d = l.timeS != null && rep.reference ? l.timeS - rep.reference.timeS : null;
                    const inProfile = rep.profile?.laps.some((p) => p.lap === l.n);
                    return (
                      <tr key={l.n} className={`${lapSel === l.n ? "is-now" : ""}${inProfile ? " pb-an__pick" : ""}`} onClick={() => inProfile && !isRef && setLapSel(l.n)}>
                        <td>{l.n}</td>
                        <td className="pb-num">{l.timeS != null ? lapStr(l.timeS) : "–"}</td>
                        <td>{isRef ? "mejor" : sgn(d)}</td>
                        <td className="pb-an__tag">{l.reason ?? (l.offTrackS > 0.2 ? `fuera ${l.offTrackS.toFixed(1)} s` : "")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {rep.topLosses && rep.topLosses.length > 0 && (
                <>
                  <span className="pb-lbl pb-an__h">Dónde pierdes más (media vs tu mejor)</span>
                  <div className="pb-an__loss">
                    {rep.topLosses.map((t) => (
                      <div key={t.id}>
                        <b>T{t.id}</b> <small>{t.apexM} m</small> <em>{sgn(t.lossAvgS, 3)} s</em>
                        {t.incidents.map((i) => <p key={i.lap} className="pb-an__inc">V{i.lap}: {i.lossS.toFixed(1)} s perdidos (error o incidente)</p>)}
                        {t.tips.map((tp, k) => <p key={k}>{tp}</p>)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pb-an__col pb-an__col--wide">
              {ref && cur && rep.profile && (
                <>
                  <div className="pb-an__legend">
                    <span className="l-ref">Mejor (V{ref.lap})</span><span className="l-cur">V{cur.lap}</span>
                    <small>Pulsa una vuelta de la tabla para compararla</small>
                  </div>
                  <Chart title="Velocidad" unit="km/h" min={0} max={Math.ceil(Math.max(...ref.speed, ...cur.speed) / 20) * 20} series={[{ vals: ref.speed, cls: "ref" }, { vals: cur.speed, cls: "cur" }]} marks={marks} lengthM={rep.meta.trackLengthM} />
                  <Chart title="Freno" min={0} max={1} h={70} series={[{ vals: ref.brake, cls: "ref" }, { vals: cur.brake, cls: "cur" }]} marks={marks} lengthM={rep.meta.trackLengthM} />
                  <Chart title="Acelerador" min={0} max={1} h={70} series={[{ vals: ref.throttle, cls: "ref" }, { vals: cur.throttle, cls: "cur" }]} marks={marks} lengthM={rep.meta.trackLengthM} />
                  <Chart title={`Tiempo perdido acumulado V${cur.lap} vs mejor`} unit="s" zero min={Math.min(-0.2, ...cur.delta)} max={Math.max(0.2, ...cur.delta)} series={[{ vals: cur.delta, cls: "cur" }]} marks={marks} lengthM={rep.meta.trackLengthM} />
                  <div className="pb-an__marks">{marks.map((m) => <span key={m.label} style={{ left: `${(m.x / rep.meta.trackLengthM) * 100}%` }}>{m.label}</span>)}</div>
                </>
              )}
              {rep.corners && rep.corners.length > 0 && (
                <>
                  <span className="pb-lbl pb-an__h">Curvas (referencia = tu mejor vuelta)</span>
                  <table className="pb-an__tbl">
                    <thead><tr><th>Curva</th><th>m</th><th>Mín km/h</th><th>Frena en</th><th>Freno máx</th><th>Gas tras vértice</th><th>Pérdida media</th><th>σ mín km/h</th></tr></thead>
                    <tbody>
                      {rep.corners.map((c) => (
                        <tr key={c.id}>
                          <td>T{c.id}</td><td>{c.apexM}</td><td>{c.ref.minKph.toFixed(0)}</td>
                          <td>{c.ref.brakeStartM != null ? `${Math.round(c.ref.brakeStartM)} m` : "sin freno"}</td>
                          <td>{c.ref.peakBrake != null ? `${Math.round(c.ref.peakBrake * 100)} %` : "–"}</td>
                          <td>{c.ref.throttleAfterApexM != null ? `+${Math.round(c.ref.throttleAfterApexM)} m` : "–"}</td>
                          <td>{sgn(c.lossAvgS, 3)}</td><td>{c.stats.minKphStd != null ? c.stats.minKphStd.toFixed(1) : "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {!rep && !busy && files.length > 0 && !err && <div className="pb-an__note">Elige un archivo y pulsa Analizar. Se compara cada vuelta limpia con tu mejor vuelta de esa sesión.</div>}
    </div>
  );
};
