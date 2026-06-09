import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Send, Reply, CornerDownRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface PostCommentsProps {
  postId: string;
  currentUserId: string;
  onCommentsCountChange: (count: number) => void;
  onCreatorClick?: (id: string) => void;
}

const PostComments = ({ postId, currentUserId, onCommentsCountChange, onCreatorClick }: PostCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComments(); }, [postId]);

  const fetchComments = async () => {
    const { data } = await (supabase as any)
      .from('post_comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    const items = (data || []) as unknown as Comment[];
    setComments(items);
    onCommentsCountChange(items.length);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    const { escapeUnauthorizedCreatorEmojis } = await import("@/utils/creatorEmojis");
    const safe = await escapeUnauthorizedCreatorEmojis(newComment.trim(), currentUserId);
    const { error } = await (supabase as any).from('post_comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: safe,
      parent_id: replyingTo?.id ?? null,
    });
    if (error) { toast.error("Failed to comment"); return; }
    setNewComment("");
    setReplyingTo(null);
    fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from('post_comments').delete().eq('id', commentId);
    fetchComments();
  };

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const renderComment = (c: Comment, depth = 0) => {
    const replies = comments.filter(x => x.parent_id === c.id);
    return (
      <div key={c.id} style={{ marginLeft: depth > 0 ? Math.min(depth, 3) * 14 : 0 }}>
        <div className="flex gap-2 group">
          {depth > 0 && <CornerDownRight className="h-3 w-3 text-muted-foreground mt-1.5 shrink-0" />}
          <Avatar className="h-6 w-6 shrink-0 cursor-pointer" onClick={() => onCreatorClick?.(c.user_id)}>
            <AvatarImage src={c.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-secondary">{c.profiles.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium cursor-pointer hover:underline" onClick={() => onCreatorClick?.(c.user_id)}>
                {c.profiles.username}
              </span>
              <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
            </div>
            <p className="text-xs break-words">{c.content}</p>
            <button
              type="button"
              onClick={() => setReplyingTo(c)}
              className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 mt-0.5"
            >
              <Reply className="h-2.5 w-2.5" /> Reply
            </button>
          </div>
          {c.user_id === currentUserId && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(c.id)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">{replies.map(r => renderComment(r, depth + 1))}</div>
        )}
      </div>
    );
  };

  const topLevel = comments.filter(c => !c.parent_id);

  return (
    <div className="border-t border-border">
      <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
        ) : topLevel.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
        ) : (
          topLevel.map(c => renderComment(c))
        )}
      </div>
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-1 bg-muted/40 border-t border-border text-[11px]">
          <span className="text-muted-foreground truncate">Replying to <span className="font-medium text-foreground">{replyingTo.profiles.username}</span></span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyingTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex gap-2 px-3 py-2 border-t border-border">
        <Input
          placeholder={replyingTo ? `Reply to ${replyingTo.profiles.username}…` : "Write a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="h-8 text-sm"
          maxLength={500}
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSubmit} disabled={!newComment.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default PostComments;
