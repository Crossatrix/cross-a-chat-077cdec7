import JSZip from "jszip";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EMOJI_KEY = "installed_mod_emojis";
const TEXTURE_KEY = "installed_mod_textures";
const UI_KEY = "installed_mod_ui";
const SCRIPT_KEY = "installed_mod_scripts";
const TRIGGER_KEY = "installed_mod_triggers";
const TAB_KEY = "installed_mod_tabs";
const MODS_KEY = "installed_mods";
const DISABLED_KEY = "installed_mod_disabled";
const FONT_KEY = "installed_mod_fonts";
const EVT = "mods-updated";

export const SUPPORTED_EVENTS = [
  "login","reload","openedchat","openedsettings","openedcreatordashboard",
  "videotab","crossunity","posting","messagesend","usebetamenu","buy",
  "like","follow","dislike","unfollow","report","blockuser",
  "changegrouprole","joingroup","changesetting","watchvideo",
  // Newly added events
  "logout","leavegroup","unblockuser","comment","editpost","deletepost",
  "openedstore","openedadmin","uploadvideo","sendcroins",
] as const;
export type ModEventName = typeof SUPPORTED_EVENTS[number];

export interface InstalledMod {
  id: string;
  name: string;
  description?: string;
  emojis: string[];
  textures: string[];
  ui: string[];
  scripts: string[];
  triggers: number;
  tabs: string[];
  font: boolean;
  installed_at?: string;
}
export interface ModEmoji { name: string; dataUrl: string; modId: string; }
export interface ModTexture { path: string; dataUrl: string; modId: string; }
export interface ModUI { path: string; html: string; modId: string; }
export interface ModScript { path: string; code: string; lang: "js"|"ts"; modId: string; }
export interface ModTrigger { event: ModEventName; target: string; modId: string; }
export interface ModTab { id: string; name: string; ui: string; icon?: string; modId: string; }
export interface ModFont { dataUrl: string; format: string; modId: string; installedAt: number; }

const read = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
};
const write = (key: string, val: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  window.dispatchEvent(new Event(EVT));
};

export const getInstalledMods = (): InstalledMod[] => read(MODS_KEY, []);
const getDisabledIds = (): string[] => read<string[]>(DISABLED_KEY, []);
export const isModEnabled = (modId: string): boolean => !getDisabledIds().includes(modId);
export const setModEnabled = (modId: string, enabled: boolean) => {
  const disabled = new Set(getDisabledIds());
  if (enabled) disabled.delete(modId); else disabled.add(modId);
  write(DISABLED_KEY, Array.from(disabled));
  // Sync to account (best-effort)
  supabase.auth.getUser().then(({ data }) => {
    const uid = data.user?.id;
    if (!uid) return;
    (supabase as any)
      .from("user_installed_mods")
      .update({ enabled })
      .eq("user_id", uid)
      .eq("mod_id", modId);
  });
};
const enabledFilter = <T extends { modId: string }>(items: T[]): T[] => {
  const disabled = new Set(getDisabledIds());
  return items.filter(i => !disabled.has(i.modId));
};
export const getModEmojis = (): ModEmoji[] => enabledFilter(read<ModEmoji[]>(EMOJI_KEY, []));
export const getModTextures = (): ModTexture[] => enabledFilter(read<ModTexture[]>(TEXTURE_KEY, []));
export const getModUI = (): ModUI[] => enabledFilter(read<ModUI[]>(UI_KEY, []));
export const getModScripts = (): ModScript[] => enabledFilter(read<ModScript[]>(SCRIPT_KEY, []));
export const getModTriggers = (): ModTrigger[] => enabledFilter(read<ModTrigger[]>(TRIGGER_KEY, []));
export const getModTabs = (): ModTab[] => enabledFilter(read<ModTab[]>(TAB_KEY, []));
export const getModFonts = (): ModFont[] => enabledFilter(read<ModFont[]>(FONT_KEY, []));
/** The font that should actually be applied: the most recently installed enabled mod font. */
export const getActiveModFont = (): ModFont | null => {
  const fonts = getModFonts();
  if (!fonts.length) return null;
  return fonts.reduce((latest, f) => (f.installedAt > latest.installedAt ? f : latest), fonts[0]);
};

export const onModsUpdated = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
};

const stripExt = (p: string) => p.replace(/\.[^./]+$/, "");
const basename = (p: string) => (p.split("/").pop() || p);

/**
 * A mod's font.fnt is an actual font file (woff2/woff/ttf/otf) that's simply given a
 * .fnt extension so it's easy to spot at the root of the mod archive. Sniff the magic
 * bytes so we can tell the browser (@font-face `format()`) what it actually is.
 */
const sniffFontFormat = (bytes: Uint8Array): string => {
  const sig = (n: number) => Array.from(bytes.slice(0, n)).map(b => b.toString(16).padStart(2, "0")).join("");
  const s4 = sig(4);
  if (s4 === "774f4632") return "woff2"; // 'wOF2'
  if (s4 === "774f4646") return "woff";  // 'wOFF'
  if (s4 === "4f54544f") return "opentype"; // 'OTTO'
  if (s4 === "00010000" || s4 === "74727565") return "truetype"; // sfnt v1 or 'true'
  return "woff2"; // sensible default
};

/**
 * Resolve a bundled asset URL to an installed mod texture override if any.
 * Matches by:
 *  - path tail (with or without src/assets/ prefix)
 *  - basename with extension
 *  - basename without extension (handles Vite hashed filenames like admin-ABCD1234.png)
 */
export const resolveTexture = (originalUrl: string): string => {
  if (!originalUrl) return originalUrl;
  const textures = getModTextures();
  if (!textures.length) return originalUrl;
  const url = originalUrl.toLowerCase();
  for (const t of textures) {
    const rel = t.path.replace(/^src\/assets\//i, "").replace(/^\/+/, "").toLowerCase();
    const base = basename(rel);
    const baseNoExt = stripExt(base);
    if (url.includes(rel)) return t.dataUrl;
    if (url.includes(base)) return t.dataUrl;
    // Hashed asset: /assets/admin-XXXX.png -> basename without ext matches "admin"
    if (baseNoExt && new RegExp(`/${baseNoExt}(-[a-z0-9_-]+)?\\.[a-z0-9]+$`).test(url)) return t.dataUrl;
  }
  return originalUrl;
};

const fileToDataUrl = (blob: Blob): Promise<string> => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

const parseModJson = (raw: string): { name: string; description?: string } => {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    const merged = parsed.reduce((acc, cur) => ({ ...acc, ...cur }), {} as any);
    return { name: merged.name || "Unnamed mod", description: merged.description };
  }
  return { name: parsed.name || "Unnamed mod", description: parsed.description };
};

const parseTriggers = (raw: string): { event: ModEventName; target: string }[] => {
  const out: { event: ModEventName; target: string }[] = [];
  const re = /\[\s*event\s*:\s*([a-zA-Z]+)\s*;\s*run\s*\{\s*([^}]+?)\s*\}\s*\]/g;
  let m: RegExpExecArray | null;
  const allowed = new Set<string>(SUPPORTED_EVENTS as readonly string[]);
  while ((m = re.exec(raw)) !== null) {
    const ev = m[1].toLowerCase();
    if (allowed.has(ev)) out.push({ event: ev as ModEventName, target: m[2].trim() });
  }
  return out;
};

/**
 * Icon names mods may reference in tabs.json's `icon` field. Derived at runtime from
 * whatever lucide-react actually exports, so every icon in the installed version is
 * available and nothing can drift out of sync with the real package. Only PascalCase
 * exports are icons (lucide-react also exports helpers like `createLucideIcon`, `icons`,
 * and per-icon aliases ending in "Icon" which we skip to avoid listing every icon twice).
 */
export const MOD_TAB_ICON_NAMES: string[] = Object.keys(LucideIcons).filter(
  (k) => /^[A-Z]/.test(k) && !k.endsWith("Icon") && k !== "createLucideIcon" && k !== "icons"
);
export type ModTabIconName = string;
const MOD_TAB_ICON_SET = new Set<string>(MOD_TAB_ICON_NAMES);

const parseTabs = (raw: string, uiPaths: Set<string>): { id: string; name: string; ui: string; icon?: string }[] => {
  const out: { id: string; name: string; ui: string; icon?: string }[] = [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return out; }
  if (!Array.isArray(parsed)) return out;
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const { id, name, ui, icon } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !id.trim()) continue;
    if (typeof name !== "string" || !name.trim()) continue;
    if (typeof ui !== "string" || !ui.trim()) continue;
    const normalized = ui.replace(/^\.?\//, "").trim();
    if (!uiPaths.has(normalized.toLowerCase())) {
      console.warn("[mod tabs.json] ui file not found in mod:", ui);
      continue;
    }
    let iconName: string | undefined;
    if (typeof icon === "string" && icon.trim()) {
      if (MOD_TAB_ICON_SET.has(icon.trim())) iconName = icon.trim();
      else console.warn("[mod tabs.json] unknown icon, falling back to default:", icon);
    }
    out.push({ id: id.trim(), name: name.trim(), ui: normalized, ...(iconName ? { icon: iconName } : {}) });
  }
  return out;
};

export const parseCcmod = async (file: Blob) => {
  const zip = await JSZip.loadAsync(file);
  const modJsonEntry = zip.file("mod.json");
  if (!modJsonEntry) throw new Error("mod.json missing from .ccmod");
  const meta = parseModJson(await modJsonEntry.async("string"));

  const emojis: { name: string; dataUrl: string }[] = [];
  const textures: { path: string; dataUrl: string }[] = [];
  const ui: { path: string; html: string }[] = [];
  const scripts: { path: string; code: string; lang: "js"|"ts" }[] = [];
  let triggers: { event: ModEventName; target: string }[] = [];
  let tabsRaw: string | null = null;
  let font: { dataUrl: string; format: string } | null = null;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const path = entry.name;
    const lower = path.toLowerCase();
    if (lower.startsWith("emojis/")) {
      const fn = path.slice(7); if (!fn) continue;
      const name = fn.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      emojis.push({ name, dataUrl: await fileToDataUrl(await entry.async("blob")) });
    } else if (lower.startsWith("textures/")) {
      const rel = path.slice(9); if (!rel) continue;
      textures.push({ path: rel, dataUrl: await fileToDataUrl(await entry.async("blob")) });
    } else if (lower.startsWith("ui/") && lower.endsWith(".html")) {
      ui.push({ path, html: await entry.async("string") });
    } else if (lower.startsWith("scripts/") && (lower.endsWith(".js") || lower.endsWith(".ts"))) {
      scripts.push({ path, code: await entry.async("string"), lang: lower.endsWith(".ts") ? "ts" : "js" });
    } else if (lower === "event.cctrigger") {
      triggers = parseTriggers(await entry.async("string"));
    } else if (lower === "tabs.json") {
      tabsRaw = await entry.async("string");
    } else if (lower === "font.fnt") {
      const dataUrl = await fileToDataUrl(await entry.async("blob"));
      // font.fnt content is a font file (e.g. woff/woff2/ttf/otf) renamed with a .fnt extension;
      // sniff the magic bytes to pick a format @font-face will accept.
      const bytes = await entry.async("uint8array");
      font = { dataUrl, format: sniffFontFormat(bytes) };
    }
  }
  const uiPaths = new Set(ui.map((u) => u.path.toLowerCase()));
  const tabs = tabsRaw ? parseTabs(tabsRaw, uiPaths) : [];
  return { meta, emojis, textures, ui, scripts, triggers, tabs, font };
};

export const installMod = async (modId: string, file: Blob) => {
  const parsed = await parseCcmod(file);
  await uninstallMod(modId, { silent: true });

  const emojiMap = new Map<string, ModEmoji>();
  [...read<ModEmoji[]>(EMOJI_KEY, []), ...parsed.emojis.map(e => ({ ...e, modId }))].forEach(e => emojiMap.set(e.name, e));
  const textureMap = new Map<string, ModTexture>();
  [...read<ModTexture[]>(TEXTURE_KEY, []), ...parsed.textures.map(t => ({ ...t, modId }))].forEach(t => textureMap.set(t.path, t));

  write(EMOJI_KEY, Array.from(emojiMap.values()));
  write(TEXTURE_KEY, Array.from(textureMap.values()));
  write(UI_KEY, [...read<ModUI[]>(UI_KEY, []), ...parsed.ui.map(u => ({ ...u, modId }))]);
  write(SCRIPT_KEY, [...read<ModScript[]>(SCRIPT_KEY, []), ...parsed.scripts.map(s => ({ ...s, modId }))]);
  write(TRIGGER_KEY, [...read<ModTrigger[]>(TRIGGER_KEY, []), ...parsed.triggers.map(t => ({ ...t, modId }))]);
  write(TAB_KEY, [...read<ModTab[]>(TAB_KEY, []), ...parsed.tabs.map(t => ({ ...t, modId }))]);
  if (parsed.font) {
    const fonts = read<ModFont[]>(FONT_KEY, []).filter(f => f.modId !== modId);
    fonts.push({ ...parsed.font, modId, installedAt: Date.now() });
    write(FONT_KEY, fonts);
  }
  // Re-enable on (re)install
  write(DISABLED_KEY, getDisabledIds().filter(id => id !== modId));
  write(MODS_KEY, [
    ...getInstalledMods(),
    {
      id: modId,
      name: parsed.meta.name,
      description: parsed.meta.description,
      emojis: parsed.emojis.map(e => e.name),
      textures: parsed.textures.map(t => t.path),
      ui: parsed.ui.map(u => u.path),
      scripts: parsed.scripts.map(s => s.path),
      triggers: parsed.triggers.length,
      tabs: parsed.tabs.map(t => t.id),
      font: !!parsed.font,
      installed_at: new Date().toISOString(),
    },
  ]);
  return parsed.meta;
};

export const uninstallMod = async (modId: string, opts?: { silent?: boolean }) => {
  write(MODS_KEY, getInstalledMods().filter(m => m.id !== modId));
  write(EMOJI_KEY, read<ModEmoji[]>(EMOJI_KEY, []).filter(e => e.modId !== modId));
  write(TEXTURE_KEY, read<ModTexture[]>(TEXTURE_KEY, []).filter(t => t.modId !== modId));
  write(UI_KEY, read<ModUI[]>(UI_KEY, []).filter(u => u.modId !== modId));
  write(SCRIPT_KEY, read<ModScript[]>(SCRIPT_KEY, []).filter(s => s.modId !== modId));
  write(TRIGGER_KEY, read<ModTrigger[]>(TRIGGER_KEY, []).filter(t => t.modId !== modId));
  write(TAB_KEY, read<ModTab[]>(TAB_KEY, []).filter(t => t.modId !== modId));
  write(FONT_KEY, read<ModFont[]>(FONT_KEY, []).filter(f => f.modId !== modId));
  write(DISABLED_KEY, getDisabledIds().filter(id => id !== modId));
  if (opts?.silent) return;
  // Remove from account (best-effort)
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await (supabase as any)
        .from("user_installed_mods")
        .delete()
        .eq("user_id", uid)
        .eq("mod_id", modId);
    }
  } catch {}
};

export const downloadAndInstallMod = async (mod: { id: string; file_url: string }) => {
  const { data, error } = await supabase.storage.from("mods").download(mod.file_url);
  if (error || !data) throw error || new Error("Download failed");
  const meta = await installMod(mod.id, data);
  // Persist to account (best-effort)
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (uid) {
      await (supabase as any)
        .from("user_installed_mods")
        .upsert(
          { user_id: uid, mod_id: mod.id, enabled: true },
          { onConflict: "user_id,mod_id" }
        );
    }
  } catch {}
  return meta;
};

export const uploadModFile = async (userId: string, file: File) => {
  const parsed = await parseCcmod(file);
  const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("mods").upload(path, file, { contentType: "application/zip" });
  if (error) throw error;
  return { path, meta: parsed.meta };
};

/** Creator-only: replace an existing mod's file and bump updated_at. */
export const updateModFile = async (modId: string, userId: string, file: File) => {
  const parsed = await parseCcmod(file);
  const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await supabase.storage.from("mods").upload(path, file, { contentType: "application/zip" });
  if (upErr) throw upErr;
  const { error } = await (supabase as any)
    .from("mods")
    .update({ file_url: path, updated_at: new Date().toISOString() })
    .eq("id", modId)
    .eq("author_id", userId);
  if (error) throw error;
  return { path, meta: parsed.meta };
};

/**
 * Sync installed mods from the user's account. Downloads and installs any mods
 * the user has installed on other devices but that are missing locally, and
 * applies the enabled/disabled state from the account.
 */
export const syncInstalledModsFromAccount = async (userId: string) => {
  try {
    const { data: rows, error } = await (supabase as any)
      .from("user_installed_mods")
      .select("mod_id, enabled")
      .eq("user_id", userId);
    if (error || !rows) return;

    const localIds = new Set(getInstalledMods().map(m => m.id));
    const remoteIds = rows.map((r: any) => r.mod_id as string);
    const missing = remoteIds.filter((id: string) => !localIds.has(id));

    if (missing.length) {
      const { data: mods } = await (supabase as any)
        .from("mods")
        .select("id, file_url")
        .in("id", missing);
      for (const m of mods || []) {
        try {
          const { data: blob, error: dlErr } = await supabase.storage.from("mods").download(m.file_url);
          if (dlErr || !blob) continue;
          await installMod(m.id, blob);
        } catch (e) {
          console.warn("[mod sync] install failed", m.id, e);
        }
      }
    }

    // Apply enabled/disabled state from account
    const disabled = new Set(getDisabledIds());
    for (const r of rows as { mod_id: string; enabled: boolean }[]) {
      if (r.enabled) disabled.delete(r.mod_id);
      else disabled.add(r.mod_id);
    }
    write(DISABLED_KEY, Array.from(disabled));

    // Push any locally-installed-but-not-remote mods up to the account
    const remoteSet = new Set(remoteIds);
    const toUpload = getInstalledMods()
      .filter(m => !remoteSet.has(m.id))
      .map(m => ({ user_id: userId, mod_id: m.id, enabled: !getDisabledIds().includes(m.id) }));
    if (toUpload.length) {
      await (supabase as any)
        .from("user_installed_mods")
        .upsert(toUpload, { onConflict: "user_id,mod_id" });
    }
  } catch (e) {
    console.warn("[mod sync] failed", e);
  }
};
