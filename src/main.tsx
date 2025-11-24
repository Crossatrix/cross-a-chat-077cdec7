import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, requestNotificationPermission } from "./utils/notifications";

// Register service worker and request notification permission before app starts
registerServiceWorker();
requestNotificationPermission();

createRoot(document.getElementById("root")!).render(<App />);
