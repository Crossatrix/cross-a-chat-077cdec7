## Plan

### 1. Chat opens at the bottom
- `MessageList.tsx` — after messages load and on conversation change, scroll the container to the bottom instantly (no smooth) so the latest message is in view on open.

### 2. Boost button on every Crossunity post
- `src/components/crossunity/CrossunityFeed.tsx` — render `OwnerBoostButton` on each subcross post (likes/dislikes; per-poll-option if applicable). Visible only to app owners (component already checks).

### 3. Crossunity home shows c/posts
- Treat `posts` (the global Posts feed) as a virtual subcross "c/posts" on the Crossunity home feed. Merge them into the home listing alongside subcross posts (sorted by created_at). Clicking opens the same PostCard UI inline.

### 4. Report a post → staff inbox
- New table `public.post_reports` (post_id, reporter_id, reason, status, created_at). RLS: reporter inserts own, staff (`is_staff`) selects/updates/deletes.
- "Report" button in `PostCard.tsx` (and subcross post card) opens a small reason dialog → inserts row.
- Admin panel new section `PostReportsList.tsx` (mounted in `src/pages/Admin.tsx`) for every staff member: list reports with post preview; actions "Delete post" and "Block poster" (opens block dialog from #5).

### 5. User blocks (separate from bans)
- New table `public.user_content_blocks` (user_id PK, blocked_by, reason, expires_at nullable=permanent, created_at). RLS: user reads own; staff manages.
- Helper RPC `public.is_content_blocked(_user_id uuid) returns boolean` (security definer).
- `UserInfoDialog.tsx` / profile: admins/owners see "Block user" button → dialog choosing Permanent or duration (1d/7d/30d/custom) + reason.
- Enforce in posting flows: videos upload, livestream start, posts create, subcross post create, comments (video_comments, post_comments, subcross_comments). Each insert path checks `is_content_blocked` first and shows toast "You are blocked from posting until …".
- A banner appears at the top of the app when current user is blocked.

### 6. Move Shorts into Videos tab
- Remove standalone Shorts tab from `Index.tsx` bottom nav.
- Inside `VideoFeed.tsx`, add a sub-toggle: "Videos" (current ForYou/long feed) vs "Shorts" (mounts existing `ShortsFeed`). Default: Videos.

### Tech details
- Migrations create `post_reports` and `user_content_blocks` with proper GRANTs and RLS, plus `is_content_blocked` function.
- `useContentBlock()` hook fetches block status on auth load; reused by banner and posting components.
- All UI uses existing design tokens (no hardcoded colors).
- Responsive: works on mobile (411px) and desktop.