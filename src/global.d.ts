// src/global.d.ts
export {};

declare global {
  interface IfuelOverlayAPI {
    onOverlayStateChanged: (
      callback: (state: {
        fuelVisible?: boolean;
        standingBattleVisible?: boolean;
        yellowVisible?: boolean;
        pitClearAirVisible?: boolean;
        widgetsLocked?: boolean;
      }) => void,
    ) => void;
  }

  interface Window {
    ifuelOverlay?: IfuelOverlayAPI;
  }
}
