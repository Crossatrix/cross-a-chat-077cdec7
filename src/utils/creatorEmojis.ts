import { supabase } from "@/integrations/supabase/client";

interface CreatorEmojiRow {
  name: string;
  image_url: string;
  creator_id: string;
  membership_id: string | null;
}

let creatorEmojiCache: CreatorEmojiRow[] = [];
let lastFetch = 0;

const refreshCache = async () => {
  const now = Date.now();
  if (now - lastFetch < 30_000 && creatorEmojiCache.length) return creatorEmojiCache;
  const { data } = await supabase
    .from("creator_emojis" as any)
    .select("name, image_url, creator_id, membership_id");
  creatorEmojiCache = (data as any) || [];
  lastFetch = now;
  return creatorEmojiCache;
};

export const getCachedCreatorEmojis = () => creatorEmojiCache;

// Check if a sender is allowed to use a given creator emoji
const canUseCreatorEmoji = async (
  senderId: string,
  emoji: CreatorEmojiRow,
): Promise<boolean> => {
  if (senderId === emoji.creator_id) return true;
  if (!emoji.membership_id) return true; // Free creator emoji
  const { data } = await supabase
    .from("channel_subscriptions" as any)
    .select("membership_id, expires_at")
    .eq("user_id", senderId)
    .eq("creator_id", emoji.creator_id)
    .maybeSingle();
  if (!data) return false;
  const d: any = data;
  if (new Date(d.expires_at) <= new Date()) return false;
  return d.membership_id === emoji.membership_id;
};

/**
 * Pre-process outgoing text: any :name: token referencing a creator-only emoji
 * the sender cannot use is escaped so it renders as plain text for everyone.
 */
export const escapeUnauthorizedCreatorEmojis = async (
  text: string,
  senderId: string,
): Promise<string> => {
  if (!text) return text;
  const tokenRe = /:([a-zA-Z0-9_-]+):/g;
  const matches = Array.from(text.matchAll(tokenRe));
  if (!matches.length) return text;

  await refreshCache();
  const names = new Set(matches.map(m => m[1]));
  const relevant = creatorEmojiCache.filter(e => names.has(e.name));
  if (!relevant.length) return text;

  const allowMap = new Map<string, boolean>();
  for (const e of relevant) {
    const key = `${e.name}|${e.creator_id}`;
    allowMap.set(key, await canUseCreatorEmoji(senderId, e));
  }

  return text.replace(tokenRe, (full, name) => {
    const ce = relevant.find(e => e.name === name);
    if (!ce) return full; // Not a creator emoji — leave as-is (custom_emojis or text)
    const allowed = allowMap.get(`${ce.name}|${ce.creator_id}`);
    if (allowed) return full;
    // Escape with zero-width spaces so the formatter regex won't match
    return `:\u200B${name}\u200B:`;
  });
};

/** Returns true if the user has any active channel subscription to creator. */
export const hasActiveChannelMembership = async (
  userId: string,
  creatorId: string,
): Promise<boolean> => {
  if (userId === creatorId) return true;
  const { data } = await supabase
    .from("channel_subscriptions" as any)
    .select("expires_at")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (!data) return false;
  return new Date((data as any).expires_at) > new Date();
};
