// global.d.ts
export {};

declare global {
  interface IfuelOverlayState {
    fuelVisible?: boolean;
    standingBattleVisible?: boolean;
    yellowVisible?: boolean;
    pitClearAirVisible?: boolean;
    standingsVisible?: boolean;
    widgetsLocked?: boolean;
    fuelSettingsVisible?: boolean;

    fuelScale?: number;
    relativeScale?: number;
    pitClearScale?: number;
    yellowScale?: number;
    standingsScale?: number;

    layoutMode?: "free" | "pitboard";
  }

  interface IfuelOverlayAPI {
    onOverlayStateChanged(
      callback: (state: IfuelOverlayState) => void,
    ): () => void;
  }

  interface Window {
    ifuelOverlay: IfuelOverlayAPI; // aquí mejor sin "?" dado tu preload
  }
}
