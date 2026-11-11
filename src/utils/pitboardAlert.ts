// Aviso más importante del momento para la franja del pitboard (prioridad fija). Puro.
export type AlertTone = "danger" | "warn" | "info" | "ok";
export type PitboardAlert = { tone: AlertTone; tag: string; msg: string } | null;

export type AlertSource = {
  pitHelper?: { status: string; limitKph: number | null; boxDistM: number | null } | null;
  myPenalty?: "black" | "dq" | "repair" | "warn" | null;
  yellow?: { active: boolean; type?: "incident" | "debris" | null; distanceMeters: number | null; carNum?: number | string | null } | null;
  fastTraffic?: { carNum: string | null; catchInSeconds: number; classId?: number | null } | null;
  classNames?: Record<number, string>;
  weatherState?: string | null;
  call?: { headline: string; tone: string } | null;
  fuelCritical?: boolean;
  lastLap?: boolean;
  checkered?: boolean;
};

const MAX_METERS = 1200;
const roundM = (m: number) => (m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50);

export function pitboardAlert(s: AlertSource): PitboardAlert {
  const h = s.pitHelper;
  if (h) {
    const box = h.boxDistM != null && h.boxDistM > 3 ? ` · tu box a ${Math.round(h.boxDistM)} m` : "";
    if (h.status === "speeding") return { tone: "danger", tag: "PIT LANE", msg: `REDUCE VELOCIDAD${h.limitKph ? ` · límite ${Math.round(h.limitKph)}` : ""}${box}` };
    if (h.status === "no-limiter") return { tone: "warn", tag: "PIT LANE", msg: `ACTIVA EL LIMITADOR${box}` };
    return { tone: "ok", tag: "PIT LANE", msg: `Limitador activo${box}` };
  }
  if (s.checkered) return { tone: "info", tag: "META", msg: "BANDERA A CUADROS" };
  if (s.myPenalty === "black" || s.myPenalty === "dq") return { tone: "danger", tag: "SANCIÓN", msg: s.myPenalty === "dq" ? "DESCALIFICADO" : "BANDERA NEGRA · cumple la sanción" };
  if (s.myPenalty === "repair") return { tone: "danger", tag: "BANDERA", msg: "NARANJA · entra a reparar" };
  const y = s.yellow;
  if (y?.active) {
    const what = y.type === "debris" ? "DEBRIS" : y.type === "incident" ? "COCHE PARADO" : "AMARILLA";
    const d = y.distanceMeters != null && y.distanceMeters > 0 && y.distanceMeters <= MAX_METERS ? ` a ${roundM(y.distanceMeters)} m` : "";
    return { tone: "warn", tag: "AVISO", msg: `${what}${d}` };
  }
  const f = s.fastTraffic;
  if (f && f.carNum != null) {
    const cls = f.classId != null ? s.classNames?.[f.classId] : null;
    return { tone: "warn", tag: "TRÁFICO", msg: `${cls ? cls.toUpperCase() : "CLASE RÁPIDA"} #${f.carNum} te alcanza en ${Math.max(1, Math.round(f.catchInSeconds))} s` };
  }
  if (s.fuelCritical) return { tone: "danger", tag: "FUEL", msg: "COMBUSTIBLE CRÍTICO" };
  if (s.call && /^BOX (AHORA|PRÓXIMA)/.test(s.call.headline)) return { tone: s.call.tone === "go" ? "ok" : "warn", tag: "BOX", msg: s.call.headline };
  if (s.weatherState === "raining") return { tone: "info", tag: "TIEMPO", msg: "LLUEVE" };
  if (s.weatherState === "risk") return { tone: "info", tag: "TIEMPO", msg: "Riesgo de lluvia" };
  if (s.lastLap) return { tone: "info", tag: "META", msg: "ÚLTIMA VUELTA" };
  return null;
}
