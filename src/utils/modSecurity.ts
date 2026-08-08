import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

/** 1 = Safe … 5 = High Risk */
export type SecurityLevel = 1 | 2 | 3 | 4 | 5;

export interface SecurityFinding {
  file: string;
  rule: string;
  detail: string;
  score: number;
}

export interface SecurityReport {
  level: SecurityLevel;
  findings: SecurityFinding[];
  scannedFiles: number;
}

export const SECURITY_LEVELS: Record<SecurityLevel, { label: string; className: string }> = {
  1: { label: "Safe", className: "bg-emerald-500/20 text-emerald-400" },
  2: { label: "Likely Safe", className: "bg-lime-500/20 text-lime-400" },
  3: { label: "Low Risk", className: "bg-amber-500/20 text-amber-400" },
  4: { label: "Risky", className: "bg-orange-500/20 text-orange-400" },
  5: { label: "High Risk", className: "bg-destructive/20 text-destructive" },
};

export const levelLabel = (lvl: number | null | undefined) =>
  lvl && SECURITY_LEVELS[lvl as SecurityLevel] ? SECURITY_LEVELS[lvl as SecurityLevel].label : "Unrated";

export const levelClass = (lvl: number | null | undefined) =>
  lvl && SECURITY_LEVELS[lvl as SecurityLevel]
    ? SECURITY_LEVELS[lvl as SecurityLevel].className
    : "bg-muted text-muted-foreground";

interface Rule { rule: string; detail: string; score: number; test: RegExp }

const RULES: Rule[] = [
  // Device / app crashing
  { rule: "infinite-loop", detail: "Endless loop that can freeze the device", score: 5, test: /while\s*\(\s*(true|1)\s*\)|for\s*\(\s*;\s*;\s*\)/ },
  { rule: "reload-loop", detail: "Forces page reloads / navigation", score: 4, test: /location\s*\.\s*(reload|replace|assign|href\s*=)/ },
  { rule: "storage-wipe", detail: "Clears local storage (can break Cross Chat)", score: 4, test: /(localStorage|sessionStorage)\s*\.\s*clear\s*\(|indexedDB\s*\.\s*deleteDatabase/ },
  { rule: "storage-key-removal", detail: "Deletes app storage keys", score: 3, test: /(localStorage|sessionStorage)\s*\.\s*removeItem/ },
  { rule: "memory-bomb", detail: "Allocates huge arrays/strings (memory exhaustion)", score: 4, test: /new\s+Array\s*\(\s*\d{7,}|\.repeat\s*\(\s*\d{7,}/ },
  { rule: "runaway-timer", detail: "Timer/interval with near-zero delay", score: 3, test: /set(Interval|Timeout)\s*\([^,]+,\s*[0-5]\s*\)/ },
  { rule: "worker-spawn", detail: "Spawns Workers", score: 3, test: /new\s+(Worker|SharedWorker)\s*\(/ },
  // Code injection / execution
  { rule: "eval", detail: "Uses eval() or Function() to run generated code", score: 4, test: /\beval\s*\(|new\s+Function\s*\(/ },
  { rule: "dynamic-import", detail: "Loads remote code at runtime", score: 4, test: /import\s*\(\s*['"`]https?:/ },
  { rule: "remote-script", detail: "Injects an external <script>", score: 4, test: /<script[^>]+src\s*=\s*['"]?https?:/i },
  { rule: "document-write", detail: "Uses document.write / innerHTML injection", score: 2, test: /document\s*\.\s*write\s*\(|innerHTML\s*=/ },
  // Data exfiltration / credential theft
  { rule: "token-access", detail: "Reads auth tokens or session data", score: 5, test: /sb-[a-z0-9]+-auth-token|access_token|refresh_token|service_role/i },
  { rule: "cookie-access", detail: "Reads or writes cookies", score: 3, test: /document\s*\.\s*cookie/ },
  { rule: "network-exfil", detail: "Sends data to an external server", score: 3, test: /(fetch|XMLHttpRequest|sendBeacon)\s*\(?\s*['"`]?https?:\/\//i },
  { rule: "websocket", detail: "Opens an external WebSocket connection", score: 3, test: /new\s+WebSocket\s*\(/ },
  { rule: "keylogger", detail: "Listens to global keyboard input", score: 4, test: /addEventListener\s*\(\s*['"`]key(down|press|up)['"`]/ },
  { rule: "clipboard", detail: "Reads the clipboard", score: 3, test: /navigator\s*\.\s*clipboard\s*\.\s*read/ },
  { rule: "media-capture", detail: "Requests camera / microphone / screen", score: 4, test: /getUserMedia|getDisplayMedia/ },
  { rule: "geolocation", detail: "Requests geolocation", score: 2, test: /navigator\s*\.\s*geolocation/ },
  // App abuse
  { rule: "supabase-direct", detail: "Talks to the backend directly", score: 3, test: /supabase\.co\/(rest|auth|storage)\/v1/i },
  { rule: "delete-request", detail: "Performs delete/destructive backend calls", score: 3, test: /method\s*:\s*['"`]DELETE['"`]/i },
  { rule: "obfuscation", detail: "Obfuscated or encoded code", score: 3, test: /atob\s*\(|\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}|fromCharCode\s*\(/i },
  { rule: "long-line", detail: "Extremely long minified/packed line", score: 2, test: /[^\n]{3000,}/ },
  { rule: "popup-spam", detail: "Opens windows or blocking dialogs", score: 2, test: /window\s*\.\s*open\s*\(|\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/ },
  { rule: "iframe-inject", detail: "Injects iframes", score: 2, test: /<iframe|createElement\s*\(\s*['"`]iframe/i },
  { rule: "history-hijack", detail: "Manipulates browser history", score: 2, test: /history\s*\.\s*(pushState|replaceState|go)\s*\(/ },
];

const SCAN_EXT = /\.(html?|js|ts|jsx|tsx|mjs|cjs)$/i;

const scoreToLevel = (total: number, max: number): SecurityLevel => {
  if (max >= 5 || total >= 12) return 5;
  if (max >= 4 || total >= 8) return 4;
  if (max >= 3 || total >= 4) return 3;
  if (total > 0) return 2;
  return 1;
};

export const scanModArchive = async (file: Blob): Promise<SecurityReport> => {
  const zip = await JSZip.loadAsync(file);
  const findings: SecurityFinding[] = [];
  let scannedFiles = 0;

  const entries = Object.values(zip.files).filter((f: any) => !f.dir && SCAN_EXT.test(f.name));
  for (const entry of entries as any[]) {
    let code = "";
    try { code = await entry.async("string"); } catch { continue; }
    scannedFiles++;
    for (const r of RULES) {
      if (r.test.test(code)) {
        findings.push({ file: entry.name, rule: r.rule, detail: r.detail, score: r.score });
      }
    }
  }

  const total = findings.reduce((s, f) => s + f.score, 0);
  const max = findings.reduce((s, f) => Math.max(s, f.score), 0);
  return { level: scoreToLevel(total, max), findings, scannedFiles };
};

/** Scan a stored mod file and persist its rating. */
export const rescanMod = async (modId: string, fileUrl: string): Promise<SecurityReport> => {
  const { data, error } = await supabase.storage.from("mods").download(fileUrl);
  if (error || !data) throw error || new Error("Could not download mod file");
  const report = await scanModArchive(data);
  const { error: upErr } = await (supabase as any)
    .from("mods")
    .update({
      security_level: report.level,
      security_findings: report.findings,
      security_scanned_at: new Date().toISOString(),
      security_set_by: null,
    })
    .eq("id", modId);
  if (upErr) throw upErr;
  return report;
};
