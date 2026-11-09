import { useEffect, useRef } from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState";
import { onSpotter } from "./bus";
import { calloutFor, CLEAR_HOLD_MS } from "./logic";
import { alertsFor, initialAlertMemory, type AlertMemory } from "./alerts";
import { DEFAULT_SPOTTER, playTone, speak, type SpotterSettings } from "./engine";

/** Spotter de audio: lateral (CarLeftRight a 20 Hz) y avisos de voz del estado. */
export function useSpotter(state: IfuelState | null) {
  const overlay = useOverlayState() as Partial<SpotterSettings> & { spotterTestNonce?: number };
  const cfg: SpotterSettings = { ...DEFAULT_SPOTTER, ...Object.fromEntries(Object.entries(overlay).filter(([k]) => k.startsWith("spotter") && k !== "spotterTestNonce")) };
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevRef = useRef<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memRef = useRef<AlertMemory>(initialAlertMemory());

  const silent = () => {
    const s = stateRef.current;
    return !s || !!s.isReplayPlaying || !!s.onPitRoad;
  };

  useEffect(() => {
    return onSpotter((v) => {
      const prev = prevRef.current;
      prevRef.current = v;
      if (clearTimer.current) { clearTimeout(clearTimer.current); clearTimer.current = null; }
      const c = calloutFor(prev, v);
      if (!c) return;
      const fire = () => {
        const k = cfgRef.current;
        if (!k.spotterEnabled || silent()) return;
        if (k.spotterTones) playTone(c.side, k.spotterVolume);
        if (k.spotterVoice) speak(c.text, k.spotterVolume, true);
      };
      if (c.kind === "clear") clearTimer.current = setTimeout(fire, CLEAR_HOLD_MS);
      else fire();
    });
  }, []);

  // avisos de voz (4 Hz): clase rápida, amarilla/debris, combustible, ventana y box
  useEffect(() => {
    if (!state) return;
    const k = cfgRef.current;
    const r = alertsFor(memRef.current, {
      fastTraffic: state.fastTraffic ?? null,
      classNames: state.classNames,
      yellow: state.yellowWarning ?? null,
      fuelStatus: state.fuelPlan?.status ?? null,
      windowStatus: state.pitClearAir?.windowStatus ?? null,
      pitSuggestedLap: state.pitClearAir?.suggestedLap ?? null,
      pitNextLap: state.pitClearAir?.nextPitLap ?? null,
      pitLocked: !!(state.pitClearAir as { locked?: boolean } | null)?.locked,
      nowMs: Date.now(),
    });
    memRef.current = r.mem;
    if (!k.spotterAlerts || !k.spotterEnabled || silent()) return;
    for (const t of r.say) speak(t, k.spotterVolume, false);
  }, [state]);

  // "Probar sonido" del menú
  const testNonce = overlay.spotterTestNonce;
  const firstNonce = useRef(true);
  useEffect(() => {
    if (firstNonce.current) { firstNonce.current = false; return; }
    const k = cfgRef.current;
    playTone("left", k.spotterVolume);
    setTimeout(() => playTone("right", k.spotterVolume), 350);
    setTimeout(() => speak("Spotter activo. Izquierda. Derecha. Libre.", k.spotterVolume, true), 800);
  }, [testNonce]);
}
