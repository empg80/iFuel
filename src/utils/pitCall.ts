// "Qué hago con la parada": frase principal + porqué + vueltas candidatas. Puro (sin React).
import type { PitClearAirData } from "../types/pit";

export type PitTone = "go" | "wait" | "bad" | "info" | "idle";
export type PitCall = {
  tone: PitTone;
  headline: string;
  sub: string;
  laps: { lap: number; score: number }[];
  pick: number | null;
};

export const toneForScore = (score: number | null | undefined): PitTone =>
  score == null ? "idle" : score === 0 ? "go" : score === 1 ? "wait" : "bad";

function trafficText(o: { trafficScore: number; direct?: number; fastBehind?: number; slowAhead?: number } | undefined): string {
  if (!o || o.trafficScore === 0) return "Aire limpio al salir";
  const parts: string[] = [];
  const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  if (o.direct) parts.push(`${pl(o.direct, "coche pegado", "coches pegados")} a tu salida`);
  if (o.fastBehind) parts.push(`${pl(o.fastBehind, "más rápido te alcanza", "más rápidos te alcanzan")}`);
  if (o.slowAhead) parts.push(`${pl(o.slowAhead, "más lento por adelantar", "más lentos por adelantar")}`);
  return parts.length ? parts.join(" · ") : `${pl(o.trafficScore, "coche", "coches")} en tu salida`;
}

export function pitCall(data: PitClearAirData | undefined, lapNumber: number | null): PitCall {
  const empty: PitCall = { tone: "idle", headline: "ESPERANDO VENTANA", sub: "La ventana de parada aún no está abierta", laps: [], pick: null };
  if (!data) return empty;
  if (data.windowStatus === "no-stop") return { ...empty, tone: "info", headline: "SIN PARADA", sub: "El combustible llega a meta con el margen elegido" };
  if (data.windowStatus === "critical") return { ...empty, tone: "bad", headline: "COMBUSTIBLE CRÍTICO", sub: "Entra a boxes: no llega para otra vuelta" };
  if (!data.suggestedLap) return empty;

  const laps = (data.options ?? []).map((o) => ({ lap: o.lap, score: o.trafficScore })).sort((a, b) => a.lap - b.lap);
  const chosen = data.options?.find((o) => o.lap === data.suggestedLap);
  const score = chosen?.trafficScore ?? data.nowScore ?? 0;
  const cur = lapNumber ?? 0;
  const ref = data.nextPitLap ?? cur;
  const diff = data.suggestedLap - ref;
  let call: PitCall;
  if (data.windowStatus === "extra-stop") {
    call = { tone: "wait", headline: "PARADA EXTRA", sub: "Un repostaje no llega a meta: planea dos paradas", laps, pick: data.suggestedLap };
  } else if (diff <= 0) {
    const next = ref > cur && cur > 0;
    call = { tone: toneForScore(score), headline: next ? "BOX PRÓXIMA VUELTA" : "BOX AHORA", sub: trafficText(chosen ?? { trafficScore: score }), laps, pick: data.suggestedLap };
  } else {
    call = { tone: "wait", headline: `BOX EN V${data.suggestedLap}`, sub: `Ahora: ${trafficText({ trafficScore: data.nowScore ?? 0 }).toLowerCase()}`, laps, pick: data.suggestedLap };
  }
  return call;
}
