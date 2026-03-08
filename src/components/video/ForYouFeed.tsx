import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Eye, ThumbsUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoPlayer from "./VideoPlayer";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "./CreatorBadge";
import { getCategoryIcon, getCategoryLabel } from "@/utils/videoCategories";

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
  profiles: { username: string; avatar_url: string | null };
}

interface ForYouFeedProps {
  currentUserId: string;
}

const ForYouFeed = ({ currentUserId }: ForYouFeedProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [topCategories, setTopCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchForYou();
  }, []);

  const fetchForYou = async () => {
    setLoading(true);

    // Fetch user's category preferences
    const { data: prefs } = await supabase
      .from("video_category_views")
      .select("category, view_count")
      .eq("user_id", currentUserId)
      .order("view_count", { ascending: false });

    const preferredCategories = (prefs || []).slice(0, 5).map(p => p.category);
    setTopCategories(preferredCategories);

    if (preferredCategories.length === 0) {
      // No watch history — show trending (most viewed)
      const { data } = await supabase
        .from("videos")
        .select("*, profiles(username, avatar_url)")
        .order("views_count", { ascending: false })
        .limit(50);
      if (data) setVideos(data as unknown as Video[]);
      setLoading(false);
      return;
    }

    // Fetch videos in preferred categories
    const { data } = await supabase
      .from("videos")
      .select("*, profiles(username, avatar_url)")
      .in("category", preferredCategories)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Fetch verifications to boost verified creators
      const { data: verifications } = await supabase
        .from("creator_verifications")
        .select("user_id, status");

      const verifiedMap = new Map<string, string>();
      verifications?.forEach(v => verifiedMap.set(v.user_id, v.status));

      const prefMap: Record<string, number> = {};
      prefs?.forEach(p => { prefMap[p.category] = p.view_count; });
      const totalViews = Object.values(prefMap).reduce((a, b) => a + b, 0) || 1;

      const sorted = [...(data as unknown as Video[])].sort((a, b) => {
        const aVerify = verifiedMap.get(a.user_id) || "";
        const bVerify = verifiedMap.get(b.user_id) || "";
        const vPriority = (s: string) => s === "verified_plus" ? 3 : s === "verified" ? 2 : 0;
        const verifyDiff = vPriority(bVerify) - vPriority(aVerify);

        const aPref = (prefMap[a.category] || 0) / totalViews;
        const bPref = (prefMap[b.category] || 0) / totalViews;

        // Combine: preference weight (70%) + verification (30%)
        return (bPref - aPref) * 0.7 + verifyDiff * 0.3;
      });

      setVideos(sorted);
    }
    setLoading(false);
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

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    trackCategoryView(video.category);
  };

  if (selectedVideo) {
    return (
      <VideoPlayer
        video={selectedVideo}
        currentUserId={currentUserId}
        onBack={() => setSelectedVideo(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card shrink-0">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-primary">For You</h2>
      </div>

      {topCategories.length > 0 && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <p className="text-xs text-muted-foreground mb-1">Based on your interests:</p>
          <div className="flex gap-1.5 flex-wrap">
            {topCategories.map(cat => (
              <span key={cat} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {getCategoryLabel(cat)}
              </span>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading your feed...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
            <p className="text-sm text-muted-foreground">Watch some videos in the Videos tab and we'll personalize this feed for you!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectVideo(video)}
              >
                <div className="relative aspect-video bg-muted">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {getCategoryIcon(video.category)} {video.category}
                  </span>
                </div>

                <div className="p-2.5 flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
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
                      <span className="text-xs text-muted-foreground truncate">{video.profiles.username}</span>
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

export default ForYouFeed;
