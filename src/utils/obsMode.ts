// N3: la misma app abierta desde OBS (fuente de navegador) en http://127.0.0.1:7071/#/obs/<widget>
export const OBS_WIDGETS = ["fuel", "relative", "standings", "pitclear", "yellow", "driver", "weather", "car", "traffic", "pithelper", "dash"] as const;
export type ObsWidget = (typeof OBS_WIDGETS)[number];

export function obsWidgetFromHash(hash: string): ObsWidget | null {
  const m = /^#\/obs\/([a-z]+)\/?$/.exec(hash);
  return m && (OBS_WIDGETS as readonly string[]).includes(m[1]) ? (m[1] as ObsWidget) : null;
}

export const isObsMode = (): boolean => typeof location !== "undefined" && obsWidgetFromHash(location.hash) != null;
