// Helper for resolving what name should be shown for a creator (videos/posts/profile)
// Falls back to their normal username when no creator override is set.
export function getCreatorDisplayName(profile: {
  creator_username?: string | null;
  username?: string | null;
} | null | undefined): string {
  if (!profile) return "";
  const c = (profile.creator_username || "").trim();
  return c || profile.username || "";
}
