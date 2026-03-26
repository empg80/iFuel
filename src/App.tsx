// App.tsx
import React from "react";
import { useIfuelWebSocket } from "./useIfuelWebSocket";
import { useOverlayState } from "./contexts/useOverlayState";
import { useApplyPitBoardLayout } from "./contexts/useApplyPitBoardLayout";
import { FreeLayout } from "./FreeLayout";
import { PitboardLayout } from "./PitboardLayout";

const App: React.FC = () => {
  const { state, isConnected, sendMessage, serverStatus } = useIfuelWebSocket(
    "ws://127.0.0.1:7071/ifuel",
  );

  const { layoutMode } = useOverlayState();
  const mode = layoutMode ?? "free";

  useApplyPitBoardLayout();

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
        isConnected={isConnected}
        sendMessage={sendMessage}
      />
    );
  }

  return (
    <FreeLayout
      state={state}
      isConnected={isConnected}
      sendMessage={sendMessage}
      serverStatus={serverStatus}
      layoutMode={mode}
    />
  );
};

export default App;
