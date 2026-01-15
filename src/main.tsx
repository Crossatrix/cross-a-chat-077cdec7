import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// OneSignal handles service worker and notification permissions via the SDK loaded in index.html

createRoot(document.getElementById("root")!).render(<App />);
