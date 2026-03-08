import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreatePostDialog from "./CreatePostDialog";
import PostCard from "./PostCard";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  poll_question: string | null;
  poll_options: string[] | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface PostsFeedProps {
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
  /** If set, only show posts by this user */
  filterUserId?: string;
  /** If true, also show posts from followed creators */
  showFollowed?: boolean;
  hideCreateButton?: boolean;
}

const PostsFeed = ({ currentUserId, onCreatorClick, filterUserId, showFollowed, hideCreateButton }: PostsFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [filterUserId, showFollowed]);

  const fetchPosts = async () => {
    setLoading(true);

    if (filterUserId) {
      // Show only this user's posts
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .eq('user_id', filterUserId)
        .order('created_at', { ascending: false })
        .limit(100);
      setPosts((data || []) as unknown as Post[]);
    } else if (showFollowed) {
      // Show posts from followed creators + own posts
      const { data: follows } = await supabase
        .from('video_follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followedIds = (follows || []).map(f => f.following_id);
      const allIds = [...new Set([currentUserId, ...followedIds])];

      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .in('user_id', allIds)
        .order('created_at', { ascending: false })
        .limit(100);
      setPosts((data || []) as unknown as Post[]);
    } else {
      // Show all posts (explore)
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);
      setPosts((data || []) as unknown as Post[]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Posts</h2>
        </div>
        {!hideCreateButton && (
          <CreatePostDialog currentUserId={currentUserId} onPostCreated={fetchPosts} />
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground">
              {filterUserId ? "This creator hasn't posted yet." : "Be the first to share something!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onCreatorClick={onCreatorClick}
                onDeleted={fetchPosts}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default PostsFeed;
