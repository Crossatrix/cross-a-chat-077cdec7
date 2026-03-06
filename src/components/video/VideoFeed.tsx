import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Eye, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoUploadDialog from "./VideoUploadDialog";
import VideoPlayer from "./VideoPlayer";
import StaffBadge from "@/components/StaffBadge";

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
  profiles: { username: string; avatar_url: string | null };
}

interface VideoFeedProps {
  currentUserId: string;
}

const VideoFeed = ({ currentUserId }: VideoFeedProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("*, profiles(username, avatar_url)")
      .order("created_at", { ascending: false });
    if (data) setVideos(data as unknown as Video[]);
    setLoading(false);
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
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-bold text-primary">Videos</h2>
        <VideoUploadDialog userId={currentUserId} onUploaded={fetchVideos} />
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to upload a video!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedVideo(video)}
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
                </div>

                {/* Info */}
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

export default VideoFeed;
