// iFuel-telemetry-node/carSpeed.mjs
//
// El SDK de iRacing NO expone la velocidad de los demás coches (no existe CarIdxSpeed; solo
// hay `Speed` para el coche del jugador). Se deriva de cuánto avanza CarIdxLapDistPct entre
// dos lecturas, multiplicado por la longitud de la pista y dividido por el tiempo de sesión.

const MAX_DT_SECONDS = 2; // si pasa más tiempo (pausa, replay, salto) no se fía de la derivada

/**
 * Crea un seguidor de velocidades. Cada llamada devuelve un array indexado por carIdx con
 * m/s, o null cuando no se puede saber (primera lectura, coche fuera del mundo, salto...).
 * null NO significa "parado": quien lo use debe tratarlo como desconocido.
 */
export function createCarSpeedTracker() {
  let prevPct = null;
  let prevTime = null;
  let lastSpeeds = [];

  return function trackCarSpeeds({
    sessionTime,
    carIdxLapDistPct,
    carIdxTrackSurface,
    trackLengthMeters,
  }) {
    const pcts = carIdxLapDistPct ?? [];
    const now = Number.isFinite(sessionTime) ? sessionTime : null;

    const remember = () => {
      prevPct = Array.from(pcts);
      prevTime = now;
    };

    if (prevTime === null || now === null || prevPct === null) {
      remember();
      lastSpeeds = pcts.map(() => null);
      return lastSpeeds;
    }

    const dt = now - prevTime;

    // Sim en pausa (mismo tiempo de sesión): se mantienen las últimas velocidades
    if (dt === 0) return lastSpeeds;

    // Retroceso del tiempo (replay, cambio de sesión) o salto grande: sin datos fiables
    if (dt < 0 || dt > MAX_DT_SECONDS || !(trackLengthMeters > 0)) {
      remember();
      lastSpeeds = pcts.map(() => null);
      return lastSpeeds;
    }

    const speeds = pcts.map((pct, idx) => {
      const before = prevPct[idx];
      const surface = carIdxTrackSurface ? carIdxTrackSurface[idx] : undefined;

      // -1 en LapDistPct / TrackSurface = coche fuera del mundo
      if (!(pct >= 0) || !(before >= 0) || (surface !== undefined && surface < 0)) {
        return null;
      }

      let d = pct - before;
      if (d < -0.5) d += 1; // cruzó la meta hacia delante
      else if (d > 0.5) d -= 1; // cruzó la meta hacia atrás (reset/remolque)

      // Retroceso apreciable (reset al garaje, remolque): desconocido; ruido mínimo: parado
      if (d < -0.001) return null;
      if (d < 0) d = 0;

      return (d * trackLengthMeters) / dt;
    });

    remember();
    lastSpeeds = speeds;
    return speeds;
  };
}
