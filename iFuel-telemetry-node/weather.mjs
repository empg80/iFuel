// Estado de la lluvia a partir de la telemetría (Precipitation 0..1, TrackWetness 1..7, Skies 0..3).
// iRacing no da previsión por telemetría: "riesgo" = cielo cubierto + probabilidad de lluvia declarada en la sesión.
// Histéresis para que un chispeo no genere avisos repetidos.
const START_TICKS = 6;   // ~1,5 s a 4 Hz con precipitación para decir "llueve"
const STOP_TICKS = 60;   // ~15 s sin precipitación para decir "deja de llover"

export function createWeatherTracker() {
  let raining = false;
  let wet = 0;
  let dry = 0;
  let risk = false;
  return {
    reset() { raining = false; wet = 0; dry = 0; risk = false; },
    /** @returns {{state:"dry"|"risk"|"raining"|"drying"|"wet", event:null|"started"|"stopped"|"risk"}} */
    update({ precip, wetness, skies, rainChance }) {
      let event = null;
      const p = Number.isFinite(precip) ? precip : 0;
      if (p > 0.03) { wet++; dry = 0; } else { dry++; wet = 0; }
      if (!raining && wet >= START_TICKS) { raining = true; event = "started"; risk = false; }
      else if (raining && dry >= STOP_TICKS) { raining = false; event = "stopped"; }
      const overcast = skies >= 3 && rainChance > 0;
      if (!raining && overcast && !risk) { risk = true; event = event ?? "risk"; }
      if (!overcast) risk = false;
      const w = Number.isFinite(wetness) ? wetness : 1;
      const state = raining ? "raining" : w >= 3 ? "drying" : risk ? "risk" : "dry";
      return { state, event };
    },
  };
}
