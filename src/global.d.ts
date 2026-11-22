// global.d.ts
export {};

declare global {
  interface IfuelOverlayState {
    fuelVisible?: boolean;
    standingBattleVisible?: boolean;
    yellowVisible?: boolean;
    pitClearAirVisible?: boolean;
    standingsVisible?: boolean;
    driverVisible?: boolean;
    weatherVisible?: boolean;
    carVisible?: boolean;
    dashVisible?: boolean;
    widgetsLocked?: boolean;
    /** La ventana principal es ahora mismo un overlay transparente sobre el juego (lo calcula main). */
    overlayActive?: boolean;
    fuelSettingsVisible?: boolean;
    /** Nivel de detalle del widget de combustible en el overlay. */
    fuelDetail?: "compact" | "full";

    spotterEnabled?: boolean;
    spotterTones?: boolean;
    spotterVoice?: boolean;
    spotterAlerts?: boolean;
    spotterVolume?: number;
    spotterMuted?: string[];
    spotterVoiceName?: string;
    spotterTestNonce?: number;

    fuelScale?: number;
    relativeScale?: number;
    pitClearScale?: number;
    yellowScale?: number;
    standingsScale?: number;
    driverScale?: number;
    weatherScale?: number;
    carScale?: number;
    dashScale?: number;

    layoutMode?: "free" | "pitboard" | "replay"; // añade "replay"
    replayVisible?: boolean; // opcional, para saber si la ventana está abierta
  }

  interface IfuelOverlayAPI {
    onOverlayStateChanged(
      callback: (state: IfuelOverlayState) => void,
    ): () => void;
    setMouseCapture?(capture: boolean): void;
    updateState?(partial: Partial<IfuelOverlayState>): Promise<unknown>;
    getSpotterPhrases?(): Promise<unknown>;
    onSpotterPhrases?(callback: (phrases: unknown) => void): () => void;
    ibtList?(): Promise<{ dir: string; exists: boolean; files: { path: string; name: string; size: number; mtimeMs: number }[] }>;
    ibtPick?(): Promise<{ path: string; name: string } | null>;
    ibtAnalyze?(path: string): Promise<{ ok: boolean; result?: unknown; error?: string }>;
  }

  interface Window {
    ifuelOverlay: IfuelOverlayAPI;
  }
}
