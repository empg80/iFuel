// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ReplayOverlayApp } from "./components/ReplayOverlayApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WidgetVisibilityProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/replay" element={<ReplayOverlayApp />} />
        </Routes>
      </HashRouter>
    </WidgetVisibilityProvider>
  </React.StrictMode>,
);
