
## Mod Store

Add a **Mods** button next to the existing Beta button that opens a new **Mod Store** dialog where anyone can upload and install `.ccmod` files (renamed `.zip`).

### What a .ccmod contains
A zip with:
- `mod.json` — array like `[{"name":"example"},{"description":"..."}]` (parsed by merging objects)
- `emojis/` — optional. Each image file adds a new emoji (filename = emoji name). If the filename matches an existing custom emoji name, it overrides it.
- `textures/` — optional. Mirrors `src/assets/` paths (e.g. `textures/roles/admin.jpeg` overrides `src/assets/roles/admin.jpeg`) at runtime.

### Database (Lovable Cloud)
New table `mods`:
- `name`, `description`, `author_id`, `file_url` (storage), `downloads`, `created_at`
- Public read; authenticated insert (own rows); author can delete own; staff can delete any.

New storage bucket `mods` (public read) for the `.ccmod` files.

### Install flow (client-side)
- User clicks **Install** on a mod → download `.ccmod` → unzip in browser with `jszip` (needs adding).
- Parse `mod.json` for metadata.
- **Emojis**: for each file in `emojis/`, save `{name, dataUrl}` into `localStorage` under `installed_mod_emojis`. Emoji picker + message renderer read this list first as an override, then fall back to DB emojis.
- **Textures**: for each file in `textures/<path>`, save `{path: "src/assets/<path>", dataUrl}` into `localStorage` under `installed_mod_textures`. A small runtime helper `resolveTexture(originalUrl)` returns the override data URL if present.
- Track installed mods in `localStorage` under `installed_mods` so they can be listed/uninstalled.

### UI
- `ModsButton.tsx` next to the Beta button (same location in `Index.tsx`).
- `ModStoreDialog.tsx`:
  - **Browse** tab: list all mods from DB with name, description, author, install button.
  - **Upload** tab: file picker (accept `.ccmod`), validates presence of `mod.json`, uploads to storage, inserts DB row.
  - **Installed** tab: locally installed mods with Uninstall.

### Files
- New: `src/components/ModsButton.tsx`, `src/components/ModStoreDialog.tsx`, `src/utils/mods.ts` (install/uninstall/parse + `resolveTexture`, `getModEmojis`).
- Edit: `src/pages/Index.tsx` (place Mods button next to Beta button), `src/components/EmojiPicker.tsx` + `src/utils/textFormatting.tsx` (merge mod emojis), a few key image imports use `resolveTexture` (e.g. role badges in `StaffBadge.tsx`).
- Add dep: `jszip`.
- Migration: `mods` table + `mods` storage bucket + policies.

### Limitations to call out
Because Vite bundles `src/assets/*` at build time, texture overrides only work for images loaded through the `resolveTexture` helper. I'll wire it into the most visible surfaces (role/staff badges, avatars fallback). Non-wired assets will still show originals.
