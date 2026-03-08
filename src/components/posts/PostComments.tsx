import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
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
    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: newComment.trim(),
    });
    if (error) { toast.error("Failed to comment"); return; }
    setNewComment("");
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

  return (
    <div className="border-t border-border">
      <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
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
              </div>
              {c.user_id === currentUserId && (
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 px-3 py-2 border-t border-border">
        <Input
          placeholder="Write a comment..."
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
