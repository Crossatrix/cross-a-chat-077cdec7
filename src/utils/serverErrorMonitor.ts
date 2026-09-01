/**
 * Global monitor that watches every network request made to the Supabase
 * backend. If a request comes back with a 4xx status, the user is
 * immediately redirected to /server-error with the exact error details
 * (endpoint, status, and response body) — except for the specific case of
 * a 401 "Invalid credentials" response, which is a normal/expected part of
 * the login flow and should be handled inline by the calling page instead.
 *
 * API keys / tokens are stripped out before anything is stored or shown.
 */

const SESSION_KEY = "server-error-details";

// Matches the anon/publishable key and any other apikey-looking query params
const SENSITIVE_QUERY_PARAMS = ["apikey", "key", "token", "access_token", "refresh_token"];

export interface ServerErrorDetails {
  url: string;
  method: string;
  status: number;
  statusText: string;
  body: string;
  timestamp: string;
}

/** Remove API keys / tokens / auth headers from a URL before we store or display it. */
function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, window.location.origin);
    SENSITIVE_QUERY_PARAMS.forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, "[REDACTED]");
      }
    });
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/** Best-effort redaction of anything that looks like a key/token inside a response body. */
function sanitizeBody(rawBody: string): string {
  if (!rawBody) return rawBody;
  return rawBody
    // JWTs (three base64url segments separated by dots)
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[REDACTED_TOKEN]")
    // "apikey": "...", "key": "...", "token": "...", etc.
    .replace(/("(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|token|key)"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
}

/** Is this request going to our Supabase backend? */
function isSupabaseRequest(url: string): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return false;
  try {
    return new URL(url, window.location.origin).origin === new URL(supabaseUrl).origin;
  } catch {
    return false;
  }
}

/** The one exception: a 401 with this exact body is expected (bad login) and should NOT redirect. */
function isExpectedInvalidCredentials(status: number, parsedBody: unknown): boolean {
  if (status !== 401) return false;
  if (
    parsedBody &&
    typeof parsedBody === "object" &&
    "error" in (parsedBody as Record<string, unknown>) &&
    (parsedBody as Record<string, unknown>).error === "Invalid credentials"
  ) {
    return true;
  }
  return false;
}

function goToServerError(details: ServerErrorDetails) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(details));
  } catch {
    // sessionStorage unavailable (e.g. private mode) — navigate anyway,
    // the /server-error page will just show a generic message.
  }
  if (window.location.pathname !== "/server-error") {
    window.location.assign("/server-error");
  }
}

export function getStoredServerErrorDetails(): ServerErrorDetails | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ServerErrorDetails;
  } catch {
    return null;
  }
}

export function clearStoredServerErrorDetails() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

let installed = false;

/** Patch window.fetch once, globally, to inspect every Supabase response. */
export function installServerErrorMonitor() {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();

    const response = await originalFetch(...args);

    if (!isSupabaseRequest(requestUrl) || response.status < 400 || response.status >= 500) {
      return response;
    }

    // Clone so the original caller can still read the body as usual.
    const clone = response.clone();
    let bodyText = "";
    try {
      bodyText = await clone.text();
    } catch {
      bodyText = "";
    }

    let parsedBody: unknown = null;
    try {
      parsedBody = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsedBody = null;
    }

    if (isExpectedInvalidCredentials(response.status, parsedBody)) {
      return response;
    }

    goToServerError({
      url: sanitizeUrl(requestUrl),
      method,
      status: response.status,
      statusText: response.statusText,
      body: sanitizeBody(bodyText).slice(0, 4000),
      timestamp: new Date().toISOString(),
    });

    return response;
  };
}
