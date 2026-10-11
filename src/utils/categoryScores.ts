import { supabase } from "@/integrations/supabase/client";

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

export const videoCategoriesOf = (v: { ai_categories?: string[] | null; category?: string | null }) =>
  v.ai_categories && v.ai_categories.length ? v.ai_categories : [v.category || "other"];

/** User's category scores (0–20). */
export async function fetchCategoryScores(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase.from("user_category_scores" as any).select("category, score").eq("user_id", userId);
  const map: Record<string, number> = {};
  (data as any[] | null)?.forEach((r) => { map[r.category] = Number(r.score) || 0; });
  return map;
}

/** Personalisation bonus from 0 to ~6 based on how much the user likes this video's categories. */
export function categoryAffinity(scores: Record<string, number>, v: any): number {
  const cats = videoCategoriesOf(v);
  const vals = cats.map((c, i) => (scores[c] || 0) / 20 * (i === 0 ? 1 : 0.6));
  return Math.min(1.5, vals.reduce((a, b) => a + b, 0)) * 4;
}

/** Called when a user watches a video: boosts its categories and refreshes stale AI tags. */
export async function recordWatch(v: any) {
  supabase.rpc("bump_category_scores" as any, { _categories: videoCategoriesOf(v) } as any).then(() => {});
  const analyzed = v.categories_analyzed_at ? new Date(v.categories_analyzed_at).getTime() : 0;
  if (v.id && Date.now() - analyzed > TEN_DAYS) {
    supabase.functions.invoke("categorize-video", { body: { videoId: v.id } }).catch(() => {});
  }
}

/** Elder moderators/admins: force re-categorize one video now. */
export async function recategorizeVideo(videoId: string): Promise<string[] | null> {
  const { data, error } = await supabase.functions.invoke("categorize-video", { body: { videoId, force: true } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
  return data?.results?.[videoId] || null;
}
