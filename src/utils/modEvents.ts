import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ModEventName,
  getModTriggers,
  getModUI,
  getModScripts,
  getModTabs,
  getInstalledMods as getInstalledModsList,
} from "./mods";

const UI_OPEN_EVT = "mod-ui-open";

export interface ModUIOpenDetail { html: string; title: string; modId: string; }

/** Very small "TS -> JS" transpile: strips ": type" annotations, `as X`, and interface/type decls. */
const stripTs = (code: string): string =>
  code
    .replace(/^\s*(interface|type)\s+\w+[^]*?\}\s*;?\s*$/gm, "")
    .replace(/\bas\s+[A-Za-z_$][\w$<>[\],\s|&]*/g, "")
    .replace(/(\)|\w)\s*:\s*[A-Za-z_$][\w$<>[\],\s|&.?]*(?=\s*[=,){;\]])/g, "$1")
    .replace(/<[A-Za-z_$][\w$,\s|&<>]*>(?=\()/g, "");

// Custom-event dispatcher used by mod.on / mod.emit for cross-mod communication.
type Listener = (payload: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

/** Build the `mod` API surface exposed to mod scripts and UI iframes. */
const buildModApi = (eventName: string, payload: unknown, modId: string) => {
  const currentUserId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };
  return {
    event: eventName,
    payload,
    modId,
    toast: (m: unknown) => toast(String(m)),
    log: (...a: unknown[]) => console.log(`[mod ${modId}]`, ...a),
    alert: (m: unknown) => window.alert(String(m)),

    // Auth / user helpers
    currentUser: currentUserId,
    async currentProfile() {
      const uid = await currentUserId();
      if (!uid) return null;
      const { data } = await (supabase as any)
        .from("profiles").select("*").eq("id", uid).maybeSingle();
      return data;
    },

    // Chat / messages — read messages a user has access to
    async readMessages(conversationId: string, limit = 50) {
      if (!conversationId) throw new Error("conversationId required");
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("id, conversation_id, user_id, content, created_at, updated_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 200));
      if (error) throw error;
      return (data || []).reverse();
    },
    async listConversations() {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id, conversations(*)")
        .eq("user_id", uid);
      return (data || []).map((r: any) => r.conversations).filter(Boolean);
    },
    async sendMessage(conversationId: string, content: string) {
      const uid = await currentUserId();
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({ conversation_id: conversationId, user_id: uid, content })
        .select().maybeSingle();
      if (error) throw error;
      return data;
    },

    // Storage helpers
    storage: {
      get: (k: string) => {
        try { return JSON.parse(localStorage.getItem(`mod:${modId}:${k}`) || "null"); }
        catch { return null; }
      },
      set: (k: string, v: unknown) => {
        try { localStorage.setItem(`mod:${modId}:${k}`, JSON.stringify(v)); } catch {}
      },
      del: (k: string) => { try { localStorage.removeItem(`mod:${modId}:${k}`); } catch {} },
    },

    // Cross-mod messaging
    on: (name: string, cb: Listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(cb);
      return () => listeners.get(name)?.delete(cb);
    },
    emit: (name: string, data?: unknown) => {
      listeners.get(name)?.forEach((cb) => { try { cb(data); } catch (e) { console.warn("[mod emit]", e); } });
    },

    // Open another UI file from this same mod
    openUI: (path: string, title?: string) => {
      const found = getModUI().find((u) => u.modId === modId && u.path.toLowerCase() === path.toLowerCase());
      if (found) openUI(found.html, title || path, modId);
      else console.warn("[mod openUI] not found:", path);
    },

    // Misc UI / browser helpers
    confirm: (m: unknown) => window.confirm(String(m)),
    prompt: (m: unknown, def?: string) => window.prompt(String(m), def),
    copy: async (text: string) => {
      try { await navigator.clipboard.writeText(text); return true; }
      catch { return false; }
    },
    navigate: (path: string) => { window.location.href = path; },
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    notify: (title: string, body?: string) => toast(title, { description: body }),

    // Croins / balance helpers
    async getBalance() {
      const uid = await currentUserId();
      if (!uid) return 0;
      const { getBalance: fetchBalance, getCrossatrixUserId } = await import("./croins");
      return fetchBalance(getCrossatrixUserId(uid));
    },

    // Posts feed helpers
    async listPosts(limit = 20) {
      const { data, error } = await (supabase as any)
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100));
      if (error) throw error;
      return data || [];
    },
    async likePost(postId: string) {
      const uid = await currentUserId();
      if (!uid) throw new Error("Not signed in");
      if (!postId) throw new Error("postId required");
      const { error } = await (supabase as any)
        .from("post_likes")
        .insert({ post_id: postId, user_id: uid });
      if (error) throw error;
      return true;
    },

    // Installed mods introspection (this mod only sees non-sensitive metadata)
    listInstalledMods: () =>
      getInstalledModsList().map((m) => ({ id: m.id, name: m.name, description: m.description })),
    listTabs: () => getModTabs().map((t) => ({ id: t.id, name: t.name })),

    // Escape hatches
    supabase,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => window.fetch(input, init),
  };
};

const runScript = async (
  code: string,
  lang: "js" | "ts",
  eventName: string,
  payload: unknown,
  modId: string,
) => {
  try {
    const src = lang === "ts" ? stripTs(code) : code;
    const api = buildModApi(eventName, payload, modId);
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    // eslint-disable-next-line no-new-func
    await new AsyncFunction("mod", src)(api);
  } catch (e) {
    console.error(`[mod ${modId} script error]`, e);
    toast.error(`Mod script error: ${(e as Error)?.message || e}`);
  }
};

const openUI = (html: string, title: string, modId: string) => {
  window.dispatchEvent(
    new CustomEvent<ModUIOpenDetail>(UI_OPEN_EVT, { detail: { html, title, modId } }),
  );
};

export const onModUIOpen = (cb: (d: ModUIOpenDetail) => void) => {
  const h = (e: Event) => cb((e as CustomEvent<ModUIOpenDetail>).detail);
  window.addEventListener(UI_OPEN_EVT, h);
  return () => window.removeEventListener(UI_OPEN_EVT, h);
};

/**
 * Bridge for UI iframes. UI HTML can postMessage a call like:
 *   window.parent.postMessage({ __mod: true, id: 1, method: "readMessages", args: ["<conv-id>"] }, "*")
 * We resolve via the same `mod.*` API and reply with { __mod: true, id, result | error }.
 */
if (typeof window !== "undefined" && !(window as any).__modBridgeInstalled) {
  (window as any).__modBridgeInstalled = true;
  window.addEventListener("message", async (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || typeof data !== "object" || !data.__mod) return;
    const { id, method, args, modId } = data as {
      id: number; method: string; args?: unknown[]; modId?: string;
    };
    const api: any = buildModApi("ui", null, modId || "ui");
    try {
      const fn = api[method];
      if (typeof fn !== "function") throw new Error(`Unknown method: ${method}`);
      const result = await fn.apply(api, Array.isArray(args) ? args : []);
      (ev.source as WindowProxy | null)?.postMessage(
        { __mod: true, id, result: JSON.parse(JSON.stringify(result ?? null)) }, "*",
      );
    } catch (e) {
      (ev.source as WindowProxy | null)?.postMessage(
        { __mod: true, id, error: (e as Error)?.message || String(e) }, "*",
      );
    }
  });
}

/** Injected into every mod UI iframe so HTML can call `mod.readMessages(...)` etc. via postMessage. */
export const buildModUIBridge = (modId: string) => `<script>
(function(){
  var _id = 0, _pending = {};
  window.addEventListener('message', function(ev){
    var d = ev.data; if (!d || !d.__mod || typeof d.id !== 'number') return;
    var p = _pending[d.id]; if (!p) return;
    delete _pending[d.id];
    if ('error' in d) p.reject(new Error(d.error)); else p.resolve(d.result);
  });
  function call(method){
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function(resolve, reject){
      var id = ++_id; _pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ __mod: true, id: id, method: method, args: args, modId: ${JSON.stringify("__PLACEHOLDER__")} }, '*');
    });
  }
  var methods = ['toast','log','alert','currentUser','currentProfile','readMessages',
    'listConversations','sendMessage','emit','openUI','confirm','prompt','copy','navigate',
    'sleep','notify','getBalance','listPosts','likePost','listInstalledMods','listTabs'];
  var mod = { modId: ${JSON.stringify("__PLACEHOLDER__")} };
  methods.forEach(function(m){ mod[m] = function(){ return call.apply(null, [m].concat([].slice.call(arguments))); }; });
  window.mod = mod;
})();
</script>`.replace(/"__PLACEHOLDER__"/g, JSON.stringify(modId));

export const injectModUIBridge = (html: string, modId: string): string => {
  const bridge = buildModUIBridge(modId);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, bridge + "</head>");
  return bridge + html;
};

export const emitModEvent = (event: ModEventName, payload?: unknown) => {
  // Always fetch fresh — installs/uninstalls invalidate the cache and races are avoided.
  const triggers = getModTriggers();
  const matches = triggers.filter((t) => t.event === event);
  if (!matches.length) return;
  const ui = getModUI();
  const scripts = getModScripts();
  for (const t of matches) {
    const target = t.target.replace(/^\.?\//, "").trim();
    const matchUI = ui.find(
      (u) => u.modId === t.modId && u.path.toLowerCase() === target.toLowerCase(),
    );
    if (matchUI) { openUI(matchUI.html, target, t.modId); continue; }
    const matchScript = scripts.find(
      (s) => s.modId === t.modId && s.path.toLowerCase() === target.toLowerCase(),
    );
    if (matchScript) {
      void runScript(matchScript.code, matchScript.lang, event, payload, t.modId);
      continue;
    }
    console.warn("[mod trigger] target not found:", t.target, "(mod:", t.modId, ")");
  }
};
