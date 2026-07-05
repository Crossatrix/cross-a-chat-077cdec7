
## 1. Fix texture override bug

**Root cause:** `resolveTexture()` is only called in a couple of places. `StaffBadge.tsx` (and every other image in the app) imports assets directly (`import adminIcon from "@/assets/roles/admin.png"`) and uses the resulting hashed URL in `<img src={...}>` without ever passing it through `resolveTexture`. That's why installing a `textures/roles/admin.jpeg` mod does nothing visible.

**Fix approach:**
- Wire `resolveTexture` into every user-visible `<img src={...}>` that renders a bundled `src/assets/*` import. Concretely: `StaffBadge.tsx` (role + pro badges), `CreatorBadge.tsx`, `FeaturedAvatar.tsx` rings, `LoadingScreen.tsx`, plus any other place that imports from `@/assets/`.
- Create a tiny `<ModImg>` wrapper (`src/components/ModImg.tsx`) that renders `<img>` and subscribes to `onModsUpdated` so installed/uninstalled mods re-render live.
- Improve `resolveTexture` matching: bundler produces `/assets/admin-<hash>.png`, so match by stripped basename (name without extension + hash) as well as full path tail. Also try both with/without `src/assets/` prefix, and match against both the mod path extension and any extension (so `admin.jpeg` overrides `admin.png`).
- Make `getModTextures` build a lookup once per event, cached, keyed by basename-without-ext.

## 2. Extend `.ccmod` with UI, scripts and events

### New zip layout
```text
mod.json
emojis/…              (existing)
textures/…            (existing)
UI/…                  html files, e.g. UI/panel.html
scripts/…             .js or .ts files (ts is transpiled naively — see below)
event.cctrigger       plain-text trigger file at zip root
```

### `event.cctrigger` format
Line-based, one trigger per line, matching the user's spec:
```text
[event: login; run{UI/panel.html}]
[event: watchvideo; run{scripts/onWatch.ts}]
```
Parser: regex `\[event:\s*(\w+);\s*run\{([^}]+)\}\]`. Supported events (exact whitelist, ignore unknown):
`login, reload, openedchat, openedsettings, openedcreatordashboard, videotab, crossunity, posting, messagesend, usebetamenu, buy, like, follow, dislike, unfollow, report, blockuser, changegrouprole, joingroup, changesetting, watchvideo`.

### Install-time changes (`src/utils/mods.ts`)
- Extend `parseCcmod` to also collect:
  - `ui: { path, html }[]` from `UI/*.html` (read as text)
  - `scripts: { path, code, lang: 'js'|'ts' }[]` from `scripts/*.{js,ts}` (read as text)
  - `triggers: { event, target }[]` from `event.cctrigger`
- Store them in localStorage keys: `installed_mod_ui`, `installed_mod_scripts`, `installed_mod_triggers` (tagged with `modId`).
- Extend `InstalledMod` interface with `ui`, `scripts`, `triggers` counts.

### Runtime event bus (`src/utils/modEvents.ts` — new)
- `emitModEvent(name, payload?)` — global dispatcher.
- On boot (in `App.tsx` or `main.tsx`), initialise a listener that:
  - Reads `installed_mod_triggers`
  - For each matching trigger, resolves target:
    - `.html` → open in a dialog (`ModUIDialog`, single instance, iframe with `srcdoc` sandboxed `allow-scripts`)
    - `.js` → run in a `Function()` sandbox with a small `mod` API (`{ toast, event, log }`)
    - `.ts` → strip type annotations with a lightweight regex (best-effort — document that only basic TS is supported), then run as JS
- Re-subscribes when `onModsUpdated` fires.

### Emitting events across the app
Add `emitModEvent` calls at the relevant call sites:
| Event | Call site |
|---|---|
| `login` | after successful sign-in in `Auth.tsx` |
| `reload` | in `main.tsx` on load |
| `openedchat` | when a conversation becomes active (`Index.tsx`) |
| `openedsettings` | `Settings.tsx` mount |
| `openedcreatordashboard` | `CreatorDashboard.tsx` mount |
| `videotab` | tab switch to Video in `Index.tsx` |
| `crossunity` | `CrossunityFeed.tsx` mount |
| `posting` | successful post in `CreatePostDialog.tsx` |
| `messagesend` | `MessageInput.tsx` after send |
| `usebetamenu` | `BetaDialog.tsx` open |
| `buy` | `Store.tsx` purchase success |
| `like` / `dislike` | video/post/music like handlers |
| `follow` / `unfollow` | follow toggle |
| `report` | any `ReportPostButton` submit |
| `blockuser` | `BlockUserButton` submit |
| `changegrouprole` | `GroupSettingsDialog` role change |
| `joingroup` | invite accept in `GroupInvites.tsx` |
| `changesetting` | any setting write in `Settings.tsx` |
| `watchvideo` | `VideoPlayer.tsx` on play |

### UI
- Small badge in `ModStoreDialog` "Installed" tab showing counts of ui/scripts/triggers per mod.
- New `ModUIDialog.tsx` for rendering triggered UI html in a sandboxed iframe.

### Security / limitations (call out in a subtle info line on the Upload tab)
- Scripts run sandboxed with a minimal API; no direct access to Supabase or user tokens.
- UI HTML rendered via `<iframe sandbox="allow-scripts">` — no same-origin, no storage access.
- TS support is a naive strip (no imports, no generics beyond simple `: type` annotations).

### Files
- **New:** `src/components/ModImg.tsx`, `src/components/ModUIDialog.tsx`, `src/utils/modEvents.ts`
- **Edit:** `src/utils/mods.ts`, `src/components/ModStoreDialog.tsx`, `src/App.tsx` (mount event runtime + ModUIDialog host), `StaffBadge.tsx`, `CreatorBadge.tsx`, `FeaturedAvatar.tsx`, `LoadingScreen.tsx`, plus the ~15 event emit sites listed above.
- **No migration / no new bucket needed** — everything is client-side inside the existing `.ccmod` file.
