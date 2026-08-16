import { useEffect } from "react";
import { getActiveModFont, onModsUpdated } from "@/utils/mods";

const STYLE_ID = "mod-font-style";
const FONT_FAMILY = "ModFont";

/**
 * Applies the active mod font (font.fnt at the root of an installed .ccmod) globally
 * via a @font-face + CSS variable on :root. If multiple installed mods ship a font,
 * whichever was installed most recently wins. Uninstalling/disabling that mod falls
 * back to the next-most-recently-installed mod font, or the default app font if none
 * remain.
 */
const ModFontHost = () => {
  useEffect(() => {
    const apply = () => {
      const font = getActiveModFont();
      let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

      if (!font) {
        if (styleEl) styleEl.remove();
        document.documentElement.style.removeProperty("--mod-font-family");
        return;
      }

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        @font-face {
          font-family: "${FONT_FAMILY}";
          src: url("${font.dataUrl}") format("${font.format}");
          font-display: swap;
        }
      `;
      document.documentElement.style.setProperty("--mod-font-family", `"${FONT_FAMILY}"`);
    };

    apply();
    return onModsUpdated(apply);
  }, []);

  return null;
};

export default ModFontHost;
