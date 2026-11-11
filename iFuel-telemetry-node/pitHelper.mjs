// Ayuda en el pit lane: velocidad frente al límite, limitador y distancia a tu box.
// Solo está activo en la calle de boxes (OnPitRoad).
export function parsePitLimitKph(raw) {
  const m = String(raw ?? "").match(/([\d.]+)\s*(kph|km\/h|mph)/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return /mph/i.test(m[2]) ? v * 1.60934 : v;
}

/**
 * @param {{onPitRoad:boolean, speedMs:number, limitKph:number|null, engineWarnings:number, myPct:number, pitPct:number, trackLengthM:number|null}} i
 */
export function computePitHelper(i) {
  if (!i.onPitRoad) return null;
  const speedKph = Math.max(0, (i.speedMs || 0) * 3.6);
  const limiterOn = ((i.engineWarnings | 0) & 0x10) !== 0;
  const over = i.limitKph ? speedKph - i.limitKph : null;
  let boxDistM = null;
  if (i.trackLengthM > 0 && Number.isFinite(i.pitPct) && i.pitPct > 0 && Number.isFinite(i.myPct)) {
    let d = i.pitPct - i.myPct;
    if (d < -0.5) d += 1; // cruzas la meta dentro de la calle de boxes
    if (d > 0.5) d -= 1;
    boxDistM = d * i.trackLengthM; // >0 = tu box está por delante; <0 = ya lo pasaste
  }
  const status = over != null && over > 1 ? "speeding" : !limiterOn && speedKph > 5 ? "no-limiter" : "ok";
  return { speedKph, limitKph: i.limitKph ?? null, overKph: over, limiterOn, boxDistM, status };
}
