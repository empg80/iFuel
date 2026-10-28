// iFuel-telemetry-node/pitState.mjs

// Mapa global por sesión: carIdx -> estado de pit/stint
const pitAndStintStateByCarIdx = new Map();

/**
 * Devuelve (o crea) el estado de pit/stint para un carIdx.
 */
function getOrCreatePitState(carIdx) {
  let state = pitAndStintStateByCarIdx.get(carIdx);
  if (!state) {
    state = {
      inPitLane: false,
      pitEntrySessionTime: null,
      lastPitDurationSeconds: null,

      stintStartLapCompleted: null,
      lastKnownLapCompleted: 0,

      pitStops: 0,

      // Primera observación del coche: si ya estaba en pit road, su primera salida
      // (p. ej. salir del box al empezar la sesión) no cuenta como parada.
      observed: false,
      startedInPit: false,
    };
    pitAndStintStateByCarIdx.set(carIdx, state);
  }
  return state;
}

/**
 * Actualiza el estado de pit/stint para todos los coches
 * usando los arrays crudos de telemetría.
 */
function updatePitAndStintState({
  sessionTime,
  carIdxOnPitRoad,
  carIdxLapCompleted,
  carIdxLapDistPct,
}) {
  for (let carIdx = 0; carIdx < carIdxOnPitRoad.length; carIdx++) {
    // Coche fuera del mundo (garaje/replay): CarIdxOnPitRoad vale false aunque luego
    // aparezca ya dentro del pit road. No cuenta como observación.
    if (carIdxLapDistPct && (carIdxLapDistPct[carIdx] ?? -1) < 0) continue;
    const onPitRoad = !!carIdxOnPitRoad[carIdx];
    const lapCompleted = carIdxLapCompleted[carIdx] ?? 0;
    const state = getOrCreatePitState(carIdx);

    if (!state.observed) {
      state.observed = true;
      state.startedInPit = onPitRoad;
    }

    // Inicializar inicio de stint con la primera vuelta completada razonable
    if (state.stintStartLapCompleted == null && lapCompleted > 0) {
      state.stintStartLapCompleted = lapCompleted;
    }

    // Entrada a pitlane
    if (!state.inPitLane && onPitRoad) {
      state.inPitLane = true;
      state.pitEntrySessionTime = sessionTime;
    }

    // Salida de pitlane -> calcular duración, contar parada y reiniciar el stint
    if (state.inPitLane && !onPitRoad) {
      state.inPitLane = false;
      if (state.startedInPit) {
        // Salida inicial del box: no es una parada
        state.startedInPit = false;
      } else {
        if (state.pitEntrySessionTime != null) {
          state.lastPitDurationSeconds = Math.max(
            0,
            sessionTime - state.pitEntrySessionTime,
          );
        }
        state.pitStops += 1;
      }
      // Nuevo stint: antes no se reiniciaba nunca y "stint laps" acababa siendo el total de vueltas
      state.stintStartLapCompleted = Math.max(0, lapCompleted);
    }

    state.lastKnownLapCompleted = lapCompleted;
  }
}

/**
 * Borra el estado de todos los coches (cambio de sesión o reconexión con el sim).
 */
function resetPitAndStintState() {
  pitAndStintStateByCarIdx.clear();
}

export {
  pitAndStintStateByCarIdx,
  getOrCreatePitState,
  updatePitAndStintState,
  resetPitAndStintState,
};
