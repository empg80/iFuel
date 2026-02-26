import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WidgetVisibilityProvider>
      <App />
    </WidgetVisibilityProvider>
  </React.StrictMode>,
);
