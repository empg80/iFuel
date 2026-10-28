// Gap en segundos entre mi coche y otro, para el relative.
//
// Preferimos CarIdxEstTime (tiempo estimado hasta el punto de pista en el que está el coche, a ritmo de
// referencia de su clase) porque tiene en cuenta que la pista no es lineal en tiempo, cosa que
// "% de vuelta * tiempo de vuelta" ignora. Si falta el dato o no es coherente, se cae a ese cálculo.
//
//   dPct   diferencia de % de vuelta ya normalizada a (-0.5, 0.5]; > 0 = el otro va por delante
//   myEst, otherEst   CarIdxEstTime de cada coche (s)
//   lapRef tiempo de referencia de vuelta para el wrap de EstTime (CarClassEstLapTime o último tiempo)
//   sameClass  EstTime solo es comparable entre coches de la misma clase
export function relativeGapSeconds({ dPct, myEst, otherEst, lapRef, fallbackLap, sameClass = true }) {
  if (!Number.isFinite(dPct)) return null;
  const linear = fallbackLap > 0 ? dPct * fallbackLap : null;

  const usable =
    sameClass &&
    lapRef > 0 &&
    Number.isFinite(myEst) && Number.isFinite(otherEst) &&
    myEst >= 0 && otherEst >= 0;
  if (!usable) return linear;

  let raw = otherEst - myEst;
  // El signo tiene que coincidir con el de la geometría: si cruzamos la línea de meta, EstTime da la vuelta.
  if (dPct > 0 && raw < 0) raw += lapRef;
  else if (dPct < 0 && raw > 0) raw -= lapRef;

  // Coherencia: no puede alejarse más de media vuelta de la estimación lineal.
  if (Math.abs(raw) > lapRef * 0.5 + 1e-6) return linear;
  if (linear != null && Math.abs(raw - linear) > lapRef * 0.25) return linear;
  return raw;
}
