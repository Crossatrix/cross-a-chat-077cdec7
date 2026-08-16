# Support Book

Turn `/support` into an editable support "book" with chapters and subchapters, fully manageable by admins, plus feedback, docs and an AI assistant on the landing page.

## What the user sees

**Support landing page (`/support`)**
- Three action cards at the top: Send feedback (existing dialog), Open docs, Ask the AI Assistant.
- Below: the book's table of contents — chapters listed in order, each expanding to its subchapters.
- Clicking a chapter/subchapter opens the reader view with the article body, previous/next navigation and a back-to-contents link.
- A search box filters chapters and subchapters by title and text.

**AI Assistant**
- A dialog on the support page. The user asks a question; the answer is generated from the content of all support pages (chapters + subchapters) only, with a "I couldn't find this in the support pages" fallback and a hint to email support.
- Uses the same OpenRouter model as translation (`inclusionai/ling-3.0-flash:free`).

**Admin editing**
- Admins (staff role check) see an "Edit" toggle on the support page.
- In edit mode: add chapter, add subchapter under a chapter, rename, edit body (markdown-style plain text), reorder up/down, and delete (with confirm).
- Everyone else sees the published content read-only.

## Technical details

**Database** — new table `public.support_pages`:
- `id`, `parent_id` (self-reference, null = chapter), `title`, `content` (text), `sort_order` (int), `created_by`, `created_at`, `updated_at` + updated_at trigger.
- Grants: `SELECT` to `anon` and `authenticated` (support content is public, matching the unauthenticated-friendly `/posts` and `/docs` pages); full write to `authenticated` restricted by policy; `ALL` to `service_role`.
- RLS: anyone can read; only admins (`has_role(auth.uid(),'admin')`) can insert, update, delete.
- Seed the current hardcoded FAQ/contact text as a starter chapter set so the page isn't empty.

**Edge function** — new `support-assistant`:
- Loads all `support_pages` rows via service role, concatenates them into a context block (truncated), and sends question + context to OpenRouter `inclusionai/ling-3.0-flash:free` with a system prompt restricting answers to that context.
- Public (`verify_jwt = false`) so unauthenticated visitors can use it, with a length cap on the question.

**Frontend**
- `src/pages/Support.tsx` rewritten: contents/reader/edit modes, search, existing `FeedbackDialog`, docs link.
- New `src/components/support/SupportBook.tsx` (tree + reader), `SupportPageEditor.tsx` (admin CRUD), `SupportAssistantDialog.tsx`.
- New `src/hooks/useSupportPages.ts` for fetching and mutating the tree.
- Admin gate reuses the existing `useStaffRole` hook.
- Responsive: single-column stacked layout on mobile, sidebar contents + reader on desktop.
