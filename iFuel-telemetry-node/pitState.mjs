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
}) {
  for (let carIdx = 0; carIdx < carIdxOnPitRoad.length; carIdx++) {
    const onPitRoad = !!carIdxOnPitRoad[carIdx];
    const lapCompleted = carIdxLapCompleted[carIdx] ?? 0;
    const state = getOrCreatePitState(carIdx);

    // Inicializar inicio de stint con la primera vuelta completada razonable
    if (state.stintStartLapCompleted == null && lapCompleted > 0) {
      state.stintStartLapCompleted = lapCompleted;
    }

    // Entrada a pitlane
    if (!state.inPitLane && onPitRoad) {
      state.inPitLane = true;
      state.pitEntrySessionTime = sessionTime;
    }

    // Salida de pitlane -> calcular duración y contar parada
    if (state.inPitLane && !onPitRoad) {
      state.inPitLane = false;
      if (state.pitEntrySessionTime != null) {
        state.lastPitDurationSeconds = Math.max(
          0,
          sessionTime - state.pitEntrySessionTime,
        );
      }
      state.pitStops += 1;
    }

    state.lastKnownLapCompleted = lapCompleted;
  }
}

export { pitAndStintStateByCarIdx, getOrCreatePitState, updatePitAndStintState };
