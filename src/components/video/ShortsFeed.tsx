import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, UserPlus, UserMinus, MessageCircle, Send, Trash2, Flag, EyeOff, Ban, ShieldAlert } from "lucide-react";
import { getCategoryLabel, getCategoryIcon } from "@/utils/videoCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creditCroins, checkViewMilestone } from "@/utils/croins";
import StaffBadge from "@/components/StaffBadge";
import AdPlayer, { pickRandomAd } from "./AdPlayer";
import CreatorBadge from "./CreatorBadge";
import AgeVerificationDialog from "./AgeVerificationDialog";
import FeaturedAvatar from "./FeaturedAvatar";

interface Short {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  category: string;
  adults_only?: boolean;
  profiles: { username: string; avatar_url: string | null };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface ShortsFeedProps {
  currentUserId: string;
  onCreatorClick?: (creatorId: string) => void;
}

const ShortsFeed = ({ currentUserId, onCreatorClick }: ShortsFeedProps) => {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Record<string, boolean | null>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [localCounts, setLocalCounts] = useState<Record<string, { likes: number; dislikes: number }>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const [commentsVideoOwnerId, setCommentsVideoOwnerId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportVideoId, setReportVideoId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const viewedSet = useRef<Set<string>>(new Set());
  const adShownSet = useRef<Set<number>>(new Set());
  const [showingAd, setShowingAd] = useState(false);
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [ageVerifyOpen, setAgeVerifyOpen] = useState(false);

  useEffect(() => {
    fetchShorts();
    checkAgeVerification();
  }, []);

  const checkAgeVerification = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("age_verified")
      .eq("id", currentUserId)
      .single();
    if (data) setAgeVerified(!!(data as any).age_verified);
  };

  const fetchShorts = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("videos")
      .select("*, profiles!videos_user_id_fkey(username, avatar_url)")
      .or("duration.lte.180,duration.is.null")
      .order("created_at", { ascending: false }) as any).eq("moderation_status", "approved");

    if (data) {
      // Fetch verifications, user prefs, and blocked categories in parallel
      const [{ data: verifications }, { data: categoryPrefs }, { data: blockedCatsData }] = await Promise.all([
        supabase.from("creator_verifications").select("user_id, status"),
        supabase.from("video_category_views").select("category, view_count").eq("user_id", currentUserId),
        supabase.from("blocked_categories" as any).select("category").eq("user_id", currentUserId),
      ]);

      const blockedCats = new Set((blockedCatsData || []).map((d: any) => d.category));

      const verifiedMap = new Map<string, string>();
      verifications?.forEach(v => verifiedMap.set(v.user_id, v.status));

      const prefMap: Record<string, number> = {};
      categoryPrefs?.forEach(p => { prefMap[p.category] = p.view_count; });
      const totalViews = Object.values(prefMap).reduce((a, b) => a + b, 0) || 1;

      const filtered = (data as unknown as Short[]).filter(s => !blockedCats.has(s.category));

      const sorted = [...filtered].sort((a, b) => {
        const aStatus = verifiedMap.get(a.user_id) || "";
        const bStatus = verifiedMap.get(b.user_id) || "";
        const priority = (s: string) => s === "verified_plus" ? 3 : s === "verified" ? 2 : 0;
        const verifyScore = priority(bStatus) - priority(aStatus);
        if (verifyScore !== 0) return verifyScore;
        // Boost preferred categories
        const aPref = (prefMap[a.category] || 0) / totalViews;
        const bPref = (prefMap[b.category] || 0) / totalViews;
        return bPref - aPref;
      });

      setShorts(sorted);
      
      const counts: Record<string, { likes: number; dislikes: number }> = {};
      sorted.forEach(s => { counts[s.id] = { likes: s.likes_count, dislikes: s.dislikes_count }; });
      setLocalCounts(counts);

      // Fetch comment counts
      const cCounts: Record<string, number> = {};
      sorted.forEach(s => { cCounts[s.id] = s.comments_count || 0; });
      setCommentCounts(cCounts);

      if (sorted.length > 0) {
        const { data: likes } = await supabase
          .from("video_likes")
          .select("video_id, is_like")
          .eq("user_id", currentUserId)
          .in("video_id", sorted.map(s => s.id));

        const likesMap: Record<string, boolean | null> = {};
        likes?.forEach(l => { likesMap[l.video_id] = l.is_like; });
        setUserLikes(likesMap);
      }

      const uniqueCreators = [...new Set(sorted.map(s => s.user_id))];
      if (uniqueCreators.length > 0) {
        const [{ data: follows }, { data: allFollows }] = await Promise.all([
          supabase.from("video_follows").select("following_id").eq("follower_id", currentUserId).in("following_id", uniqueCreators),
          supabase.from("video_follows").select("following_id").in("following_id", uniqueCreators),
        ]);
        
        const fMap: Record<string, boolean> = {};
        follows?.forEach(f => { fMap[f.following_id] = true; });
        setFollowingMap(fMap);

        const fcMap: Record<string, number> = {};
        allFollows?.forEach(f => { fcMap[f.following_id] = (fcMap[f.following_id] || 0) + 1; });
        setFollowerCounts(fcMap);
      }
    }
    setLoading(false);
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < shorts.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, shorts.length]);

  // Check for ad when swiping to a new short
  useEffect(() => {
    if (!adShownSet.current.has(currentIndex)) {
      adShownSet.current.add(currentIndex);
      pickRandomAd(supabase).then((ad) => {
        if (ad) {
          setCurrentAd(ad);
          setShowingAd(true);
          // Pause current video while ad plays
          videoRefs.current.forEach((v) => v?.pause());
        }
      });
    }
  }, [currentIndex]);

  useEffect(() => {
    if (showingAd) return; // Don't play videos while ad is showing
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const short = shorts[i];
      if (i === currentIndex) {
        if (short?.adults_only && !ageVerified) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
        if (!viewedSet.current.has(short?.id)) {
          viewedSet.current.add(short?.id);
          const newViewCount = short.views_count + 1;
          supabase.from("videos").update({ views_count: newViewCount }).eq("id", short.id);
          trackCategoryView(short.category);
          if (checkViewMilestone(newViewCount, true) && short.user_id !== currentUserId) {
            creditCroins(short.user_id, 1, `Short view milestone (${newViewCount}): ${short.title}`);
          }
        }
      } else {
        video.pause();
      }
    });
  }, [currentIndex, shorts, ageVerified, showingAd]);

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

  const handleLike = async (shortId: string, isLike: boolean) => {
    const prev = userLikes[shortId] ?? null;

    if (prev === isLike) {
      await supabase.from("video_likes").delete().eq("video_id", shortId).eq("user_id", currentUserId);
      setUserLikes(p => ({ ...p, [shortId]: null }));
      setLocalCounts(p => ({
        ...p,
        [shortId]: {
          likes: p[shortId].likes - (isLike ? 1 : 0),
          dislikes: p[shortId].dislikes - (!isLike ? 1 : 0),
        }
      }));
    } else {
      await supabase.from("video_likes").upsert(
        { video_id: shortId, user_id: currentUserId, is_like: isLike },
        { onConflict: "video_id,user_id" }
      );
      setUserLikes(p => ({ ...p, [shortId]: isLike }));
      setLocalCounts(p => ({
        ...p,
        [shortId]: {
          likes: p[shortId].likes + (isLike ? 1 : 0) - (prev === true ? 1 : 0),
          dislikes: p[shortId].dislikes + (!isLike ? 1 : 0) - (prev === false ? 1 : 0),
        }
      }));

      // Award 1 Croin to short owner for a new like
      if (isLike && prev === null) {
        const short = shorts.find(s => s.id === shortId);
        if (short && short.user_id !== currentUserId) {
          creditCroins(short.user_id, 1, "Like on short: " + short.title);
        }
      }
    }

    const { count: newLikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", shortId).eq("is_like", true);
    const { count: newDislikes } = await supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", shortId).eq("is_like", false);
    await supabase.from("videos").update({ likes_count: newLikes ?? 0, dislikes_count: newDislikes ?? 0 }).eq("id", shortId);
    setLocalCounts(p => ({ ...p, [shortId]: { likes: newLikes ?? 0, dislikes: newDislikes ?? 0 } }));
  };

  const openComments = (videoId: string, videoOwnerId: string) => {
    setCommentsVideoId(videoId);
    setCommentsVideoOwnerId(videoOwnerId);
    setCommentsOpen(true);
    fetchComments(videoId);
  };

  const fetchComments = async (videoId: string) => {
    const { data } = await supabase
      .from("video_comments")
      .select("*, profiles(username, avatar_url)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });
    if (data) setComments(data as unknown as Comment[]);
  };

  const handleComment = async () => {
    if (!newComment.trim() || !commentsVideoId) return;
    const { error } = await supabase.from("video_comments").insert({
      video_id: commentsVideoId,
      user_id: currentUserId,
      content: newComment.trim(),
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      fetchComments(commentsVideoId);
      setCommentCounts(p => ({ ...p, [commentsVideoId]: (p[commentsVideoId] || 0) + 1 }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!commentsVideoId) return;
    await supabase.from("video_comments").delete().eq("id", commentId);
    fetchComments(commentsVideoId);
    setCommentCounts(p => ({ ...p, [commentsVideoId]: Math.max(0, (p[commentsVideoId] || 0) - 1) }));
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

  const handleFollow = async (creatorId: string) => {
    if (followingMap[creatorId]) {
      await supabase.from("video_follows").delete().eq("follower_id", currentUserId).eq("following_id", creatorId);
      setFollowingMap(p => ({ ...p, [creatorId]: false }));
      setFollowerCounts(p => ({ ...p, [creatorId]: Math.max(0, (p[creatorId] || 0) - 1) }));
    } else {
      await supabase.from("video_follows").insert({ follower_id: currentUserId, following_id: creatorId });
      setFollowingMap(p => ({ ...p, [creatorId]: true }));
      setFollowerCounts(p => ({ ...p, [creatorId]: (p[creatorId] || 0) + 1 }));
    }
  };

  const handleReportVideo = async () => {
    if (!reportReason.trim() || !reportVideoId) return;
    setReporting(true);
    try {
      const { error } = await supabase.from("video_reports" as any).insert({
        video_id: reportVideoId,
        reporter_id: currentUserId,
        reason: reportReason.trim(),
      });
      if (error) throw error;

      toast.info("Analyzing report with AI...");
      const { data: reports } = await supabase
        .from("video_reports" as any)
        .select("id")
        .eq("video_id", reportVideoId)
        .eq("reporter_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        await supabase.functions.invoke("video-moderator", {
          body: { reportId: (reports[0] as any).id },
        });
      }

      toast.success("Video reported! Staff will review it.");
      setReportOpen(false);
      setReportReason("");
      setReportVideoId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to report video");
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading shorts...</p>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <h3 className="text-lg font-semibold mb-2">No shorts yet</h3>
        <p className="text-sm text-muted-foreground">Upload a video under 3 minutes to create a short!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-scroll snap-y snap-mandatory relative"
      onScroll={handleScroll}
      style={{ scrollSnapType: "y mandatory" }}
    >
      {/* Ad overlay */}
      {showingAd && currentAd && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
          <AdPlayer
            ad={currentAd}
            onAdComplete={() => {
              setShowingAd(false);
              setCurrentAd(null);
            }}
          />
        </div>
      )}
      {shorts.map((short, index) => (
        <div
          key={short.id}
          className="h-full snap-start snap-always relative flex items-center justify-center bg-black"
          style={{ scrollSnapAlign: "start" }}
        >
          <video
            ref={(el) => { videoRefs.current[index] = el; }}
            src={short.video_url}
            className="h-full w-full object-contain"
            loop
            muted={index !== currentIndex}
            playsInline
            preload="metadata"
            onClick={(e) => {
              const video = e.currentTarget;
              if (video.paused) video.play();
              else video.pause();
            }}
          />

          {/* Category badge */}
          <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
            {getCategoryIcon(short.category)} {short.category}
          </span>

          {/* Age gate overlay for adult content */}
          {short.adults_only && !ageVerified && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-3">
              <ShieldAlert className="h-16 w-16 text-destructive" />
              <h3 className="text-white text-xl font-bold">18+ Content</h3>
              <p className="text-white/70 text-sm text-center px-8">This short contains adult content. Verify your age to watch.</p>
              <Button
                variant="destructive"
                className="mt-2"
                onClick={() => setAgeVerifyOpen(true)}
              >
                Verify Age
              </Button>
            </div>
          )}

          {/* Right side action buttons */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
            <button
              className="flex flex-col items-center gap-0.5"
              onClick={() => handleLike(short.id, true)}
            >
              <div className={`p-2 rounded-full ${userLikes[short.id] === true ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"}`}>
                <ThumbsUp className="h-5 w-5" />
              </div>
              <span className="text-white text-xs font-medium drop-shadow">{localCounts[short.id]?.likes || 0}</span>
            </button>

            <button
              className="flex flex-col items-center gap-0.5"
              onClick={() => handleLike(short.id, false)}
            >
              <div className={`p-2 rounded-full ${userLikes[short.id] === false ? "bg-destructive text-destructive-foreground" : "bg-black/40 text-white"}`}>
                <ThumbsDown className="h-5 w-5" />
              </div>
              <span className="text-white text-xs font-medium drop-shadow">{localCounts[short.id]?.dislikes || 0}</span>
            </button>

            <button
              className="flex flex-col items-center gap-0.5"
              onClick={() => openComments(short.id, short.user_id)}
            >
              <div className="p-2 rounded-full bg-black/40 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-white text-xs font-medium drop-shadow">{commentCounts[short.id] || 0}</span>
            </button>

            {short.user_id !== currentUserId && (
              <button
                className="flex flex-col items-center gap-0.5"
                onClick={() => handleFollow(short.user_id)}
              >
                <div className={`p-2 rounded-full ${followingMap[short.user_id] ? "bg-secondary text-secondary-foreground" : "bg-black/40 text-white"}`}>
                  {followingMap[short.user_id] ? <UserMinus className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
              </button>
            )}
            {short.user_id !== currentUserId && (
              <button
                className="flex flex-col items-center gap-0.5"
                onClick={async () => {
                  const { data: inserted } = await supabase.from("video_not_interested" as any).insert({
                    user_id: currentUserId,
                    video_id: short.id,
                    creator_id: short.user_id,
                    category: short.category || "other",
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
                }}
              >
                <div className="p-2 rounded-full bg-black/40 text-white">
                  <EyeOff className="h-5 w-5" />
                </div>
              </button>
            )}
            {short.user_id !== currentUserId && (
              <button
                className="flex flex-col items-center gap-0.5"
                onClick={async () => {
                  const cat = short.category || "other";
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
                }}
              >
                <div className="p-2 rounded-full bg-black/40 text-white">
                  <Ban className="h-5 w-5" />
                </div>
              </button>
            )}
            {short.user_id !== currentUserId && (
              <button
                className="flex flex-col items-center gap-0.5"
                onClick={() => { setReportVideoId(short.id); setReportOpen(true); }}
              >
                <div className="p-2 rounded-full bg-black/40 text-white">
                  <Flag className="h-5 w-5" />
                </div>
              </button>
            )}
          </div>

          {/* Bottom info overlay */}
          <div className="absolute bottom-4 left-3 right-16 text-white drop-shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <FeaturedAvatar
                userId={short.user_id}
                avatarUrl={short.profiles.avatar_url}
                username={short.profiles.username}
                avatarClassName="h-8 w-8 border-2 border-white"
                fallbackClassName="bg-secondary text-foreground text-xs"
                className="cursor-pointer"
                onClick={() => onCreatorClick?.(short.user_id)}
              />
              <div className="cursor-pointer" onClick={() => onCreatorClick?.(short.user_id)}>
                <div className="flex items-center gap-1">
                  <StaffBadge userId={short.user_id} size={14} />
                  <CreatorBadge userId={short.user_id} size={14} />
                  <span className="font-semibold text-sm hover:underline">{short.profiles.username}</span>
                </div>
                <span className="text-[10px] opacity-70">{followerCounts[short.user_id] || 0} followers</span>
              </div>
            </div>
            <p className="text-sm font-medium line-clamp-2">{short.title}</p>
            {short.description && (
              <p className="text-xs opacity-80 line-clamp-1 mt-0.5">{short.description}</p>
            )}
          </div>
        </div>
      ))}

      {/* Comments Sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="h-[60vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Comments ({comments.length})</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 my-2">
            <div className="space-y-3 pr-2">
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
                  {(comment.user_id === currentUserId || commentsVideoOwnerId === currentUserId) && (
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
          </ScrollArea>
          <div className="flex gap-2 pt-2 border-t border-border">
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
        </SheetContent>
      </Sheet>

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
            <Button variant="destructive" onClick={handleReportVideo} disabled={!reportReason.trim() || reporting}>
              {reporting ? "Submitting..." : "Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Age Verification Dialog */}
      <AgeVerificationDialog
        open={ageVerifyOpen}
        onOpenChange={setAgeVerifyOpen}
        onVerified={() => {
          setAgeVerified(true);
          setAgeVerifyOpen(false);
        }}
      />
    </div>
  );
};

export default ShortsFeed;
