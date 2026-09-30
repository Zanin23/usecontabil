import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import { instalarSonsUI } from "./lib/uiSound";
import { aplicarPreferencias } from "./lib/preferencias";
import { instalarGuardaDeCota } from "./lib/armazenamento";

instalarSonsUI();
aplicarPreferencias();
instalarGuardaDeCota();

createRoot(document.getElementById("root")!).render(<App />);

