// global.d.ts
export {};

declare global {
  interface IfuelOverlayState {
    fuelVisible?: boolean;
    standingBattleVisible?: boolean;
    yellowVisible?: boolean;
    pitClearAirVisible?: boolean;
    widgetsLocked?: boolean;
    fuelSettingsVisible?: boolean;

    fuelScale?: number;
    relativeScale?: number;
    pitClearScale?: number;
    yellowScale?: number;
  }

  interface IfuelOverlayAPI {
    onOverlayStateChanged(
      callback: (state: IfuelOverlayState) => void,
    ): () => void;
  }

  interface Window {
    ifuelOverlay?: IfuelOverlayAPI;
  }
}
