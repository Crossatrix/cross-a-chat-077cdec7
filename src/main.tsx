import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installServerErrorMonitor } from "@/utils/serverErrorMonitor";

// OneSignal handles service worker and notification permissions via the SDK loaded in index.html

// Watch every request to the database backend; redirect to /server-error on
// unexpected 4xx responses (see src/utils/serverErrorMonitor.ts).
installServerErrorMonitor();

createRoot(document.getElementById("root")!).render(<App />);
