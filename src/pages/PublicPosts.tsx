import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageCircle, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMessageText } from "@/utils/textFormatting";

interface UnifiedPost {
  id: string;
  source: "post" | "subcross";
  user_id: string;
  title?: string | null;
  content: string | null;
  image_url: string | null;
  video_url?: string | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  subcross?: { name: string; display_name: string } | null;
}

const formatTime = (s: string) => {
  const d = Date.now() - new Date(s).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const PublicPosts = () => {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Posts · Cross Chat";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Browse all posts and Crossunity community posts from Cross Chat.");
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [postsRes, subRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, user_id, content, image_url, video_url, likes_count, dislikes_count, comments_count, created_at, profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("subcross_posts")
        .select("id, user_id, title, content, image_url, likes_count, dislikes_count, comments_count, created_at, profiles(username, avatar_url), subcrosses(name, display_name)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const a: UnifiedPost[] = (postsRes.data || []).map((p: any) => ({
      ...p, source: "post" as const, subcross: null,
    }));
    const b: UnifiedPost[] = (subRes.data || []).map((p: any) => ({
      ...p, source: "subcross" as const, subcross: p.subcrosses ?? null, video_url: null,
    }));
    const merged = [...a, ...b].sort(
      (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
    );
    setPosts(merged);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-primary">All Posts</h1>
          </div>
          <Link to="/auth">
            <Button size="sm" variant="outline">Sign in</Button>
          </Link>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="max-w-2xl mx-auto p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No posts yet.</div>
          ) : (
            posts.map((p) => (
              <article key={`${p.source}-${p.id}`} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{(p.profiles?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-semibold truncate">{p.profiles?.username || "User"}</span>
                      {p.subcross && (
                        <span className="text-xs text-muted-foreground truncate">
                          in c/{p.subcross.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(p.created_at)}</span>
                  </div>
                </div>

                {p.title && <h2 className="text-base font-semibold">{p.title}</h2>}
                {p.content && (
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {formatMessageText(p.content)}
                  </div>
                )}
                {p.image_url && (
                  <img src={p.image_url} alt="" className="rounded-lg w-full max-h-96 object-cover" loading="lazy" />
                )}
                {p.video_url && (
                  <video src={p.video_url} controls className="rounded-lg w-full max-h-96" preload="metadata" />
                )}

                <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {p.likes_count}</span>
                  <span className="flex items-center gap-1"><ThumbsDown className="h-3.5 w-3.5" /> {p.dislikes_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {p.comments_count}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default PublicPosts;
