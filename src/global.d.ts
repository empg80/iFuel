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
    /** La ventana principal es ahora mismo un overlay transparente sobre el juego (lo calcula main). */
    overlayActive?: boolean;
    fuelSettingsVisible?: boolean;

    fuelScale?: number;
    relativeScale?: number;
    pitClearScale?: number;
    yellowScale?: number;
    standingsScale?: number;

    layoutMode?: "free" | "pitboard" | "replay"; // añade "replay"
    replayVisible?: boolean; // opcional, para saber si la ventana está abierta
  }

  interface IfuelOverlayAPI {
    onOverlayStateChanged(
      callback: (state: IfuelOverlayState) => void,
    ): () => void;
  }

  interface Window {
    ifuelOverlay: IfuelOverlayAPI;
  }
}
