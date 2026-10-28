// src/main.tsx
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import "./styles/overlay-theme.css";
import "./styles/replay-theme.css";
import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ReplayOverlayApp } from "./components/ReplayOverlayApp";

// Vista previa con datos simulados: solo existe en builds con VITE_PREVIEW=1 (no va en el instalador)
const PreviewPage = import.meta.env.VITE_PREVIEW
  ? lazy(() => import("./preview/PreviewPage"))
  : null;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WidgetVisibilityProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/replay" element={<ReplayOverlayApp />} />
          {PreviewPage && (
            <Route
              path="/preview"
              element={
                <Suspense fallback={null}>
                  <PreviewPage />
                </Suspense>
              }
            />
          )}
        </Routes>
      </HashRouter>
    </WidgetVisibilityProvider>
  </React.StrictMode>,
);
