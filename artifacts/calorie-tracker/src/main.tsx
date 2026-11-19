import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// PWA service worker (it only exists in the production build; in development
// virtual:pwa-register does nothing). With registerType "autoUpdate" new
// versions activate on their own.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
