import { supabase } from "@/integrations/supabase/client";

/**
 * Runtime UI auto-translation.
 *
 * The app only has a small hand written dictionary, so most screens stayed
 * English when switching language. This walks the rendered DOM, collects the
 * English texts and translates them with the ai-translate edge function.
 * Every result is cached in localStorage forever, so a phrase is translated
 * only once per device (keeps cloud usage minimal).
 */

const LANG_NAMES: Record<string, string> = { de: "German", en: "English" };
const cacheKey = (lang: string) => `cc_i18n_cache:${lang}`;

let dict: Record<string, string> = {};
let currentLang = "en";
let observer: MutationObserver | null = null;
let pending: Set<string> = new Set();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "IFRAME", "CANVAS"]);

const loadDict = (lang: string) => {
  try {
    dict = JSON.parse(localStorage.getItem(cacheKey(lang)) || "{}");
  } catch {
    dict = {};
  }
};

const saveDict = (lang: string) => {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(dict));
  } catch {
    /* quota */
  }
};

/** Should this string be sent to the translator? */
const isTranslatable = (s: string) => {
  const t = s.trim();
  if (t.length < 2 || t.length > 160) return false;
  if (!/[a-zA-Z]{2}/.test(t)) return false; // numbers, emojis, symbols
  if (/^[\d\s.,:%/+-]+$/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/^:[a-z0-9_]+:$/i.test(t)) return false; // custom emoji code
  return true;
};

const skipNode = (node: Node) => {
  let el: HTMLElement | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute?.("data-no-translate")) return true;
    if (el.getAttribute?.("translate") === "no") return true;
    el = el.parentElement;
  }
  return false;
};

type Target = { apply: (value: string) => void; original: string };

const collect = (root: ParentNode): Target[] => {
  const out: Target[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const text = n.nodeValue || "";
    if (!isTranslatable(text) || skipNode(n)) continue;
    const node = n as Text;
    const anyNode = node as Text & { __i18nSrc?: string };
    // Already translated by us and untouched since -> nothing to do.
    if (anyNode.__i18nSrc && node.nodeValue === dict[anyNode.__i18nSrc]) continue;
    const original = anyNode.__i18nSrc && dict[anyNode.__i18nSrc] ? anyNode.__i18nSrc : text.trim();
    out.push({
      original,
      apply: (value) => {
        anyNode.__i18nSrc = original;
        node.nodeValue = text.replace(text.trim(), value);
      },
    });
  }

  const attrEls = (root as Element).querySelectorAll?.("[placeholder],[aria-label],[title]") || [];
  attrEls.forEach((el) => {
    if (skipNode(el)) return;
    (["placeholder", "aria-label", "title"] as const).forEach((attr) => {
      const v = el.getAttribute(attr);
      if (!v || !isTranslatable(v)) return;
      const key = `__i18n_${attr}`;
      const stored = (el as any)[key] as string | undefined;
      if (stored && dict[stored] === v) return;
      const original = stored && dict[stored] ? stored : v.trim();
      out.push({
        original,
        apply: (value) => {
          (el as any)[key] = original;
          el.setAttribute(attr, value);
        },
      });
    });
  });

  return out;
};

const translateBatch = async (texts: string[], lang: string) => {
  const target = LANG_NAMES[lang] || lang;
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const { data, error } = await supabase.functions.invoke("ai-translate", {
    body: {
      text: numbered,
      target: `${target}. The input is a numbered list of UI strings. Return the SAME numbered list, one item per line, with each item translated. Keep numbering, keep placeholders like :name: and URLs unchanged, translate nothing else and add no extra lines`,
    },
  });
  if (error) throw error;
  const raw = String((data as any)?.translation || "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^(\d+)[.)]\s*(.+)$/);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    if (texts[idx] && m[2]) result[texts[idx]] = m[2];
  }
  return result;
};

const flush = async () => {
  if (inFlight || pending.size === 0 || currentLang === "en") return;
  inFlight = true;
  const lang = currentLang;
  const batch = Array.from(pending).slice(0, 40);
  batch.forEach((b) => pending.delete(b));
  try {
    const res = await translateBatch(batch, lang);
    if (lang !== currentLang) return;
    let changed = false;
    for (const [src, out] of Object.entries(res)) {
      if (out && out !== dict[src]) {
        dict[src] = out;
        changed = true;
      }
    }
    if (changed) {
      saveDict(lang);
      apply();
    }
  } catch {
    /* offline / AI down – keep English */
  } finally {
    inFlight = false;
    if (pending.size > 0) scheduleFlush();
  }
};

const scheduleFlush = () => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 400);
};

const apply = () => {
  if (currentLang === "en" || !document.body) return;
  const targets = collect(document.body);
  let queued = false;
  for (const t of targets) {
    const hit = dict[t.original];
    if (hit) t.apply(hit);
    else if (!pending.has(t.original)) {
      pending.add(t.original);
      queued = true;
    }
  }
  if (queued) scheduleFlush();
};

const scheduleScan = () => {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(apply, 200);
};

/** Start/refresh auto translation for the given language. */
export const startAutoTranslate = (lang: string) => {
  currentLang = lang;
  observer?.disconnect();
  observer = null;
  if (lang === "en") return;
  loadDict(lang);
  apply();
  observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
};

export const stopAutoTranslate = () => {
  currentLang = "en";
  observer?.disconnect();
  observer = null;
};
