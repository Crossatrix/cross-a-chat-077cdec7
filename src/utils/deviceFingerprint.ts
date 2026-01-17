// Simple device fingerprint generator
export const generateDeviceFingerprint = (): string => {
  const components: string[] = [];

  // Screen info
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // User agent (simplified)
  const ua = navigator.userAgent;
  components.push(ua);

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Cross Chat Device", 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch (e) {
    components.push("no-canvas");
  }

  // Hash all components
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
};

// Get or create a persistent device ID stored in localStorage
export const getDeviceId = (): string => {
  const storageKey = "cc_device_id";
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = generateDeviceFingerprint() + "_" + Date.now().toString(36);
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
};
