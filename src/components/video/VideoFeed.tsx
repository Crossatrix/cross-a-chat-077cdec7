import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Eye, ThumbsUp, Search, X, CheckCircle, ShieldCheck, Star, XCircle, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoUploadDialog from "./VideoUploadDialog";
import VideoPlayer from "./VideoPlayer";
import CreatorProfile from "./CreatorProfile";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge, { invalidateCreatorCache } from "./CreatorBadge";
import { VIDEO_CATEGORIES, getCategoryIcon } from "@/utils/videoCategories";
import VideoLeaderboard from "./VideoLeaderboard";
import AgeVerificationDialog from "./AgeVerificationDialog";

interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  category: string;
  adults_only?: boolean;
  profiles: { username: string; avatar_url: string | null };
}

interface VideoFeedProps {
  currentUserId: string;
}

const VideoFeed = ({ currentUserId }: VideoFeedProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userCategoryPrefs, setUserCategoryPrefs] = useState<Record<string, number>>({});
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [ageVerifyOpen, setAgeVerifyOpen] = useState(false);
  const [pendingAdultVideo, setPendingAdultVideo] = useState<Video | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchVideos();
    fetchCategoryPrefs();
    checkStaffStatus();
    checkAgeVerification();
  }, []);

  const checkStaffStatus = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUserId);
    const roles = (data || []).map(r => r.role);
    const staffRoles = ["moderator", "elder_moderator", "admin"];
    setIsStaff(roles.some(r => staffRoles.includes(r)));
    setIsAdmin(roles.includes("admin"));
  };

  const fetchCategoryPrefs = async () => {
    const { data } = await supabase
      .from("video_category_views")
      .select("category, view_count")
      .eq("user_id", currentUserId);
    if (data) {
      const prefs: Record<string, number> = {};
      data.forEach(d => { prefs[d.category] = d.view_count; });
      setUserCategoryPrefs(prefs);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    const [{ data }, { data: blockedCatsData }] = await Promise.all([
      supabase
        .from("videos")
        .select("*, profiles(username, avatar_url)")
        .order("created_at", { ascending: false }),
      supabase
        .from("blocked_categories" as any)
        .select("category")
        .eq("user_id", currentUserId),
    ]);
    
    const blockedCats = new Set((blockedCatsData || []).map((d: any) => d.category));

    if (data) {
      const { data: verifications } = await supabase
        .from("creator_verifications")
        .select("user_id, status");

      const verifiedMap = new Map<string, string>();
      verifications?.forEach(v => verifiedMap.set(v.user_id, v.status));

      const filtered = (data as unknown as Video[]).filter(v => !blockedCats.has(v.category));

      const sorted = [...filtered].sort((a, b) => {
        const aStatus = verifiedMap.get(a.user_id) || "";
        const bStatus = verifiedMap.get(b.user_id) || "";
        const priority = (s: string) => s === "verified_plus" ? 3 : s === "verified" ? 2 : 0;
        return priority(bStatus) - priority(aStatus);
      });

      setVideos(sorted);
    }
    setLoading(false);
  };

  const handleVerifyCreator = async (userId: string, status: "verified" | "verified_plus") => {
    const { data: existing } = await supabase
      .from("creator_verifications")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      // Auto-create creator entry if not exists
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertErr } = await supabase
        .from("creator_verifications")
        .insert({ user_id: userId, status, verified_by: user?.id });
      if (insertErr) {
        toast.error("Failed to verify: " + insertErr.message);
      } else {
        invalidateCreatorCache(userId);
        toast.success(`Creator set to ${status === "verified_plus" ? "Verified+" : "Verified"}!`);
        fetchVideos();
      }
      return;
    }

    if (status === "verified_plus" && !isAdmin) {
      toast.error("Only admins can grant Verified Creator+");
      return;
    }

    if (existing.status === status) {
      toast.info(`Already ${status === "verified_plus" ? "Verified+" : "Verified"}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("creator_verifications")
      .update({ status, verified_by: user?.id, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to verify: " + error.message);
    } else {
      invalidateCreatorCache(userId);
      toast.success(`Creator set to ${status === "verified_plus" ? "Verified+" : "Verified"}!`);
      fetchVideos();
    }
  };

  const handleUnverifyCreator = async (userId: string) => {
    const { data: existing } = await supabase
      .from("creator_verifications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      toast.info("Creator is not verified");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("creator_verifications")
      .update({ status: "creator", verified_by: user?.id, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to unverify: " + error.message);
    } else {
      invalidateCreatorCache(userId);
      toast.success("Creator set back to unverified!");
      fetchVideos();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const filteredVideos = useMemo(() => {
    let result = videos;

    // Filter by category
    if (selectedCategory) {
      result = result.filter(v => v.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.profiles.username.toLowerCase().includes(q)
      );
    }

    // If no category filter and no search, personalize by watch history
    if (!selectedCategory && !searchQuery.trim() && Object.keys(userCategoryPrefs).length > 0) {
      const totalViews = Object.values(userCategoryPrefs).reduce((a, b) => a + b, 0);
      result = [...result].sort((a, b) => {
        const aWeight = (userCategoryPrefs[a.category] || 0) / totalViews;
        const bWeight = (userCategoryPrefs[b.category] || 0) / totalViews;
        // Keep existing priority sort but boost preferred categories
        return bWeight - aWeight;
      });
    }

    return result;
  }, [videos, searchQuery, selectedCategory, userCategoryPrefs]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    // Track category view
    trackCategoryView(video.category);
  };

  const trackCategoryView = async (category: string) => {
    const { data: existing } = await supabase
      .from("video_category_views")
      .select("id, view_count")
      .eq("user_id", currentUserId)
      .eq("category", category)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("video_category_views")
        .update({ view_count: existing.view_count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("video_category_views")
        .insert({ user_id: currentUserId, category, view_count: 1 });
    }

    setUserCategoryPrefs(prev => ({
      ...prev,
      [category]: (prev[category] || 0) + 1,
    }));
  };

  if (selectedCreatorId) {
    return (
      <CreatorProfile
        creatorId={selectedCreatorId}
        currentUserId={currentUserId}
        onBack={() => setSelectedCreatorId(null)}
        onSelectVideo={(video) => {
          setSelectedCreatorId(null);
          setSelectedVideo(video);
        }}
      />
    );
  }

  if (selectedVideo) {
    return (
      <VideoPlayer
        video={selectedVideo}
        currentUserId={currentUserId}
        onBack={() => setSelectedVideo(null)}
        onCreatorClick={(id) => {
          setSelectedVideo(null);
          setSelectedCreatorId(id);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-bold text-primary">Videos</h2>
        <VideoUploadDialog userId={currentUserId} onUploaded={fetchVideos} />
      </div>

      <div className="px-3 pt-2 pb-1 shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer shrink-0 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {VIDEO_CATEGORIES.map((cat) => (
            <Badge
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              className="cursor-pointer shrink-0 text-xs"
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            >
              {cat.icon} {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <VideoLeaderboard
          onSelectVideo={(videoId) => {
            const v = videos.find(v => v.id === videoId);
            if (v) handleSelectVideo(v);
          }}
          onCreatorClick={(id) => setSelectedCreatorId(id)}
        />
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to upload a video!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectVideo(video)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {/* Category badge on thumbnail */}
                  <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {getCategoryIcon(video.category)} {video.category}
                  </span>
                </div>

                {/* Info */}
                <div className="p-2.5 flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedCreatorId(video.user_id); }}>
                    <AvatarImage src={video.profiles.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary text-foreground text-xs">
                      {video.profiles.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{video.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <StaffBadge userId={video.user_id} size={12} />
                      <CreatorBadge userId={video.user_id} size={12} />
                      <span className="text-xs text-muted-foreground truncate cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedCreatorId(video.user_id); }}>{video.profiles.username}</span>
                      {isStaff && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-auto shrink-0"
                              title="Verify Creator"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => handleVerifyCreator(video.user_id, "verified")}>
                              <ShieldCheck className="h-4 w-4 mr-2 text-pink-500" />
                              Verified Creator
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onSelect={() => handleVerifyCreator(video.user_id, "verified_plus")}>
                                <Star className="h-4 w-4 mr-2 text-amber-500" />
                                Verified Creator+
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => handleUnverifyCreator(video.user_id)}>
                              <XCircle className="h-4 w-4 mr-2 text-destructive" />
                              Unverify
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {video.views_count}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {video.likes_count}</span>
                      <span>{formatDate(video.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default VideoFeed;
