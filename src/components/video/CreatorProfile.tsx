import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserPlus, UserMinus, Play, Eye, ThumbsUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StaffBadge from "@/components/StaffBadge";
import { formatMessageText } from "@/utils/textFormatting";
import CreatorBadge from "./CreatorBadge";
import FeaturedAvatar from "./FeaturedAvatar";

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
  duration: number | null;
  profiles: { username: string; avatar_url: string | null };
}

interface CreatorProfileProps {
  creatorId: string;
  currentUserId: string;
  onBack: () => void;
  onSelectVideo: (video: Video) => void;
}

const CreatorProfile = ({ creatorId, currentUserId, onBack, onSelectVideo }: CreatorProfileProps) => {
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null; bio: string | null; created_at: string } | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [creatorId]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: profileData },
      { data: videosData },
      { count: followers },
      { count: following },
      { data: followStatus },
    ] = await Promise.all([
      supabase.from("profiles").select("username, avatar_url, bio, created_at").eq("id", creatorId).single(),
      supabase.from("videos").select("*, profiles(username, avatar_url)").eq("user_id", creatorId).order("created_at", { ascending: false }),
      supabase.from("video_follows").select("*", { count: "exact", head: true }).eq("following_id", creatorId),
      supabase.from("video_follows").select("*", { count: "exact", head: true }).eq("follower_id", creatorId),
      supabase.from("video_follows").select("id").eq("follower_id", currentUserId).eq("following_id", creatorId).maybeSingle(),
    ]);

    if (profileData) setProfile(profileData);
    if (videosData) {
      const allVids = videosData as unknown as Video[];
      setVideos(allVids.filter(v => v.duration === null || v.duration > 180));
      setShorts(allVids.filter(v => v.duration !== null && v.duration <= 180));
      setTotalViews(allVids.reduce((sum, v) => sum + v.views_count, 0));
      setTotalLikes(allVids.reduce((sum, v) => sum + v.likes_count, 0));
    }
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setIsFollowing(!!followStatus);
    setLoading(false);
  };

  const handleFollow = async () => {
    if (isFollowing) {
      await supabase.from("video_follows").delete().eq("follower_id", currentUserId).eq("following_id", creatorId);
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("video_follows").insert({ follower_id: currentUserId, following_id: creatorId });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-muted-foreground">Profile not found</p>
        <Button variant="ghost" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  const VideoGrid = ({ items }: { items: Video[] }) => (
    items.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Play className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No videos yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
        {items.map((video) => (
          <div
            key={video.id}
            className="rounded-lg overflow-hidden border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelectVideo(video)}
          >
            <div className="relative aspect-video bg-muted">
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-2">
              <h4 className="text-xs font-medium line-clamp-2 leading-tight">{video.title}</h4>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatCount(video.views_count)}</span>
                <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" /> {formatCount(video.likes_count)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold truncate flex-1">{profile.username}</h2>
      </div>

      <ScrollArea className="flex-1">
        {/* Profile header */}
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-secondary text-foreground text-xl">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StaffBadge userId={creatorId} size={18} />
                <CreatorBadge userId={creatorId} size={18} />
                <h1 className="text-lg font-bold truncate">{profile.username}</h1>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
              {creatorId !== currentUserId && (
                <Button
                  variant={isFollowing ? "secondary" : "default"}
                  size="sm"
                  className="gap-1 mt-2"
                  onClick={handleFollow}
                >
                  {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formatMessageText(profile.bio)}</p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-lg font-bold">{formatCount(followerCount)}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-lg font-bold">{formatCount(followingCount)}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-lg font-bold">{formatCount(totalViews)}</p>
              <p className="text-[10px] text-muted-foreground">Views</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-lg font-bold">{formatCount(totalLikes)}</p>
              <p className="text-[10px] text-muted-foreground">Likes</p>
            </div>
          </div>
        </div>

        {/* Videos tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger value="videos" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-sm">
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="shorts" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-sm">
              Shorts ({shorts.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="videos" className="mt-0">
            <VideoGrid items={videos} />
          </TabsContent>
          <TabsContent value="shorts" className="mt-0">
            <VideoGrid items={shorts} />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default CreatorProfile;
