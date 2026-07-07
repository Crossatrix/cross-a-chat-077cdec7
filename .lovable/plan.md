## Radio Tab Feature

### 1. Database (new migration)

- `**radio_broadcasters**` table: `user_id` (unique, FK profile), granted_by, created_at. RLS: anyone can read, admins can insert/delete.
- `**radio_songs**` table: id, uploader_id, title, artist, audio_url, cover_url (nullable), duration, created_at. RLS: public read, broadcasters insert/delete own, admins delete any.
- `**radio_news**` table: id, broadcaster_id, text (max ~1000 chars), created_at. Enforce max 50 per broadcaster via trigger. RLS: public read, broadcasters manage own, admins delete any.
- `**radio_now_playing**` table (single row, server-chosen state): id, song_id, started_at, news_text (nullable), news_started_at. Public read; only edge function writes via service role.
- Grants + RLS on all four tables.

### 2. Storage

- New public bucket `radio-audio` (song files) and `radio-covers` (cover art). Broadcasters upload; public read.

### 3. Badges

- Extend `BadgeRole` in `StaffBadge.tsx` with `"radiobroadcaster"`, add icon (generated), fetch from `radio_broadcasters`, cache like existing badges.
- Broadcaster badge is targetable by mod textures via existing `ModImg` pattern.
- Admin panel: extend `CreatorVerificationManager` (or add small `RadioBroadcasterManager`) with a toggle button — admins only.

### 4. Radio playback (server-picks-song)

- Edge function `**radio-tick**` (scheduled every ~30s via pg_cron): if no current song or current song ended, pick random song from `radio_songs`, upsert into `radio_now_playing` with fresh `started_at`. Every 30 min, also select a random news item and set `news_text` + `news_started_at`.
- Client subscribes to `radio_now_playing` via Supabase realtime; computes playback offset from `started_at` and streams audio via `<audio>` element seeked to `(now - started_at)`.
- News: when `news_started_at` changes, play via `speechSynthesis` (browser TTS) — text is read aloud automatically.

### 5. Radio tab UI (`src/pages/Radio.tsx` + route)

- Add to bottom nav / main tabs alongside existing tabs.
- Player card: current cover, title/artist, live indicator, mute/volume, "News" banner when active.
- For broadcasters: "Manage" section with:
  - Upload song dialog (audio file → `radio-audio`, optional cover → `radio-covers`, insert row).
  - News manager: list current news (up to 50), add/delete, "Generate with AI" button.
- Everyone sees list of uploaded songs (read-only).

### 6. AI news generation

- Edge function `**radio-news-generate**`: accepts `{ info: string }` from authenticated broadcaster, calls OpenRouter with model `openrouter/owl-alpha` using existing `OPENROUTER_KEY` secret, returns a short news blurb. Client shows result in editable textarea before saving.

### 7. Files touched

- New: migration; `supabase/functions/radio-tick/index.ts`; `supabase/functions/radio-news-generate/index.ts`; `src/pages/Radio.tsx`; `src/components/radio/RadioPlayer.tsx`, `RadioBroadcasterPanel.tsx`, `RadioUploadSongDialog.tsx`, `RadioNewsManager.tsx`; `src/assets/badge-radiobroadcaster.png` (generated).
- Edit: `src/components/StaffBadge.tsx` (new badge), `src/App.tsx` (route), main nav component (add tab), `src/components/admin/CreatorVerificationManager.tsx` (grant/revoke toggle).
- Schedule `radio-tick` via `cron.schedule` (insert tool, not migration).

### Confirm before I build

- OK to schedule `radio-tick` every 30 seconds (needed so songs advance promptly)? It should use the least lovable credits possible.
- Browser `speechSynthesis` for reading news aloud is fine (no external TTS cost)? Yes
- Song file size cap — reuse the 50MB video limit, or something else (e.g. 20MB per track)? No limit