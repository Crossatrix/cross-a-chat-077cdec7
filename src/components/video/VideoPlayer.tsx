import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, UserPlus, UserMinus, Trash2, Flag, EyeOff, Ban, Reply, CornerDownRight, X } from "lucide-react";
import ShareLinkButton from "@/components/ShareLinkButton";
import OwnerBoostButton from "@/components/OwnerBoostButton";
import AiSummaryButton from "@/components/AiSummaryButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creditCroins, checkViewMilestone } from "@/utils/croins";
import { checkProStatus } from "@/utils/proSubscription";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "./CreatorBadge";
import FeaturedAvatar from "./FeaturedAvatar";
import VideoStarRating from "./VideoStarRating";
import { getCategoryLabel } from "@/utils/videoCategories";
import { getStaffRole, isAtLeast } from "@/utils/roleConfig";
import AdPlayer, { pickRandomAd } from "./AdPlayer";

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

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface VideoPlayerProps {
  video: Video;
  currentUserId: string;
  onBack: () => void;
  onCreatorClick?: (creatorId: string) => void;
}

const VideoPlayer = ({ video, currentUserId, onBack, onCreatorClick }: VideoPlayerProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [userLike, setUserLike] = useState<boolean | null>(null);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [dislikesCount, setDislikesCount] = useState(video.dislikes_count);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [viewCounted, setViewCounted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [isElderModOrAbove, setIsElderModOrAbove] = useState(false);
  const [showingAd, setShowingAd] = useState(true);
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [adChecked, setAdChecked] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchUserLike();
    fetchFollowStatus();
    fetchFollowerCount();
    incrementView();
    fetchStaffRole();
    // Check for ad (respecting Pro status)
    checkProStatus(currentUserId).then((isPro) => {
      pickRandomAd(supabase, isPro).then((ad) => {
        setCurrentAd(ad);
        setShowingAd(!!ad);
        setAdChecked(true);
      });
    });
  }, [video.id]);

  const fetchStaffRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUserId);
    if (data) {
      const role = getStaffRole(data as { role: string }[]);
      setIsElderModOrAbove(isAtLeast(role, "elder_moderator"));
    }
  };

  // Realtime comments
  useEffect(() => {
    const channel = supabase
      .channel(`video-comments-${video.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_comments", filter: `video_id=eq.${video.id}` }, () => {
        fetchComments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [video.id]);

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + offset);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  const incrementView = async () => {
    if (viewCounted) return;
    setViewCounted(true);
    const newViewCount = video.views_count + 1;
    await supabase.from("videos").update({ views_count: newViewCount }).eq("id", video.id);

    // Award Croin for view milestone (longform = every 10 views)
    // Determine if short by checking duration < 180s; if no duration info, assume longform
    const isShort = false; // VideoPlayer is used for longform
    if (checkViewMilestone(newViewCount, isShort) && video.user_id !== currentUserId) {
      creditCroins(video.user_id, 1, `View milestone (${newViewCount}) on: ${video.title}`);
    }

    // Track weekly stats
    const weekStart = getWeekStart();
    const { data: existing } = await supabase
      .from("video_weekly_stats")
      .select("id, weekly_views")
      .eq("video_id", video.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (existing) {
      await supabase.from("video_weekly_stats").update({ weekly_views: existing.weekly_views + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("video_weekly_stats").insert({ video_id: video.id, week_start: weekStart, weekly_views: 1 });
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("video_comments")
      .select("*, profiles(username, avatar_url)")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data as unknown as Comment[]);
  };

  const fetchUserLike = async () => {
    const { data } = await supabase
      .from("video_likes")
      .select("is_like")
      .eq("video_id", video.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (data) setUserLike(data.is_like);
  };

  const fetchFollowStatus = async () => {
    const { data } = await supabase
      .from("video_follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", video.user_id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchFollowerCount = async () => {
    const [{ count }, { data: prof }] = await Promise.all([
      supabase.from("video_follows").select("*", { count: "exact", head: true }).eq("following_id", video.user_id),
      (supabase as any).from("profiles").select("boost_followers").eq("id", video.user_id).maybeSingle(),
    ]);
    setFollowerCount((count ?? 0) + (prof?.boost_followers ?? 0));
  };

  const handleLike = async (isLike: boolean) => {
    const prevLike = userLike;

    if (prevLike === isLike) {
      // Remove like/dislike
      await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", currentUserId);
      setUserLike(null);
      setLikesCount((c) => isLike ? c - 1 : c);
      setDislikesCount((c) => !isLike ? c - 1 : c);
    } else {
      // Upsert like/dislike
      await supabase.from("video_likes").upsert(
        { video_id: video.id, user_id: currentUserId, is_like: isLike },
        { onConflict: "video_id,user_id" }
      );
      setUserLike(isLike);
      if (isLike) {
        setLikesCount((c) => c + 1);
        if (prevLike === false) setDislikesCount((c) => c - 1);
        // Award 1 Croin to video owner for a new like (not switching from dislike)
        if (prevLike === null && video.user_id !== currentUserId) {
          creditCroins(video.user_id, 1, "Like on video: " + video.title);
        }
      } else {
        setDislikesCount((c) => c + 1);
        if (prevLike === true) setLikesCount((c) => c - 1);
      }
    }

    // Recalculate server counts
    const { count: newLikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", video.id).eq("is_like", true);
    const { count: newDislikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", video.id).eq("is_like", false);
    await supabase.from("videos").update({ likes_count: newLikes ?? 0, dislikes_count: newDislikes ?? 0 }).eq("id", video.id);
    setLikesCount(newLikes ?? 0);
    setDislikesCount(newDislikes ?? 0);

    // Update weekly stats for likes/dislikes
    const weekStart = getWeekStart();
    const { data: weeklyData } = await supabase
      .from("video_weekly_stats")
      .select("id")
      .eq("video_id", video.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    // Count this week's likes/dislikes
    const weekStartDate = weekStart + "T00:00:00.000Z";
    const { count: weekLikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", video.id).eq("is_like", true).gte("created_at", weekStartDate);
    const { count: weekDislikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", video.id).eq("is_like", false).gte("created_at", weekStartDate);

    if (weeklyData) {
      await supabase.from("video_weekly_stats").update({ weekly_likes: weekLikes ?? 0, weekly_dislikes: weekDislikes ?? 0, updated_at: new Date().toISOString() }).eq("id", weeklyData.id);
    } else {
      await supabase.from("video_weekly_stats").insert({ video_id: video.id, week_start: weekStart, weekly_likes: weekLikes ?? 0, weekly_dislikes: weekDislikes ?? 0 });
    }
  };

  const handleFollow = async () => {
    if (isFollowing) {
      await supabase.from("video_follows").delete().eq("follower_id", currentUserId).eq("following_id", video.user_id);
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("video_follows").insert({ follower_id: currentUserId, following_id: video.user_id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    const { escapeUnauthorizedCreatorEmojis } = await import("@/utils/creatorEmojis");
    const safe = await escapeUnauthorizedCreatorEmojis(newComment.trim(), currentUserId);
    const { error } = await (supabase as any).from("video_comments").insert({
      video_id: video.id,
      user_id: currentUserId,
      content: safe,
      parent_id: replyingTo?.id ?? null,
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      setReplyingTo(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("video_comments").delete().eq("id", commentId);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const { error } = await supabase.from("video_reports" as any).insert({
        video_id: video.id,
        reporter_id: currentUserId,
        reason: reportReason.trim(),
      });
      if (error) throw error;

      // Trigger AI moderation
      toast.info("Analyzing report with AI...");
      const { data: reports } = await supabase
        .from("video_reports" as any)
        .select("id")
        .eq("video_id", video.id)
        .eq("reporter_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        const { error: fnError } = await supabase.functions.invoke("video-moderator", {
          body: { reportId: (reports[0] as any).id },
        });
        if (fnError) console.error("AI review error:", fnError);
      }

      toast.success("Video reported! Staff will review it.");
      setReportOpen(false);
      setReportReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to report video");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold truncate flex-1">{video.title}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Ad or Video */}
          {showingAd && currentAd ? (
            <AdPlayer ad={currentAd} onAdComplete={() => setShowingAd(false)} />
          ) : (
            <video
              controls
              autoPlay
              src={video.video_url}
              className="w-full aspect-video bg-black"
              preload="metadata"
            />
          )}

          {/* Info */}
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">{video.title}</h1>
              <VideoStarRating
                videoId={video.id}
                currentUserId={currentUserId}
                isElderModOrAbove={isElderModOrAbove}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {video.views_count + 1} views · {formatDate(video.created_at)}
            </p>

            {/* Actions row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant={userLike === true ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => handleLike(true)}
              >
                <ThumbsUp className="h-4 w-4" /> {likesCount}
              </Button>
              <Button
                variant={userLike === false ? "destructive" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => handleLike(false)}
              >
                <ThumbsDown className="h-4 w-4" /> {dislikesCount}
              </Button>
              <ShareLinkButton action="video" id={video.id} />
              {video.user_id !== currentUserId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 ml-auto"
                    onClick={async () => {
                      const { data: inserted } = await supabase.from("video_not_interested" as any).insert({
                        user_id: currentUserId,
                        video_id: video.id,
                        creator_id: video.user_id,
                        category: (video as any).category || "other",
                      }).select("id").single();
                      toast("We'll show less content like this", {
                        action: {
                          label: "Undo",
                          onClick: async () => {
                            if (inserted) {
                              await supabase.from("video_not_interested" as any).delete().eq("id", (inserted as any).id);
                              toast.success("Removed from Not Interested");
                            }
                          },
                        },
                      });
                      onBack();
                    }}
                  >
                    <EyeOff className="h-4 w-4" /> Not Interested
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={async () => {
                      const cat = (video as any).category || "other";
                      const { error } = await supabase.from("blocked_categories" as any).insert({
                        user_id: currentUserId,
                        category: cat,
                      });
                      if (error && error.code === "23505") {
                        toast.info("Category already blocked");
                        return;
                      }
                      if (error) {
                        toast.error("Failed to block category");
                        return;
                      }
                      toast(`Blocked ${getCategoryLabel(cat)}`, {
                        action: {
                          label: "Undo",
                          onClick: async () => {
                            await supabase.from("blocked_categories" as any).delete().eq("user_id", currentUserId).eq("category", cat);
                            toast.success("Unblocked category");
                          },
                        },
                      });
                      onBack();
                    }}
                  >
                    <Ban className="h-4 w-4" /> Block Category
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setReportOpen(true)}
                  >
                    <Flag className="h-4 w-4" /> Report
                  </Button>
                </>
              )}
            </div>

            {/* Creator info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <FeaturedAvatar
                userId={video.user_id}
                avatarUrl={video.profiles.avatar_url}
                username={video.profiles.username}
                avatarClassName="h-10 w-10"
                fallbackClassName="bg-secondary text-foreground"
                className="cursor-pointer"
                onClick={() => onCreatorClick?.(video.user_id)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onCreatorClick?.(video.user_id)}>
                <div className="flex items-center gap-1">
                  <StaffBadge userId={video.user_id} size={16} />
                  <CreatorBadge userId={video.user_id} size={16} />
                  <span className="font-medium text-sm truncate hover:underline">{video.profiles.username}</span>
                </div>
                <p className="text-xs text-muted-foreground">{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</p>
              </div>
              {video.user_id !== currentUserId && (
                <Button
                  variant={isFollowing ? "secondary" : "default"}
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={handleFollow}
                >
                  {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              )}
            </div>

            {video.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{video.description}</p>
            )}

            {/* Comments */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Comments ({comments.length})</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={comment.profiles.avatar_url || ""} />
                      <AvatarFallback className="bg-secondary text-foreground text-[10px]">
                        {comment.profiles.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <StaffBadge userId={comment.user_id} size={12} />
                        <CreatorBadge userId={comment.user_id} size={12} />
                        <span className="text-xs font-medium">{comment.profiles.username}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                    {(comment.user_id === currentUserId || video.user_id === currentUserId) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Video</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe why you're reporting this video..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReport} disabled={!reportReason.trim() || reporting}>
              {reporting ? "Submitting..." : "Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoPlayer;
