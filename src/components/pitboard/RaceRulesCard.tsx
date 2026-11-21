import React, { useEffect, useRef, useState } from "react";
import type { IfuelState } from "../../useIfuelWebSocket";
import { evaluateRules, setRaceRules, useRaceRules, type RaceRules } from "../../utils/raceRules";

const STEP: Record<keyof RaceRules, number> = { minStops: 1, minStopSeconds: 5, maxStintLaps: 1 };

/** C2-light: paradas obligatorias, tiempo mínimo en boxes y stint máximo, con los valores que pone el usuario. */
export const RaceRulesCard: React.FC<{ state: IfuelState | null }> = ({ state }) => {
  const rules = useRaceRules();
  const [edit, setEdit] = useState(false);
  const me = state?.standings?.find((r) => String(r.carNumber) === String(state?.playerCarNumber ?? "")) ?? null;
  const inPit = !!me?.inPit;
  const t0 = useRef<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (inPit) {
      if (t0.current == null) t0.current = Date.now();
      const id = setInterval(() => tick((n) => n + 1), 500);
      return () => clearInterval(id);
    }
    t0.current = null;
    return undefined;
  }, [inPit]);
  const pitSeconds = inPit && t0.current != null ? (Date.now() - t0.current) / 1000 : null;
  const st = evaluateRules(rules, me, pitSeconds);

  const row = (key: keyof RaceRules, label: string, unit: string) => (
    <div className="pb-rule-edit" key={key}>
      <span className="pb-lbl">{label}</span>
      <button type="button" onClick={() => setRaceRules({ [key]: rules[key] - STEP[key] })} aria-label={`Menos ${label}`}>−</button>
      <b className="pb-num">{rules[key] > 0 ? `${rules[key]}${unit}` : "off"}</b>
      <button type="button" onClick={() => setRaceRules({ [key]: rules[key] + STEP[key] })} aria-label={`Más ${label}`}>+</button>
    </div>
  );

  return (
    <div className="pb-panel pb-rules">
      <div className="pb-rules__head">
        <span className="pb-lbl">Reglas de la carrera</span>
        <button type="button" className="pb-rules__cfg" onClick={() => setEdit((v) => !v)}>{edit ? "Listo" : "Ajustar"}</button>
      </div>
      {edit && (
        <div className="pb-rules__edit">
          {row("minStops", "Paradas obligatorias", "")}
          {row("minStopSeconds", "Tiempo mínimo en boxes", " s")}
          {row("maxStintLaps", "Stint máximo", " v")}
        </div>
      )}
      {!edit && !st.active && <div className="pb-rules__off">Sin reglas configuradas</div>}
      {!edit && st.active && (
        <div className="pb-rules__list">
          {st.stopsLeft != null && (
            <div className={st.stopsOk ? "is-ok" : "is-warn"}><b>Paradas</b><span>{st.stopsDone}/{rules.minStops}{st.stopsOk ? " ✓" : ` · faltan ${st.stopsLeft}`}</span></div>
          )}
          {st.stintLeft != null && (
            <div className={`is-${st.stintTone}`}><b>Stint</b><span>V{st.stintLaps}/{rules.maxStintLaps}{st.stintLeft <= 0 ? " · ¡PARA YA!" : ` · quedan ${st.stintLeft}`}</span></div>
          )}
          {rules.minStopSeconds > 0 && (
            <div className={st.holdLeft == null ? "" : st.holdLeft > 0 ? "is-warn" : "is-ok"}>
              <b>En boxes</b>
              <span>{st.holdLeft == null ? `mín. ${rules.minStopSeconds} s` : st.holdLeft > 0 ? `espera ${Math.ceil(st.holdLeft)} s` : "ya puedes salir ✓"}</span>
            </div>
          )}
        </div>
      )}
      {!edit && st.active && rules.minStopSeconds > 0 && <small className="pb-rules__note">El contador de boxes cuenta desde que entras en el pit lane (aprox.).</small>}
    </div>
  );
};
