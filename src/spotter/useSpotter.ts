import { useEffect, useRef } from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState";
import { onSpotter } from "./bus";
import { calloutFor, CLEAR_HOLD_MS } from "./logic";
import { alertsFor, initialAlertMemory, type AlertMemory } from "./alerts";
import { getPhrases, setPhrases } from "./phrases";
import { isNaturalVoice, preloadVoice } from "./natural";
import { DEFAULT_SPOTTER, playTone, speak, type SpotterSettings } from "./engine";

/** Spotter de audio: lateral (CarLeftRight a 20 Hz) y avisos de voz del estado. */
export function useSpotter(state: IfuelState | null) {
  const overlay = useOverlayState() as Partial<SpotterSettings> & { spotterTestNonce?: number; spotterMuted?: string[] };
  const cfg: SpotterSettings = { ...DEFAULT_SPOTTER, ...Object.fromEntries(Object.entries(overlay).filter(([k]) => k.startsWith("spotter") && k !== "spotterTestNonce" && k !== "spotterMuted")) };
  const mutedRef = useRef<string[]>([]);
  mutedRef.current = overlay.spotterMuted ?? [];
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevRef = useRef<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memRef = useRef<AlertMemory>(initialAlertMemory());

  // Hasta que no llegan los ajustes guardados (voz, volumen...) no se habla: evita sonar con la voz por defecto
  const loadedRef = useRef(false);
  loadedRef.current = overlay.spotterVoiceName !== undefined;

  const silent = () => {
    const s = stateRef.current;
    return !loadedRef.current || !s || !!s.isReplayPlaying || !!s.onPitRoad;
  };

  useEffect(() => {
    if (isNaturalVoice(cfg.spotterVoiceName)) preloadVoice(cfg.spotterVoiceName);
  }, [cfg.spotterVoiceName]);

  // frases personalizadas (spotter-frases.json)
  useEffect(() => {
    const api = window.ifuelOverlay;
    void api?.getSpotterPhrases?.().then(setPhrases).catch(() => {});
    return api?.onSpotterPhrases?.(setPhrases);
  }, []);

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
        if (k.spotterVoice) speak(c.text, k.spotterVolume, true, k.spotterVoiceName);
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
      lastLap: ((state.sessionFlags ?? 0) & 0x2) !== 0 || state.sessionLapsRemainEx === 1,
      checkered: ((state.sessionFlags ?? 0) & 0x1) !== 0,
      weatherState: state.weather?.state ?? null,
      muted: mutedRef.current,
      nowMs: Date.now(),
    });
    memRef.current = r.mem;
    if (!k.spotterAlerts || !k.spotterEnabled || silent()) return;
    for (const t of r.say) speak(t, k.spotterVolume, false, k.spotterVoiceName);
  }, [state]);

  // "Probar sonido" del menú
  const testNonce = overlay.spotterTestNonce;
  // El primer valor que llega (al abrir la ventana o cambiar de layout) solo se memoriza; el test suena
  // únicamente cuando el valor cambia después (menú "Probar sonido" y arranque del programa).
  const lastNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (testNonce === undefined) return;
    if (lastNonce.current === undefined) { lastNonce.current = testNonce; return; }
    if (lastNonce.current === testNonce) return;
    lastNonce.current = testNonce;
    const k = cfgRef.current;
    playTone("left", k.spotterVolume);
    setTimeout(() => playTone("right", k.spotterVolume), 350);
    setTimeout(() => speak(getPhrases().test, k.spotterVolume, true, k.spotterVoiceName), 800);
  }, [testNonce]);
}
