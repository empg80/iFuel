// Paletas y ajustes del layout de replay.
export type ReplayDesign = "tv" | "ribbon" | "pylon";
export type ReplayPaletteId = "cyan" | "f1" | "green" | "orange" | "mono" | "custom";
export type ReplayGapMode = "leader" | "interval";
export type ReplaySettings = {
  design: ReplayDesign;
  palette: ReplayPaletteId;
  gapMode: ReplayGapMode;
  guides: boolean;
  phaseS: number;
  custom: { fondo: string; acento: string; acento2: string };
};

export const DEFAULT_REPLAY_SETTINGS: ReplaySettings = {
  design: "tv",
  palette: "cyan",
  gapMode: "leader",
  guides: false,
  phaseS: 10,
  custom: { fondo: "#0b0f19", acento: "#ec4899", acento2: "#38bdf8" },
};

type Vars = Record<string, string>;

const PALETTES: Record<Exclude<ReplayPaletteId, "custom">, Vars> = {
  cyan: { ink: "rgba(11,15,25,0.94)", ink2: "#1c2438", a: "#22d3ee", ona: "#04202a", b: "#7c3aed", onb: "#ffffff", mute: "#8fa0bb" },
  f1: { ink: "rgba(21,21,30,0.95)", ink2: "#26263a", a: "#e10600", ona: "#ffffff", b: "#f5f5f5", onb: "#15151e", mute: "#a3a3b5" },
  green: { ink: "rgba(10,20,16,0.95)", ink2: "#15291f", a: "#4ade80", ona: "#052e16", b: "#0d9488", onb: "#ffffff", mute: "#8fb5a6" },
  orange: { ink: "rgba(23,17,10,0.95)", ink2: "#2b2014", a: "#fb923c", ona: "#2a1300", b: "#facc15", onb: "#1a1500", mute: "#b8a58a" },
  mono: { ink: "rgba(16,16,16,0.95)", ink2: "#262626", a: "#e5e5e5", ona: "#111111", b: "#737373", onb: "#ffffff", mute: "#a3a3a3" },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Negro o blanco según la luminosidad del color de fondo (para que el texto se lea). */
export function readableOn(hex: string): string {
  if (!HEX.test(hex)) return "#ffffff";
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? "#111111" : "#ffffff";
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function mix(hex: string, toward: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c: number) => Math.round(c + (toward - c) * 0.12).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Variables CSS (--bc-*) de la paleta elegida. */
export function paletteVars(id: ReplayPaletteId, custom: ReplaySettings["custom"]): Record<string, string> {
  let v: Vars;
  if (id === "custom") {
    const c = {
      fondo: HEX.test(custom.fondo) ? custom.fondo : DEFAULT_REPLAY_SETTINGS.custom.fondo,
      acento: HEX.test(custom.acento) ? custom.acento : DEFAULT_REPLAY_SETTINGS.custom.acento,
      acento2: HEX.test(custom.acento2) ? custom.acento2 : DEFAULT_REPLAY_SETTINGS.custom.acento2,
    };
    v = {
      ink: hexToRgba(c.fondo, 0.94),
      ink2: mix(c.fondo, 255),
      a: c.acento,
      ona: readableOn(c.acento),
      b: c.acento2,
      onb: readableOn(c.acento2),
      mute: "#9aa7bb",
    };
  } else {
    v = PALETTES[id] ?? PALETTES.cyan;
  }
  return {
    "--bc-ink": v.ink, "--bc-ink-2": v.ink2, "--bc-cyan": v.a, "--bc-dark-on-cyan": v.ona,
    "--bc-violet": v.b, "--bc-on-b": v.onb, "--bc-mute": v.mute,
  };
}

const DESIGNS: ReplayDesign[] = ["tv", "ribbon", "pylon"];
const PALETTE_IDS: ReplayPaletteId[] = ["cyan", "f1", "green", "orange", "mono", "custom"];

/** Mezcla estado del overlay (Electron) y parámetros de la URL (#/replay?design=ribbon&palette=f1…, útil en OBS). */
export function resolveSettings(
  state: Partial<{
    replayDesign: string; replayPalette: string; replayGapMode: string; replayGuides: boolean;
    replayPhaseS: number; replayCustom: ReplaySettings["custom"];
  }> | null,
  query: URLSearchParams | null,
): ReplaySettings {
  const s: ReplaySettings = { ...DEFAULT_REPLAY_SETTINGS, custom: { ...DEFAULT_REPLAY_SETTINGS.custom } };
  const apply = (design?: string | null, palette?: string | null, gap?: string | null, guides?: boolean | null, phase?: number | null) => {
    if (design && (DESIGNS as string[]).includes(design)) s.design = design as ReplayDesign;
    if (palette && (PALETTE_IDS as string[]).includes(palette)) s.palette = palette as ReplayPaletteId;
    if (gap === "leader" || gap === "interval") s.gapMode = gap;
    if (guides != null) s.guides = guides;
    if (phase != null && Number.isFinite(phase)) s.phaseS = Math.min(60, Math.max(3, phase));
  };
  if (state) {
    apply(state.replayDesign, state.replayPalette, state.replayGapMode, state.replayGuides, state.replayPhaseS);
    if (state.replayCustom) s.custom = { ...s.custom, ...state.replayCustom };
  }
  if (query) {
    const g = query.get("guides");
    const ph = query.get("phase");
    apply(query.get("design"), query.get("palette"), query.get("gap"), g == null ? null : g === "1", ph == null ? null : Number(ph));
    for (const k of ["fondo", "acento", "acento2"] as const) {
      const q = query.get(k);
      if (q && HEX.test(`#${q}`)) s.custom[k] = `#${q}`;
    }
  }
  return s;
}
