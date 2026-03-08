import { useState, useEffect } from "react";
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
  onCreatorClick?: (creatorId: string) => void;
}

const ForYouFeed = ({ currentUserId, onCreatorClick }: ForYouFeedProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [topCategories, setTopCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchForYou();
  }, []);

  const fetchForYou = async () => {
    setLoading(true);

    // Fetch all signals in parallel: category prefs, follows, liked video creators
    const [prefsRes, followsRes, likesRes, notInterestedRes] = await Promise.all([
      supabase
        .from("video_category_views")
        .select("category, view_count")
        .eq("user_id", currentUserId)
        .order("view_count", { ascending: false }),
      supabase
        .from("video_follows")
        .select("following_id")
        .eq("follower_id", currentUserId),
      supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", currentUserId)
        .eq("is_like", true),
      supabase
        .from("video_not_interested" as any)
        .select("video_id, creator_id, category")
        .eq("user_id", currentUserId),
    ]);

    const preferredCategories = (prefsRes.data || []).slice(0, 5).map(p => p.category);
    setTopCategories(preferredCategories);

    // Build not-interested signals
    const niData = (notInterestedRes.data || []) as any[];
    const notInterestedVideoIds = new Set(niData.map((n: any) => n.video_id));
    const notInterestedCreators: Record<string, number> = {};
    const notInterestedCategories: Record<string, number> = {};
    niData.forEach((n: any) => {
      notInterestedCreators[n.creator_id] = (notInterestedCreators[n.creator_id] || 0) + 1;
      notInterestedCategories[n.category] = (notInterestedCategories[n.category] || 0) + 1;
    });

    const followedCreators = new Set((followsRes.data || []).map(f => f.following_id));

    // Get creators from liked videos
    const likedVideoIds = (likesRes.data || []).map(l => l.video_id);
    let likedCreators = new Set<string>();
    if (likedVideoIds.length > 0) {
      const { data: likedVids } = await supabase
        .from("videos")
        .select("user_id")
        .in("id", likedVideoIds.slice(0, 200));
      likedVids?.forEach(v => likedCreators.add(v.user_id));
    }

    // Merge all preferred creator IDs
    const preferredCreators = new Set([...followedCreators, ...likedCreators]);

    const hasSignals = preferredCategories.length > 0 || preferredCreators.size > 0;

    // Fetch all videos (we score client-side)
    const { data } = await supabase
      .from("videos")
      .select("*, profiles(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) {
      setLoading(false);
      return;
    }

    const allVideos = data as unknown as Video[];

    if (!hasSignals) {
      // No signals — show trending, penalize heavily disliked videos
      const trending = [...allVideos].sort((a, b) => {
        const scoreA = a.views_count - (a.dislikes_count > a.likes_count && (a.likes_count + a.dislikes_count) > 0 ? (a.dislikes_count / (a.likes_count + a.dislikes_count)) * a.views_count * 2 : 0);
        const scoreB = b.views_count - (b.dislikes_count > b.likes_count && (b.likes_count + b.dislikes_count) > 0 ? (b.dislikes_count / (b.likes_count + b.dislikes_count)) * b.views_count * 2 : 0);
        return scoreB - scoreA;
      });
      setVideos(trending.slice(0, 50));
      setLoading(false);
      return;
    }

    // Fetch verifications
    const { data: verifications } = await supabase
      .from("creator_verifications")
      .select("user_id, status");

    const verifiedMap = new Map<string, string>();
    verifications?.forEach(v => verifiedMap.set(v.user_id, v.status));

    // Build category weight map
    const prefMap: Record<string, number> = {};
    prefsRes.data?.forEach(p => { prefMap[p.category] = p.view_count; });
    const totalCatViews = Object.values(prefMap).reduce((a, b) => a + b, 0) || 1;

    // Score each video
    const scored = allVideos.map(video => {
      let score = 0;

      // Creator signals (strongest: followed or liked creator)
      if (followedCreators.has(video.user_id)) score += 5;
      if (likedCreators.has(video.user_id)) score += 3;

      // Category preference
      const catWeight = (prefMap[video.category] || 0) / totalCatViews;
      score += catWeight * 4;

      // Verification boost
      const vStatus = verifiedMap.get(video.user_id) || "";
      if (vStatus === "verified_plus") score += 1.5;
      else if (vStatus === "verified") score += 0.75;

      // Small recency boost
      const ageHours = (Date.now() - new Date(video.created_at).getTime()) / 3600000;
      score += Math.max(0, 1 - ageHours / 720); // decays over 30 days

      // Penalize videos with more dislikes than likes
      if (video.dislikes_count > video.likes_count && (video.likes_count + video.dislikes_count) > 0) {
        const ratio = video.dislikes_count / (video.likes_count + video.dislikes_count);
        score -= ratio * 5;
      }

      return { video, score };
    });

    scored.sort((a, b) => b.score - a.score);
    setVideos(scored.slice(0, 50).map(s => s.video));
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
        onCreatorClick={onCreatorClick}
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
            <p className="text-sm text-muted-foreground">Watch some videos, follow creators, and like videos to personalize this feed!</p>
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
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onCreatorClick?.(video.user_id); }}>
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
                      <span className="text-xs text-muted-foreground truncate cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onCreatorClick?.(video.user_id); }}>{video.profiles.username}</span>
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
