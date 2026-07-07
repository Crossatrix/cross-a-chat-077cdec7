import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Award, Flame } from "lucide-react";
import CreatorBadge, { invalidateCreatorCache } from "@/components/video/CreatorBadge";
import { StaffRole, isAtLeast } from "@/utils/roleConfig";
import officialIcon from "@/assets/roles/official_notifications.png";
import ModImg from "@/components/ModImg";
import { invalidateFeaturedCache, type FeaturedTier } from "@/components/video/FeaturedAvatar";

interface CreatorEntry {
  id: string;
  user_id: string;
  status: string;
  profiles: { username: string; avatar_url: string | null };
  isOfficial?: boolean;
  featuredTier?: FeaturedTier | null;
}

interface CreatorVerificationManagerProps {
  staffRole: StaffRole | null;
}

const CreatorVerificationManager = ({ staffRole }: CreatorVerificationManagerProps) => {
  const [creators, setCreators] = useState<CreatorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const canVerify = isAtLeast(staffRole, "moderator");
  const canVerifyPlus = isAtLeast(staffRole, "admin");

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("creator_verifications")
      .select("*, profiles(username, avatar_url)")
      .order("created_at", { ascending: false });

    const [{ data: officials }, { data: featured }] = await Promise.all([
      supabase.from("official_accounts").select("user_id"),
      supabase.from("featured_creators").select("user_id, tier"),
    ]);

    const officialIds = new Set(officials?.map(o => o.user_id) || []);
    const featuredMap = new Map(featured?.map(f => [f.user_id, f.tier as FeaturedTier]) || []);

    if (data) {
      setCreators(
        (data as unknown as CreatorEntry[]).map(c => ({
          ...c,
          isOfficial: officialIds.has(c.user_id),
          featuredTier: featuredMap.get(c.user_id) ?? null,
        }))
      );
    }
    setLoading(false);
  };

  const handleStatusChange = async (creatorId: string, userId: string, newStatus: string) => {
    if (newStatus === "verified_plus" && !canVerifyPlus) {
      toast.error("Only admins can grant Verified Creator+");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("creator_verifications")
      .update({ status: newStatus, verified_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", creatorId);

    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      invalidateCreatorCache(userId);
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchCreators();
    }
  };

  const handleToggleOfficial = async (userId: string, isCurrentlyOfficial: boolean) => {
    if (isCurrentlyOfficial) {
      const { error } = await supabase
        .from("official_accounts")
        .delete()
        .eq("user_id", userId);
      if (error) {
        toast.error("Failed to remove official badge");
        return;
      }
      toast.success("Official badge removed");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("official_accounts")
        .insert({ user_id: userId, granted_by: user?.id });
      if (error) {
        toast.error("Failed to grant official badge");
        return;
      }
      toast.success("Official badge granted");
    }
    fetchCreators();
  };

  const handleSetFeatured = async (userId: string, tier: string) => {
    if (tier === "none") {
      const { error } = await supabase
        .from("featured_creators")
        .delete()
        .eq("user_id", userId);
      if (error) {
        toast.error("Failed to remove featured status");
        return;
      }
      toast.success("Featured status removed");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("featured_creators")
        .upsert({ user_id: userId, tier, granted_by: user?.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) {
        toast.error("Failed to set featured: " + error.message);
        return;
      }
      toast.success(`Featured as ${tier}`);
    }
    invalidateFeaturedCache(userId);
  };

  const statusLabel = (s: string) => {
    if (s === "verified_plus") return "Verified+";
    if (s === "verified") return "Verified";
    return "Creator";
  };

  const statusColor = (s: string) => {
    if (s === "verified_plus") return "bg-pink-500/20 text-pink-300 border-pink-500/30";
    if (s === "verified") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Creator Verifications</h3>
        <Button size="sm" variant="ghost" onClick={fetchCreators}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : creators.length === 0 ? (
        <p className="text-sm text-muted-foreground">No creators yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {creators.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.profiles.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {c.profiles.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <CreatorBadge userId={c.user_id} size={14} />
                {c.isOfficial && (
                  <ModImg src={officialIcon} alt="Official" className="h-3.5 w-3.5 rounded-full" />
                )}
                <span className="text-sm font-medium truncate">{c.profiles.username}</span>
              </div>
              <Badge className={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
              {canVerify && (
                <Select
                  value={c.status}
                  onValueChange={(val) => handleStatusChange(c.id, c.user_id, val)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    {canVerifyPlus && <SelectItem value="verified_plus">Verified+</SelectItem>}
                  </SelectContent>
                </Select>
              )}
              {canVerifyPlus && (
                <Select
                  value={c.featuredTier || "none"}
                  onValueChange={(val) => handleSetFeatured(c.user_id, val)}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <Flame className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Fire</SelectItem>
                    <SelectItem value="epic">🔥 Epic</SelectItem>
                    <SelectItem value="legendary">💜 Legendary</SelectItem>
                    <SelectItem value="mythic">💎 Mythic</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {canVerifyPlus && (
                <Button
                  size="sm"
                  variant={c.isOfficial ? "secondary" : "outline"}
                  className="h-8 text-xs px-2"
                  onClick={() => handleToggleOfficial(c.user_id, !!c.isOfficial)}
                >
                  <Award className="h-3.5 w-3.5 mr-1" />
                  {c.isOfficial ? "Unofficial" : "Official"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorVerificationManager;
