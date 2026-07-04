import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

const EMOJI_KEY = "installed_mod_emojis";
const TEXTURE_KEY = "installed_mod_textures";
const MODS_KEY = "installed_mods";
const EVT = "mods-updated";

export interface InstalledMod {
  id: string;
  name: string;
  description?: string;
  emojis: string[]; // emoji names contributed
  textures: string[]; // texture paths contributed
}

export interface ModEmoji {
  name: string;
  dataUrl: string;
  modId: string;
}

export interface ModTexture {
  path: string; // e.g. src/assets/roles/admin.jpeg or just roles/admin.jpeg
  dataUrl: string;
  modId: string;
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, val: unknown) => {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event(EVT));
};

export const getInstalledMods = (): InstalledMod[] => read(MODS_KEY, []);
export const getModEmojis = (): ModEmoji[] => read(EMOJI_KEY, []);
export const getModTextures = (): ModTexture[] => read(TEXTURE_KEY, []);

export const onModsUpdated = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
};

/**
 * Given an original image URL (usually a bundled src/assets path),
 * return an overriding data URL if a mod texture matches, else the input.
 */
export const resolveTexture = (originalUrl: string): string => {
  if (!originalUrl) return originalUrl;
  const textures = getModTextures();
  if (!textures.length) return originalUrl;
  // Match by tail path segment (bundled assets get hashed filenames)
  for (const t of textures) {
    const normalized = t.path.replace(/^src\/assets\//, "").replace(/^\/+/, "");
    // Compare last segments (filename[.ext])
    const base = normalized.split("/").pop() || normalized;
    if (originalUrl.includes(normalized) || originalUrl.endsWith(base)) {
      return t.dataUrl;
    }
  }
  return originalUrl;
};

const fileToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
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

export const parseCcmod = async (file: Blob) => {
  const zip = await JSZip.loadAsync(file);
  const modJsonEntry = zip.file("mod.json");
  if (!modJsonEntry) throw new Error("mod.json missing from .ccmod");
  const meta = parseModJson(await modJsonEntry.async("string"));

  const emojis: { name: string; dataUrl: string }[] = [];
  const textures: { path: string; dataUrl: string }[] = [];

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const path = entry.name;
    if (path.startsWith("emojis/")) {
      const filename = path.slice("emojis/".length);
      if (!filename) continue;
      const name = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const blob = await entry.async("blob");
      emojis.push({ name, dataUrl: await fileToDataUrl(blob) });
    } else if (path.startsWith("textures/")) {
      const rel = path.slice("textures/".length);
      if (!rel) continue;
      const blob = await entry.async("blob");
      textures.push({ path: rel, dataUrl: await fileToDataUrl(blob) });
    }
  }

  return { meta, emojis, textures };
};

export const installMod = async (modId: string, file: Blob) => {
  const { meta, emojis, textures } = await parseCcmod(file);

  // Remove any prior install of this mod first
  await uninstallMod(modId, { silent: true });

  const existingEmojis = getModEmojis().filter((e) => e.modId !== modId);
  const existingTextures = getModTextures().filter((t) => t.modId !== modId);
  const existingMods = getInstalledMods().filter((m) => m.id !== modId);

  const newEmojis: ModEmoji[] = emojis.map((e) => ({ ...e, modId }));
  const newTextures: ModTexture[] = textures.map((t) => ({ ...t, modId }));

  // Later-installed emojis override earlier ones with the same name
  const emojiMap = new Map<string, ModEmoji>();
  [...existingEmojis, ...newEmojis].forEach((e) => emojiMap.set(e.name, e));

  const textureMap = new Map<string, ModTexture>();
  [...existingTextures, ...newTextures].forEach((t) => textureMap.set(t.path, t));

  write(EMOJI_KEY, Array.from(emojiMap.values()));
  write(TEXTURE_KEY, Array.from(textureMap.values()));
  write(MODS_KEY, [
    ...existingMods,
    {
      id: modId,
      name: meta.name,
      description: meta.description,
      emojis: newEmojis.map((e) => e.name),
      textures: newTextures.map((t) => t.path),
    },
  ]);

  return meta;
};

export const uninstallMod = async (modId: string, opts?: { silent?: boolean }) => {
  const mods = getInstalledMods().filter((m) => m.id !== modId);
  const emojis = getModEmojis().filter((e) => e.modId !== modId);
  const textures = getModTextures().filter((t) => t.modId !== modId);
  write(MODS_KEY, mods);
  write(EMOJI_KEY, emojis);
  write(TEXTURE_KEY, textures);
  if (opts?.silent) return;
};

/**
 * Download a mod file from the private storage bucket, then install it.
 */
export const downloadAndInstallMod = async (mod: { id: string; file_url: string }) => {
  const { data, error } = await supabase.storage.from("mods").download(mod.file_url);
  if (error || !data) throw error || new Error("Download failed");
  return installMod(mod.id, data);
};

export const uploadModFile = async (userId: string, file: File) => {
  // Validate it has mod.json
  const meta = await parseCcmod(file);
  const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("mods").upload(path, file, {
    contentType: "application/zip",
  });
  if (error) throw error;
  return { path, meta: meta.meta };
};
