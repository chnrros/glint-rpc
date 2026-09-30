import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installFilmGrain } from "./lib/grain";
import "./index.css";

installFilmGrain();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
