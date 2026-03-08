import { useState, useEffect } from "react";
import { Trophy, Eye, ThumbsUp, ThumbsDown, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";
import crownImg from "@/assets/crown.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "./CreatorBadge";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardVideo {
  video_id: string;
  weekly_views: number;
  weekly_likes: number;
  weekly_dislikes: number;
  video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    user_id: string;
    profiles: { username: string; avatar_url: string | null };
  };
}

interface VideoLeaderboardProps {
  onSelectVideo?: (videoId: string) => void;
  onCreatorClick?: (creatorId: string) => void;
}

const VideoLeaderboard = ({ onSelectVideo, onCreatorClick }: VideoLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { data } = await supabase
      .from("video_weekly_stats")
      .select("video_id, weekly_views, weekly_likes, weekly_dislikes")
      .eq("week_start", weekStartStr)
      .order("weekly_views", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      const videoIds = data.map(d => d.video_id);
      const { data: videos } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, user_id, profiles(username, avatar_url)")
        .in("id", videoIds);

      const videoMap = new Map((videos || []).map((v: any) => [v.id, v]));
      const enriched = data
        .map(d => ({ ...d, video: videoMap.get(d.video_id) as any }))
        .filter(d => d.video);

      setLeaderboard(enriched);
    } else {
      setLeaderboard([]);
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <img src={crownImg} alt="Crown" className="h-5 w-5 object-contain" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-yellow-500/10 border-yellow-500/30";
    if (index === 1) return "bg-gray-300/10 border-gray-400/30";
    if (index === 2) return "bg-amber-700/10 border-amber-700/30";
    return "bg-card border-border";
  };

  if (loading) return null;
  if (leaderboard.length === 0) return null;

  const displayItems = expanded ? leaderboard : leaderboard.slice(0, 3);

  return (
    <div className="mx-3 mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-t-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-orange-500/20 border border-b-0 border-yellow-500/30"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-bold text-foreground">Weekly Top 10</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            This Week
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className={`border border-t-0 border-yellow-500/30 rounded-b-xl overflow-hidden ${expanded ? "" : ""}`}>
        <AnimatePresence initial={false}>
          {displayItems.map((item, index) => (
            <motion.div
              key={item.video_id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`flex items-center gap-2.5 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-accent/50 transition-colors ${getRankBg(index)}`}
              onClick={() => onSelectVideo?.(item.video_id)}
            >
              {/* Rank */}
              <div className="shrink-0 flex items-center justify-center w-6">
                {getRankIcon(index)}
              </div>

              {/* Thumbnail */}
              <div className="shrink-0 w-14 h-9 rounded-md overflow-hidden bg-muted">
                {item.video?.thumbnail_url ? (
                  <img src={item.video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">🎬</div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold line-clamp-1 text-foreground">{item.video?.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Avatar
                    className="h-4 w-4 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onCreatorClick?.(item.video!.user_id); }}
                  >
                    <AvatarImage src={item.video?.profiles.avatar_url || ""} />
                    <AvatarFallback className="text-[8px] bg-secondary">
                      {item.video?.profiles.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <StaffBadge userId={item.video!.user_id} size={10} />
                  <CreatorBadge userId={item.video!.user_id} size={10} />
                  <span
                    className="text-[10px] text-muted-foreground truncate cursor-pointer hover:underline"
                    onClick={(e) => { e.stopPropagation(); onCreatorClick?.(item.video!.user_id); }}
                  >
                    {item.video?.profiles.username}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="shrink-0 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{item.weekly_views}</span>
                <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3 text-green-500" />{item.weekly_likes}</span>
                <span className="flex items-center gap-0.5"><ThumbsDown className="h-3 w-3 text-red-400" />{item.weekly_dislikes}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaderboard.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-1.5 text-[11px] text-primary hover:underline bg-muted/30"
          >
            Show all {leaderboard.length} videos
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoLeaderboard;
