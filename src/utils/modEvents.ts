import { toast } from "sonner";
import {
  ModEventName,
  getModTriggers,
  getModUI,
  getModScripts,
  onModsUpdated,
} from "./mods";

const UI_OPEN_EVT = "mod-ui-open";

export interface ModUIOpenDetail { html: string; title: string; }

/** Very small "TS -> JS" transpile: strips ": type" annotations, `as X`, and interface/type decls. */
const stripTs = (code: string): string =>
  code
    .replace(/^\s*(interface|type)\s+\w+[^]*?\}\s*;?\s*$/gm, "")
    .replace(/\bas\s+[A-Za-z_$][\w$<>[\],\s|&]*/g, "")
    .replace(/(\)|\w)\s*:\s*[A-Za-z_$][\w$<>[\],\s|&.?]*(?=\s*[=,){;\]])/g, "$1")
    .replace(/<[A-Za-z_$][\w$,\s|&<>]*>(?=\()/g, "");

const runScript = (code: string, lang: "js"|"ts", eventName: string, payload: any) => {
  try {
    const src = lang === "ts" ? stripTs(code) : code;
    const api = {
      toast: (m: string) => toast(String(m)),
      log: (...a: unknown[]) => console.log("[mod]", ...a),
      event: eventName,
      payload,
    };
    // eslint-disable-next-line no-new-func
    new Function("mod", src)(api);
  } catch (e) {
    console.warn("[mod script error]", e);
  }
};

const openUI = (html: string, title: string) => {
  window.dispatchEvent(new CustomEvent<ModUIOpenDetail>(UI_OPEN_EVT, { detail: { html, title } }));
};

export const onModUIOpen = (cb: (d: ModUIOpenDetail) => void) => {
  const h = (e: Event) => cb((e as CustomEvent<ModUIOpenDetail>).detail);
  window.addEventListener(UI_OPEN_EVT, h);
  return () => window.removeEventListener(UI_OPEN_EVT, h);
};

let triggerCache = getModTriggers();
onModsUpdated(() => { triggerCache = getModTriggers(); });

export const emitModEvent = (event: ModEventName, payload?: unknown) => {
  const matches = triggerCache.filter(t => t.event === event);
  if (!matches.length) return;
  const ui = getModUI();
  const scripts = getModScripts();
  for (const t of matches) {
    const target = t.target.replace(/^\.?\//, "");
    const matchUI = ui.find(u => u.path.toLowerCase() === target.toLowerCase() && u.modId === t.modId);
    if (matchUI) { openUI(matchUI.html, target); continue; }
    const matchScript = scripts.find(s => s.path.toLowerCase() === target.toLowerCase() && s.modId === t.modId);
    if (matchScript) { runScript(matchScript.code, matchScript.lang, event, payload); continue; }
    console.warn("[mod trigger] target not found:", t.target);
  }
};
