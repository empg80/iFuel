// Análisis de vueltas a partir de un .ibt: separa vueltas, remuestrea por distancia, detecta curvas en la mejor vuelta y compara
// cada vuelta limpia contra ella (dónde se pierde tiempo, frenada, velocidad mínima, salida) y la consistencia. Sin modelo físico.
import { readIbt, yamlValue } from "./ibtReader.mjs";

const CHANNELS = ["SessionTime", "Lap", "LapDistPct", "LapLastLapTime", "Speed", "Throttle", "Brake", "SteeringWheelAngle", "Gear", "RPM",
  "LatAccel", "LongAccel", "OnPitRoad", "PlayerTrackSurface", "BrakeABSactive", "FuelLevel"];
export const STEP_M = 5;

const KPH = 3.6;
const MAX_BRAKE_GAP = 20; // muestras (100 m): una frenada que acaba más lejos del vértice no es de esta curva
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const std = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

function parseTrackLengthM(yaml) {
  const v = yamlValue(yaml, "TrackLength");
  const n = v ? parseFloat(v) : NaN;
  if (!(n > 0)) return null;
  return /mi/i.test(v) ? n * 1609.344 : n * 1000;
}

/** Datos del coche del jugador (el YAML trae todos los pilotos; DriverCarIdx es el nuestro). */
function playerInfo(yaml) {
  const idx = yamlValue(yaml, "DriverCarIdx");
  const block = yaml.split(/\n\s*-\s*CarIdx:\s*/).find((b) => b.startsWith(`${idx}\n`) || b.startsWith(`${idx} `));
  const get = (k) => (block ? yamlValue(`\n${block}`, k) : null);
  return { car: get("CarScreenName") ?? yamlValue(yaml, "CarScreenName"), userName: get("UserName") };
}

/** Separa en vueltas con la variable Lap. Devuelve rangos [start, end) de registros. */
function splitLaps(d, n) {
  const laps = [];
  let cur = d.Lap[0], start = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || d.Lap[i] !== cur) {
      laps.push({ n: cur, i0: start, i1: i });
      if (i < n) { cur = d.Lap[i]; start = i; }
    }
  }
  return laps;
}

/** Instante de cruce de la línea estimado desde el registro i (que ya va por LapDistPct[i]). */
function crossTime(d, i, L) {
  return d.SessionTime[i] - (d.LapDistPct[i] * L) / Math.max(5, d.Speed[i]);
}

/** Remuestrea una vuelta a una rejilla de distancia fija. */
function resample(d, lap, L, hasNext) {
  const { i0 } = lap;
  const i1 = hasNext ? lap.i1 + 1 : lap.i1; // incluye el primer registro de la siguiente vuelta para cerrar en pct≈1
  const xs = [], idx = [];
  let lastX = -1;
  for (let i = i0; i < i1; i++) {
    let p = d.LapDistPct[i];
    if (i >= lap.i1) p += 1; // registro de la vuelta siguiente
    const x = p * L;
    if (x > lastX) { xs.push(x); idx.push(i); lastX = x; }
  }
  const N = Math.floor(L / STEP_M);
  const out = { x: new Float32Array(N), t: new Float32Array(N), speed: new Float32Array(N), throttle: new Float32Array(N), brake: new Float32Array(N),
    steer: new Float32Array(N), gear: new Int8Array(N), rpm: new Float32Array(N), latG: new Float32Array(N), lonG: new Float32Array(N) };
  if (xs.length < 10) return null;
  const tStart = crossTime(d, idx[0], L); // instante en que se cruzó la línea (el primer registro ya va por pct≈0)
  let j = 0;
  for (let k = 0; k < N; k++) {
    const x = k * STEP_M;
    while (j < xs.length - 2 && xs[j + 1] < x) j++;
    const xa = xs[j], xb = xs[j + 1];
    const f = xb > xa ? Math.min(1, Math.max(0, (x - xa) / (xb - xa))) : 0;
    const a = idx[j], b = idx[j + 1];
    const lerp = (arr, scale = 1) => (arr[a] + (arr[b] - arr[a]) * f) * scale;
    out.x[k] = x;
    out.t[k] = d.SessionTime[a] + (d.SessionTime[b] - d.SessionTime[a]) * f - tStart;
    out.speed[k] = lerp(d.Speed, KPH);
    out.throttle[k] = lerp(d.Throttle);
    out.brake[k] = lerp(d.Brake);
    out.steer[k] = lerp(d.SteeringWheelAngle, 180 / Math.PI);
    out.gear[k] = Math.round(lerp(d.Gear));
    out.rpm[k] = lerp(d.RPM);
    out.latG[k] = lerp(d.LatAccel) / 9.81;
    out.lonG[k] = lerp(d.LongAccel) / 9.81;
  }
  return out;
}

function smooth(a, w) {
  const n = a.length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = -w; k <= w; k++) { const q = (i + k + n) % n; s += a[q]; c++; }
    out[i] = s / c;
  }
  return out;
}

/** Curvas de la vuelta de referencia: mínimos de velocidad con prominencia suficiente. */
function detectCorners(ref) {
  const n = ref.x.length;
  const v = smooth(ref.speed, 3);
  const win = Math.round(80 / STEP_M);
  const prom = 6; // km/h
  const far = Math.round(450 / STEP_M);
  const cand = [];
  for (let i = 0; i < n; i++) {
    let isMin = true;
    for (let k = -win; k <= win && isMin; k++) if (k !== 0 && v[(i + k + n) % n] < v[i]) isMin = false;
    if (!isMin) continue;
    let before = v[i], after = v[i];
    for (let k = 1; k <= far; k++) { before = Math.max(before, v[(i - k + n) % n]); after = Math.max(after, v[(i + k) % n]); }
    if (Math.min(before, after) - v[i] >= prom) cand.push(i);
  }
  // mínimos consecutivos sin recuperar velocidad (p. ej. una chicane o una curva doble) se fusionan en una sola curva
  for (let i = 0; i < cand.length - 1;) {
    const a = cand[i], b = cand[i + 1];
    if (fwd(a, b, n) * STEP_M > 300) { i++; continue; }
    let peak = -Infinity;
    for (let q = a; q !== b; q = (q + 1) % n) peak = Math.max(peak, v[q]);
    if (peak - Math.max(v[a], v[b]) < 15) { cand.splice(v[a] <= v[b] ? i + 1 : i, 1); } else i++;
  }
  // inicio de frenada: tramo contiguo con freno > 0.08 más cercano al vértice (hasta 600 m antes)
  const backM = (list, c, len) => (list.length > 1 ? fwd(list[(c - 1 + list.length) % list.length], list[c], len) * STEP_M : 600);
  const corners = cand.map((apex, c) => {
    let bs = null;
    const lim = Math.round(Math.min(600, backM(cand, c, n)) / STEP_M);
    let k = 0;
    while (k < lim && ref.brake[(apex - k + n) % n] <= 0.08) k++; // hasta encontrar freno hacia atrás
    if (k < lim && k <= MAX_BRAKE_GAP) {
      while (k < lim && ref.brake[(apex - k + n) % n] > 0.08) k++;
      bs = (apex - k + 1 + n) % n;
    }
    return { id: c + 1, apex, brakeStart: bs };
  });
  // zona de cada curva: desde su inicio de frenada (o 150 m antes del vértice) hasta el inicio de la siguiente
  corners.forEach((c, i) => { c.backM = Math.min(600, fwd(corners[(i - 1 + corners.length) % corners.length].apex, c.apex, n) * STEP_M || 600); });
  corners.forEach((c) => { c.zoneStart = c.brakeStart ?? ((c.apex - Math.round(150 / STEP_M) + n) % n); });
  corners.forEach((c, i) => { c.zoneEnd = corners[(i + 1) % corners.length].zoneStart; });
  return corners;
}

/** Posición circular: distancia desde `from` hasta `to` hacia delante, en muestras. */
const fwd = (from, to, n) => (to - from + n) % n;

function cornerMetrics(lap, c, n, ref) {
  const get = (arr, i) => arr[((i % n) + n) % n];
  const lookBack = Math.round(Math.min(600, c.backM) / STEP_M), lookFwd = Math.round(350 / STEP_M);
  // vértice real de esta vuelta: mínimo de velocidad en ±100 m del de referencia
  let apex = c.apex, vmin = Infinity;
  const r = Math.round(40 / STEP_M);
  for (let k = -r; k <= r; k++) { const q = (c.apex + k + n) % n; if (lap.speed[q] < vmin) { vmin = lap.speed[q]; apex = q; } }
  // frenada: tramo con freno > 0.08 más cercano al vértice
  let k = 0;
  while (k < lookBack && get(lap.brake, apex - k) <= 0.08) k++;
  let brakeStartM = null, brakeLenM = null, peak = null, brakeEnd = null;
  if (k < lookBack && k <= MAX_BRAKE_GAP) {
    let e = k;
    while (e < lookBack && get(lap.brake, apex - e) > 0.08) e++;
    const s = apex - e + 1;
    brakeStartM = (((s % n) + n) % n) * STEP_M;
    brakeLenM = (e - k) * STEP_M;
    peak = 0;
    for (let q = k; q < e; q++) peak = Math.max(peak, get(lap.brake, apex - q));
    brakeEnd = apex - k;
  }
  // salida: primer punto tras el vértice con acelerador > 0.5 (si ya estaba, el mismo vértice)
  let thr = 0;
  while (thr < lookFwd && get(lap.throttle, apex + thr) < 0.5) thr++;
  const exit = (thr < lookFwd ? thr : null);
  const at100 = get(lap.speed, apex + Math.round(100 / STEP_M));
  const dist = (i) => (fwd(c.zoneStart, ((i % n) + n) % n, n)) * STEP_M;
  void brakeEnd; void dist; void ref;
  return {
    minKph: vmin, apexM: apex * STEP_M, brakeStartM, brakeLenM, peakBrake: peak,
    throttleOnM: exit != null ? ((apex + exit) % n) * STEP_M : null, throttleAfterApexM: exit != null ? exit * STEP_M : null,
    exitKph: at100, gear: lap.gear[apex],
  };
}

/** Pérdida de tiempo de una vuelta respecto a la referencia en una zona circular (s). */
function zoneLoss(lap, ref, zs, ze, n) {
  const dlt = (i) => lap.t[i] - ref.t[i];
  const total = lap.t[n - 1] - ref.t[n - 1];
  if (zs <= ze) return dlt(ze === n ? n - 1 : ze) - dlt(zs);
  return (total - dlt(zs)) + dlt(ze); // la zona cruza la línea de meta
}

export function analyzeIbt(src) {
  const r = readIbt(src, { channels: CHANNELS });
  const d = r.data;
  const n0 = r.records;
  const L = parseTrackLengthM(r.sessionYaml);
  if (!L) throw new Error("No se encontró la longitud del circuito en el .ibt");
  for (const need of ["SessionTime", "Lap", "LapDistPct", "Speed", "Throttle", "Brake"]) if (!d[need]) throw new Error(`Falta el canal ${need} en el .ibt`);
  const raw = splitLaps(d, n0);
  const trackName = yamlValue(r.sessionYaml, "TrackDisplayName") ?? yamlValue(r.sessionYaml, "TrackName");
  const info = playerInfo(r.sessionYaml);

  const laps = [];
  raw.forEach((lp, k) => {
    const dur = (lp.i1 - lp.i0) / r.tickRate;
    if (dur < 30) return;
    const hasNext = k < raw.length - 1;
    const startPct = d.LapDistPct[lp.i0], endPct = d.LapDistPct[lp.i1 - 1];
    const complete = hasNext && startPct < 0.03 && endPct > 0.97;
    let pit = 0, off = 0;
    for (let i = lp.i0; i < lp.i1; i++) { if (d.OnPitRoad?.[i]) pit++; if (d.PlayerTrackSurface?.[i] === 0) off++; }
    const rs = complete ? resample(d, lp, L, true) : null;
    // LapLastLapTime de iRacing llega con retraso: el tiempo sale del cruce de línea entre una vuelta y la siguiente
    const timeS = complete ? crossTime(d, raw[k + 1].i0, L) - crossTime(d, lp.i0, L) : null;
    laps.push({
      n: lp.n, timeS, complete, pitS: pit / r.tickRate, offTrackS: off / r.tickRate,
      clean: complete && pit === 0, rs,
      reason: !complete ? "incompleta" : pit > 0 ? "pasa por boxes" : null,
    });
  });
  const clean = laps.filter((l) => l.clean && l.timeS > 0);
  if (!clean.length) return { meta: { track: trackName, car: info.car, trackLengthM: L, tickRate: r.tickRate }, laps: laps.map(publicLap), error: "No hay vueltas completas sin pasar por boxes" };

  const best = clean.reduce((a, b) => (b.timeS < a.timeS ? b : a));
  const ref = best.rs;
  const n = ref.x.length;
  const corners = detectCorners(ref);
  const refCorners = corners.map((c) => ({ c, m: cornerMetrics(ref, c, n, ref) }));

  // vueltas comparables: dentro del 110 % de la mejor
  const comparable = clean.filter((l) => l.timeS <= best.timeS * 1.1);
  const perCorner = refCorners.map(({ c, m: rm }) => {
    const rows = comparable.map((l) => {
      const m = cornerMetrics(l.rs, c, n, ref);
      const loss = l === best ? 0 : zoneLoss(l.rs, ref, c.zoneStart, c.zoneEnd, n);
      return { lap: l.n, loss, ...m };
    });
    const others = rows.filter((x) => x.lap !== best.n);
    const lossAvg = mean(others.map((x) => x.loss));
    const incidents = others.filter((x) => x.loss > 2).map((x) => ({ lap: x.lap, lossS: x.loss }));
    return {
      id: c.id, apexM: Math.round(c.apex * STEP_M), zoneStartM: c.zoneStart * STEP_M, zoneEndM: c.zoneEnd * STEP_M,
      ref: rm, rows, lossAvgS: lossAvg,
      stats: {
        minKphStd: std(rows.map((x) => x.minKph)), brakeStartStdM: std(rows.map((x) => x.brakeStartM).filter((v) => v != null)),
        lossStdS: std(others.map((x) => x.loss)),
      },
      incidents,
      tips: others.length ? cornerTips(rm, others.filter((x) => x.loss <= 2)) : [],
    };
  });

  const losses = [...perCorner].filter((p) => p.lossAvgS != null).sort((a, b) => b.lossAvgS - a.lossAvgS);
  const times = comparable.map((l) => l.timeS);
  return {
    meta: {
      track: trackName, car: info.car, trackLengthM: L, tickRate: r.tickRate, sessionType: yamlValue(r.sessionYaml, "SessionType"),
      stepM: STEP_M, records: n0,
    },
    laps: laps.map(publicLap),
    reference: { lap: best.n, timeS: best.timeS },
    summary: { cleanLaps: clean.length, comparableLaps: comparable.length, bestS: best.timeS, meanS: mean(times), stdS: std(times) },
    corners: perCorner.map(({ rows, ...p }) => ({ ...p, rows })),
    topLosses: losses.slice(0, 5).map((p) => ({ id: p.id, apexM: p.apexM, lossAvgS: p.lossAvgS, tips: p.tips, incidents: p.incidents })),
    profile: profileOf(ref, comparable, best),
  };
}

function publicLap(l) {
  return { n: l.n, timeS: l.timeS, complete: l.complete, clean: l.clean, pitS: l.pitS, offTrackS: l.offTrackS, reason: l.reason };
}

/** Frases comparando la media de las otras vueltas con la referencia. Solo se dicen diferencias claras. */
function cornerTips(rm, others) {
  const tips = [];
  if (!others.length) return tips;
  const avg = (k) => mean(others.map((x) => x[k]).filter((v) => v != null));
  const bs = avg("brakeStartM"), pk = avg("peakBrake"), mk = avg("minKph"), th = avg("throttleAfterApexM");
  if (rm.brakeStartM != null && bs != null) {
    const diff = rm.brakeStartM - bs; // >0: frenas antes que en la mejor
    if (diff > 8) tips.push(`Frenas ~${Math.round(diff)} m antes que en tu mejor vuelta`);
    else if (diff < -8) tips.push(`Frenas ~${Math.round(-diff)} m más tarde que en tu mejor vuelta (vigila el bloqueo)`);
  }
  if (rm.peakBrake != null && pk != null && rm.peakBrake - pk > 0.08) tips.push(`Presión máxima de freno ${Math.round(pk * 100)} % frente a ${Math.round(rm.peakBrake * 100)} % en la mejor`);
  if (mk != null && rm.minKph - mk > 2) tips.push(`Velocidad mínima ${Math.round(rm.minKph - mk)} km/h menor que en la mejor`);
  if (rm.throttleAfterApexM != null && th != null && th - rm.throttleAfterApexM > 10) tips.push(`Aceleras ~${Math.round(th - rm.throttleAfterApexM)} m más tarde tras el vértice`);
  return tips;
}

/** Perfiles para dibujar: referencia y cada vuelta comparable (velocidad, acelerador, freno) y su delta acumulado. */
function profileOf(ref, comparable, best) {
  const round = (a, k = 1) => Array.from(a, (v) => Math.round(v * 10 ** k) / 10 ** k);
  const lapData = (l) => ({
    lap: l.n, speed: round(l.rs.speed), throttle: round(l.rs.throttle, 2), brake: round(l.rs.brake, 2),
    delta: round(Array.from(l.rs.t, (t, i) => t - ref.t[i]), 3),
  });
  return { stepM: STEP_M, reference: best.n, laps: comparable.map(lapData) };
}
