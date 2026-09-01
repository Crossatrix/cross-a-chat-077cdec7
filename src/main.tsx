import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installServerErrorMonitor } from "@/utils/serverErrorMonitor";

// OneSignal handles push notification permissions; we still register the
// service worker ourselves so the media cache works for everyone.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// Watch every request to the database backend; redirect to /server-error on
// unexpected 4xx responses (see src/utils/serverErrorMonitor.ts).
installServerErrorMonitor();

createRoot(document.getElementById("root")!).render(<App />);
