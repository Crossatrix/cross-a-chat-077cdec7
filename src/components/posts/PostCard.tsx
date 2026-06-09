import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageCircle, Trash2, Pencil, BarChart3 } from "lucide-react";
import EditPostDialog from "./EditPostDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creditCroins } from "@/utils/croins";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "@/components/video/CreatorBadge";
import FeaturedAvatar from "@/components/video/FeaturedAvatar";
import { formatMessageText } from "@/utils/textFormatting";
import PostComments from "./PostComments";
import OwnerBoostButton from "@/components/OwnerBoostButton";
import AiSummaryButton from "@/components/AiSummaryButton";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  poll_question: string | null;
  poll_options: string[] | null;
  poll_boosts?: Record<string, number> | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles: { username: string; avatar_url: string | null };
}


interface PostCardProps {
  post: Post;
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
  onDeleted?: () => void;
}

const PostCard = ({ post, currentUserId, onCreatorClick, onDeleted }: PostCardProps) => {
  const [liked, setLiked] = useState<boolean | null>(null); // null = no vote, true = like, false = dislike
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showComments, setShowComments] = useState(false);
  const [pollVotes, setPollVotes] = useState<Record<number, number>>({});
  const [myPollVote, setMyPollVote] = useState<number | null>(null);
  const [totalPollVotes, setTotalPollVotes] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchLikeStatus();
    if (post.poll_question) fetchPollVotes();
  }, [post.id]);

  const fetchLikeStatus = async () => {
    const { data } = await supabase
      .from('post_likes')
      .select('is_like')
      .eq('post_id', post.id)
      .eq('user_id', currentUserId)
      .maybeSingle();
    if (data) setLiked(data.is_like);
  };

  const fetchPollVotes = async () => {
    const [{ data: votes }, { data: myVote }, { data: freshPost }] = await Promise.all([
      supabase.from('post_poll_votes').select('option_index').eq('post_id', post.id),
      supabase.from('post_poll_votes').select('option_index').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle(),
      (supabase as any).from('posts').select('poll_boosts').eq('id', post.id).maybeSingle(),
    ]);
    const counts: Record<number, number> = {};
    let total = 0;
    (votes || []).forEach(v => { counts[v.option_index] = (counts[v.option_index] || 0) + 1; total++; });
    const boosts = (freshPost?.poll_boosts || post.poll_boosts || {}) as Record<string, number>;
    Object.entries(boosts).forEach(([k, v]) => {
      const idx = parseInt(k, 10);
      const n = Number(v) || 0;
      counts[idx] = (counts[idx] || 0) + n;
      total += n;
    });
    setPollVotes(counts);
    setTotalPollVotes(total);
    if (myVote) setMyPollVote(myVote.option_index);
  };

  const handleLike = async (isLike: boolean) => {
    if (liked === isLike) {
      // Remove vote
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      setLikesCount(c => isLike ? c - 1 : c);
      setDislikesCount(c => !isLike ? c - 1 : c);
      setLiked(null);
      // Update post counts
      await supabase.from('posts').update({
        likes_count: isLike ? Math.max(0, likesCount - 1) : likesCount,
        dislikes_count: !isLike ? Math.max(0, dislikesCount - 1) : dislikesCount,
      }).eq('id', post.id);
    } else {
      // Upsert vote
      const { error } = await supabase.from('post_likes').upsert(
        { post_id: post.id, user_id: currentUserId, is_like: isLike },
        { onConflict: 'post_id,user_id' }
      );
      if (error) { toast.error("Failed to vote"); return; }

      let newLikes = likesCount;
      let newDislikes = dislikesCount;
      if (liked === true) newLikes--;
      if (liked === false) newDislikes--;
      if (isLike) newLikes++;
      else newDislikes++;

      // Award 1 Croin to post owner for a new like
      if (isLike && liked === null && post.user_id !== currentUserId) {
        creditCroins(post.user_id, 1, "Like on post");
      }

      setLikesCount(newLikes);
      setDislikesCount(newDislikes);
      setLiked(isLike);
      await supabase.from('posts').update({ likes_count: newLikes, dislikes_count: newDislikes }).eq('id', post.id);
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (myPollVote === optionIndex) return;
    const { error } = await supabase.from('post_poll_votes').upsert(
      { post_id: post.id, user_id: currentUserId, option_index: optionIndex },
      { onConflict: 'post_id,user_id' }
    );
    if (error) { toast.error("Failed to vote"); return; }
    setMyPollVote(optionIndex);
    fetchPollVotes();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) { toast.error("Failed to delete post"); return; }
    toast.success("Post deleted");
    onDeleted?.();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 pb-0">
        <FeaturedAvatar
          userId={post.user_id}
          avatarUrl={post.profiles.avatar_url}
          username={post.profiles.username}
          avatarClassName="h-9 w-9"
          fallbackClassName="bg-secondary text-foreground text-sm"
          className="shrink-0 cursor-pointer"
          onClick={() => onCreatorClick?.(post.user_id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <StaffBadge userId={post.user_id} size={14} />
            <CreatorBadge userId={post.user_id} size={14} />
            <span className="text-sm font-semibold truncate cursor-pointer hover:underline" onClick={() => onCreatorClick?.(post.user_id)}>
              {post.profiles.username}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">{formatDate(post.created_at)}</span>
            {post.updated_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000 && (
              <span className="text-[11px] text-muted-foreground italic">(edited)</span>
            )}
          </div>
        </div>
        {post.user_id === currentUserId && (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {post.content && <p className="text-sm whitespace-pre-wrap break-words">{formatMessageText(post.content)}</p>}
      </div>

      {/* Media */}
      {post.image_url && (
        <div className="px-3 pb-2">
          <img src={post.image_url} alt="Post" className="rounded-lg w-full max-h-96 object-cover" />
        </div>
      )}
      {post.video_url && (
        <div className="px-3 pb-2">
          <video src={post.video_url} controls className="rounded-lg w-full max-h-96" />
        </div>
      )}

      {/* Poll */}
      {post.poll_question && post.poll_options && (
        <div className="px-3 pb-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">{post.poll_question}</p>
          </div>
          {(post.poll_options as string[]).map((option, i) => {
            const voteCount = pollVotes[i] || 0;
            const pct = totalPollVotes > 0 ? Math.round((voteCount / totalPollVotes) * 100) : 0;
            const isMyVote = myPollVote === i;
            return (
              <button
                key={i}
                onClick={() => handlePollVote(i)}
                className={`w-full relative rounded-lg border text-left p-2.5 text-sm transition-colors ${
                  isMyVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 rounded-lg bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                <div className="relative flex justify-between items-center">
                  <span className={isMyVote ? "font-medium" : ""}>{option}</span>
                  <span className="text-xs text-muted-foreground ml-2">{pct}%</span>
                </div>
              </button>
            );
          })}
          <p className="text-[11px] text-muted-foreground">{totalPollVotes} vote{totalPollVotes !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 text-xs ${liked === true ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => handleLike(true)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {likesCount > 0 && likesCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 text-xs ${liked === false ? 'text-destructive' : 'text-muted-foreground'}`}
          onClick={() => handleLike(false)}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {dislikesCount > 0 && dislikesCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentsCount > 0 && commentsCount}
        </Button>
      </div>

      {/* Comments */}
      {showComments && (
        <PostComments
          postId={post.id}
          currentUserId={currentUserId}
          onCommentsCountChange={(count) => {
            setCommentsCount(count);
            supabase.from('posts').update({ comments_count: count }).eq('id', post.id);
          }}
          onCreatorClick={onCreatorClick}
        />
      )}

      {/* Edit Dialog */}
      <EditPostDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        post={post}
        onUpdated={() => onDeleted?.()}
      />
    </div>
  );
};

export default PostCard;
