// App.tsx
import React from "react";
import { useIfuelWebSocket } from "./useIfuelWebSocket";
import { useOverlayState } from "./contexts/useOverlayState";
import { useApplyPitBoardLayout } from "./contexts/useApplyPitBoardLayout";
import { useSpotter } from "./spotter/useSpotter";
import { useClickableControls } from "./contexts/useClickableControls";
import { FreeLayout } from "./FreeLayout";
import { PitboardLayout } from "./PitboardLayout";
import { ReplayNotice } from "./ReplayNotice";

const App: React.FC = () => {
  const { state, isConnected, sendMessage, serverStatus, raceStandingsRows } =
    useIfuelWebSocket("ws://127.0.0.1:7071/ifuel");

  const { layoutMode } = useOverlayState();
  const mode = layoutMode ?? "free";

  useApplyPitBoardLayout();
  useClickableControls();
  useSpotter(state);

  // En modo replay la retransmisión vive en su propia ventana: esta solo muestra el aviso (sin widgets del layout
  // libre, que con una ventana pequeña se recolocarían y estropearían las posiciones guardadas).
  if (mode === "replay") return <ReplayNotice />;

  // Fallback mientras no haya estado de telemetría
  if (!state) {
    return (
      <div style={{ color: "white", padding: 16 }}>
        iFuel cargado – esperando datos de telemetría…
        <br />
        Estado servidor: {serverStatus}
      </div>
    );
  }

  if (mode === "pitboard") {
    return (
      <PitboardLayout
        state={state}
        raceStandingsRows={raceStandingsRows}
        isConnected={isConnected}
        sendMessage={sendMessage}
      />
    );
  }

  return (
    <FreeLayout
      state={state}
      raceStandingsRows={raceStandingsRows}
      isConnected={isConnected}
      sendMessage={sendMessage}
      serverStatus={serverStatus}
      layoutMode={mode}
    />
  );
};

export default App;
