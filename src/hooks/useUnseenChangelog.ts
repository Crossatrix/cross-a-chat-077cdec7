import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnseenChangelog = (currentUserId: string | null) => {
  const [hasUnseen, setHasUnseen] = useState(false);

  const checkUnseen = useCallback(async () => {
    if (!currentUserId) return;

    // Get the latest changelog entry
    const { data: latest } = await supabase
      .from("changelog")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      setHasUnseen(false);
      return;
    }

    // Get user's last seen changelog
    const { data: seen } = await supabase
      .from("user_changelog_seen")
      .select("last_seen_changelog_id")
      .eq("user_id", currentUserId)
      .single();

    setHasUnseen(!seen || seen.last_seen_changelog_id !== latest.id);
  }, [currentUserId]);

  useEffect(() => {
    checkUnseen();
  }, [checkUnseen]);

  const markSeen = useCallback(async () => {
    if (!currentUserId) return;

    const { data: latest } = await supabase
      .from("changelog")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) return;

    await supabase
      .from("user_changelog_seen")
      .upsert(
        { user_id: currentUserId, last_seen_changelog_id: latest.id, seen_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    setHasUnseen(false);
  }, [currentUserId]);

  return { hasUnseen, markSeen };
};
