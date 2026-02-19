import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css"; // o el css global que tengas

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
