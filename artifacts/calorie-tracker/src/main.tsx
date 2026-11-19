import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// Service worker de la PWA (solo existe en el build de producción; en
// desarrollo virtual:pwa-register no hace nada). Con registerType
// "autoUpdate" las versiones nuevas se activan solas.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
