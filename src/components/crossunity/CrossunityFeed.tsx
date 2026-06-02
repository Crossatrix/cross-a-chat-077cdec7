import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Plus, ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Loader2, Search, Trash2, Send, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PostsFeed from "@/components/posts/PostsFeed";

interface Subcross {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  members_count: number;
  created_by: string;
}
interface Post {
  id: string;
  subcross_id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
  subcrosses?: { name: string; display_name: string };
}
interface Comment {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface Props { currentUserId: string; onCreatorClick?: (id: string) => void; }

const sb = supabase as any;

const formatTime = (s: string) => {
  const d = Date.now() - new Date(s).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const CrossunityFeed = ({ currentUserId, onCreatorClick }: Props) => {
  const [view, setView] = useState<"home" | "subcross" | "post" | "posts">("home");
  const [subcrosses, setSubcrosses] = useState<Subcross[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeSub, setActiveSub] = useState<Subcross | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const loadHome = async () => {
    setLoading(true);
    const [{ data: subs }, { data: ps }, { data: mems }, { data: pv }] = await Promise.all([
      sb.from("subcrosses").select("*").order("members_count", { ascending: false }).limit(50),
      sb.from("subcross_posts")
        .select("*, profiles(username, avatar_url), subcrosses(name, display_name)")
        .order("created_at", { ascending: false }).limit(100),
      sb.from("subcross_members").select("subcross_id").eq("user_id", currentUserId),
      sb.from("subcross_post_votes").select("post_id, is_like").eq("user_id", currentUserId),
    ]);
    setSubcrosses(subs || []);
    setPosts(ps || []);
    setMemberOf(new Set((mems || []).map((m: any) => m.subcross_id)));
    const v: Record<string, boolean> = {};
    (pv || []).forEach((x: any) => { v[`p:${x.post_id}`] = x.is_like; });
    setVotes(v);
    setLoading(false);
  };

  useEffect(() => { loadHome(); }, []);

  const openSub = async (sub: Subcross) => {
    setActiveSub(sub);
    setView("subcross");
    const { data } = await sb.from("subcross_posts")
      .select("*, profiles(username, avatar_url), subcrosses(name, display_name)")
      .eq("subcross_id", sub.id).order("created_at", { ascending: false }).limit(100);
    setPosts(data || []);
  };

  const toggleMembership = async (subId: string) => {
    if (memberOf.has(subId)) {
      await sb.from("subcross_members").delete().eq("subcross_id", subId).eq("user_id", currentUserId);
      const n = new Set(memberOf); n.delete(subId); setMemberOf(n);
    } else {
      await sb.from("subcross_members").insert({ subcross_id: subId, user_id: currentUserId });
      setMemberOf(new Set([...memberOf, subId]));
    }
  };

  const votePost = async (post: Post, isLike: boolean) => {
    const key = `p:${post.id}`;
    const current = votes[key];
    if (current === isLike) {
      await sb.from("subcross_post_votes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      const v = { ...votes }; delete v[key]; setVotes(v);
      setPosts(ps => ps.map(p => p.id === post.id ? {
        ...p,
        likes_count: p.likes_count - (isLike ? 1 : 0),
        dislikes_count: p.dislikes_count - (isLike ? 0 : 1),
      } : p));
    } else if (current === undefined) {
      await sb.from("subcross_post_votes").insert({ post_id: post.id, user_id: currentUserId, is_like: isLike });
      setVotes({ ...votes, [key]: isLike });
      setPosts(ps => ps.map(p => p.id === post.id ? {
        ...p,
        likes_count: p.likes_count + (isLike ? 1 : 0),
        dislikes_count: p.dislikes_count + (isLike ? 0 : 1),
      } : p));
    } else {
      await sb.from("subcross_post_votes").update({ is_like: isLike }).eq("post_id", post.id).eq("user_id", currentUserId);
      setVotes({ ...votes, [key]: isLike });
      setPosts(ps => ps.map(p => p.id === post.id ? {
        ...p,
        likes_count: p.likes_count + (isLike ? 1 : -1),
        dislikes_count: p.dislikes_count + (isLike ? -1 : 1),
      } : p));
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await sb.from("subcross_posts").delete().eq("id", id);
    setPosts(ps => ps.filter(p => p.id !== id));
    if (activePost?.id === id) { setActivePost(null); setView(activeSub ? "subcross" : "home"); }
    toast.success("Deleted");
  };

  const filteredSubs = subcrosses.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.display_name.toLowerCase().includes(search.toLowerCase())
  );

  // ============ POSTS (c/posts) ============
  if (view === "posts") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("home")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-primary truncate">c/posts</h2>
        </div>
        <div className="flex-1 min-h-0">
          <PostsFeed currentUserId={currentUserId} onCreatorClick={onCreatorClick} />
        </div>
      </div>
    );
  }

  // ============ POST DETAIL ============
  if (view === "post" && activePost) {
    return <PostDetail post={activePost} currentUserId={currentUserId}
      onBack={() => setView(activeSub ? "subcross" : "home")}
      onCreatorClick={onCreatorClick}
      onDelete={deletePost}
      onVote={votePost}
      votes={votes}
    />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {view !== "home" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setView("home"); setActiveSub(null); loadHome(); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-primary truncate">
            {view === "subcross" && activeSub ? `c/${activeSub.name}` : "Crossunity"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {view === "subcross" && activeSub && (
            <Button size="sm" variant={memberOf.has(activeSub.id) ? "secondary" : "default"}
              onClick={() => toggleMembership(activeSub.id)}>
              {memberOf.has(activeSub.id) ? "Joined" : "Join"}
            </Button>
          )}
          <Button size="sm" onClick={() => setCreatePostOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Post
          </Button>
          {view === "home" && (
            <Button size="sm" variant="outline" onClick={() => setCreateSubOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Subcross
            </Button>
          )}
        </div>
      </div>

      {view === "home" && (
        <div className="p-3 border-b border-border bg-card shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search subcrosses..." className="pl-8 h-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
            <button onClick={() => setView("posts")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/40 rounded-full text-xs whitespace-nowrap hover:bg-primary/25 text-primary font-semibold">
              <FileText className="h-3.5 w-3.5" />
              c/posts
            </button>
            {filteredSubs.map(s => (
              <button key={s.id} onClick={() => openSub(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-xs whitespace-nowrap hover:bg-secondary/80">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={s.icon_url || undefined} />
                  <AvatarFallback className="text-[9px]">c/</AvatarFallback>
                </Avatar>
                c/{s.name} <span className="text-muted-foreground">{s.members_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "subcross" && activeSub?.banner_url && (
        <img src={activeSub.banner_url} alt="" className="w-full h-24 object-cover" />
      )}
      {view === "subcross" && activeSub && (
        <div className="p-3 border-b border-border bg-card shrink-0 flex gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={activeSub.icon_url || undefined} />
            <AvatarFallback>c/</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold">{activeSub.display_name}</h3>
            <p className="text-xs text-muted-foreground">c/{activeSub.name} · {activeSub.members_count} members</p>
            {activeSub.description && <p className="text-xs mt-1">{activeSub.description}</p>}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to post!</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {posts.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  {p.subcrosses && (
                    <button onClick={() => { const s = subcrosses.find(x => x.name === p.subcrosses!.name); if (s) openSub(s); }}
                      className="font-semibold text-foreground hover:underline">c/{p.subcrosses.name}</button>
                  )}
                  <span>·</span>
                  <button onClick={() => onCreatorClick?.(p.user_id)} className="hover:underline">u/{p.profiles.username}</button>
                  <span>·</span><span>{formatTime(p.created_at)}</span>
                </div>
                <button onClick={() => { setActivePost(p); setView("post"); }} className="text-left w-full">
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  {p.content && <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{p.content}</p>}
                  {p.image_url && <img src={p.image_url} alt="" className="rounded-lg mt-2 max-h-80 w-full object-cover" />}
                </button>
                <div className="flex items-center gap-1 mt-2">
                  <Button variant="ghost" size="sm" className={`h-7 px-2 ${votes[`p:${p.id}`] === true ? "text-primary" : ""}`}
                    onClick={() => votePost(p, true)}>
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />{p.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className={`h-7 px-2 ${votes[`p:${p.id}`] === false ? "text-destructive" : ""}`}
                    onClick={() => votePost(p, false)}>
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />{p.dislikes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2"
                    onClick={() => { setActivePost(p); setView("post"); }}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />{p.comments_count}
                  </Button>
                  {p.user_id === currentUserId && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 ml-auto" onClick={() => deletePost(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateSubcrossDialog open={createSubOpen} onOpenChange={setCreateSubOpen}
        currentUserId={currentUserId} onCreated={loadHome} />
      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen}
        currentUserId={currentUserId} subcrosses={subcrosses} preSelectId={activeSub?.id}
        onCreated={() => { if (view === "subcross" && activeSub) openSub(activeSub); else loadHome(); }} />
    </div>
  );
};

// ============ Post Detail Component ============
const PostDetail = ({ post, currentUserId, onBack, onCreatorClick, onDelete, onVote, votes }: {
  post: Post; currentUserId: string; onBack: () => void; onCreatorClick?: (id: string) => void;
  onDelete: (id: string) => void;
  onVote: (post: Post, isLike: boolean) => void;
  votes: Record<string, boolean>;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [cVotes, setCVotes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [postState, setPostState] = useState(post);

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: cv }] = await Promise.all([
      sb.from("subcross_comments").select("*, profiles(username, avatar_url)")
        .eq("post_id", post.id).order("created_at", { ascending: true }),
      sb.from("subcross_comment_votes").select("comment_id, is_like").eq("user_id", currentUserId),
    ]);
    setComments(cs || []);
    const v: Record<string, boolean> = {};
    (cv || []).forEach((x: any) => { v[x.comment_id] = x.is_like; });
    setCVotes(v);
    setLoading(false);
  };
  useEffect(() => { load(); }, [post.id]);

  const submit = async () => {
    if (!text.trim()) return;
    const { escapeUnauthorizedCreatorEmojis } = await import("@/utils/creatorEmojis");
    const safe = await escapeUnauthorizedCreatorEmojis(text.trim(), currentUserId);
    const { error } = await sb.from("subcross_comments").insert({
      post_id: post.id, user_id: currentUserId, content: safe,
    });
    if (error) { toast.error("Failed"); return; }
    setText(""); load();
  };
  const delC = async (id: string) => { await sb.from("subcross_comments").delete().eq("id", id); load(); };

  const voteComment = async (c: Comment, isLike: boolean) => {
    const cur = cVotes[c.id];
    if (cur === isLike) {
      await sb.from("subcross_comment_votes").delete().eq("comment_id", c.id).eq("user_id", currentUserId);
      const n = { ...cVotes }; delete n[c.id]; setCVotes(n);
      setComments(cs => cs.map(x => x.id === c.id ? { ...x,
        likes_count: x.likes_count - (isLike ? 1 : 0),
        dislikes_count: x.dislikes_count - (isLike ? 0 : 1),
      } : x));
    } else if (cur === undefined) {
      await sb.from("subcross_comment_votes").insert({ comment_id: c.id, user_id: currentUserId, is_like: isLike });
      setCVotes({ ...cVotes, [c.id]: isLike });
      setComments(cs => cs.map(x => x.id === c.id ? { ...x,
        likes_count: x.likes_count + (isLike ? 1 : 0),
        dislikes_count: x.dislikes_count + (isLike ? 0 : 1),
      } : x));
    } else {
      await sb.from("subcross_comment_votes").update({ is_like: isLike }).eq("comment_id", c.id).eq("user_id", currentUserId);
      setCVotes({ ...cVotes, [c.id]: isLike });
      setComments(cs => cs.map(x => x.id === c.id ? { ...x,
        likes_count: x.likes_count + (isLike ? 1 : -1),
        dislikes_count: x.dislikes_count + (isLike ? -1 : 1),
      } : x));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold text-primary truncate">Post</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            {postState.subcrosses && <span className="font-semibold text-foreground">c/{postState.subcrosses.name}</span>}
            <span>·</span>
            <button onClick={() => onCreatorClick?.(postState.user_id)} className="hover:underline">u/{postState.profiles.username}</button>
            <span>·</span><span>{formatTime(postState.created_at)}</span>
          </div>
          <h1 className="text-lg font-bold mb-2">{postState.title}</h1>
          {postState.content && <p className="text-sm whitespace-pre-wrap">{postState.content}</p>}
          {postState.image_url && <img src={postState.image_url} alt="" className="rounded-lg mt-2 w-full" />}
          <div className="flex items-center gap-1 mt-3">
            <Button variant="ghost" size="sm" className={`h-7 px-2 ${votes[`p:${postState.id}`] === true ? "text-primary" : ""}`}
              onClick={() => { onVote(postState, true); }}>
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />{postState.likes_count}
            </Button>
            <Button variant="ghost" size="sm" className={`h-7 px-2 ${votes[`p:${postState.id}`] === false ? "text-destructive" : ""}`}
              onClick={() => { onVote(postState, false); }}>
              <ThumbsDown className="h-3.5 w-3.5 mr-1" />{postState.dislikes_count}
            </Button>
            {postState.user_id === currentUserId && (
              <Button variant="ghost" size="sm" className="h-7 px-2 ml-auto"
                onClick={() => onDelete(postState.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
        <div className="p-3 space-y-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            comments.length === 0 ? <p className="text-sm text-muted-foreground text-center">No comments yet</p> :
            comments.map(c => (
              <div key={c.id} className="flex gap-2 group">
                <Avatar className="h-7 w-7 cursor-pointer shrink-0" onClick={() => onCreatorClick?.(c.user_id)}>
                  <AvatarImage src={c.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{c.profiles.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium hover:underline cursor-pointer" onClick={() => onCreatorClick?.(c.user_id)}>
                      u/{c.profiles.username}
                    </span>
                    <span className="text-muted-foreground">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm break-words">{c.content}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Button variant="ghost" size="sm" className={`h-6 px-1.5 text-xs ${cVotes[c.id] === true ? "text-primary" : ""}`}
                      onClick={() => voteComment(c, true)}>
                      <ThumbsUp className="h-3 w-3 mr-1" />{c.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm" className={`h-6 px-1.5 text-xs ${cVotes[c.id] === false ? "text-destructive" : ""}`}
                      onClick={() => voteComment(c, false)}>
                      <ThumbsDown className="h-3 w-3 mr-1" />{c.dislikes_count}
                    </Button>
                    {c.user_id === currentUserId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => delC(c.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </ScrollArea>
      <div className="flex gap-2 p-3 border-t border-border bg-card">
        <Input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Add a comment..." maxLength={1000} />
        <Button size="icon" onClick={submit} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============ Create Subcross ============
const CreateSubcrossDialog = ({ open, onOpenChange, currentUserId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string; onCreated: () => void;
}) => {
  const [name, setName] = useState("");
  const [display, setDisplay] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanName.length < 3) { toast.error("Name needs 3+ chars (a-z, 0-9, _)"); return; }
    if (!display.trim()) { toast.error("Display name required"); return; }
    setBusy(true);
    const { error } = await sb.from("subcrosses").insert({
      name: cleanName, display_name: display.trim(), description: desc.trim() || null,
      created_by: currentUserId,
    });
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "Name taken" : "Failed"); return; }
    toast.success("Subcross created!");
    setName(""); setDisplay(""); setDesc("");
    onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a Subcross</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Name (URL)</label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">c/</span>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="awesome_topic" maxLength={30} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Display name</label>
            <Input value={display} onChange={e => setDisplay(e.target.value)} placeholder="Awesome Topic" maxLength={50} />
          </div>
          <div>
            <label className="text-xs font-medium">Description</label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this about?" maxLength={300} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating..." : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Create Post ============
const CreatePostDialog = ({ open, onOpenChange, currentUserId, subcrosses, preSelectId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string;
  subcrosses: Subcross[]; preSelectId?: string; onCreated: () => void;
}) => {
  const [subId, setSubId] = useState<string>(preSelectId || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (preSelectId) setSubId(preSelectId); }, [preSelectId, open]);

  const submit = async () => {
    if (!subId) { toast.error("Pick a subcross"); return; }
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    let image_url: string | null = null;
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024) { toast.error("Image must be <5MB"); setBusy(false); return; }
      const path = `${currentUserId}/${Date.now()}_${imageFile.name}`;
      const { error: upErr } = await supabase.storage.from("subcross-media").upload(path, imageFile);
      if (upErr) { toast.error("Upload failed"); setBusy(false); return; }
      image_url = supabase.storage.from("subcross-media").getPublicUrl(path).data.publicUrl;
    }
    const { escapeUnauthorizedCreatorEmojis } = await import("@/utils/creatorEmojis");
    const safeContent = content.trim() ? await escapeUnauthorizedCreatorEmojis(content.trim(), currentUserId) : null;
    const { error } = await sb.from("subcross_posts").insert({
      subcross_id: subId, user_id: currentUserId,
      title: title.trim(), content: safeContent, image_url,
    });
    setBusy(false);
    if (error) { toast.error("Failed"); return; }
    toast.success("Posted!");
    setTitle(""); setContent(""); setImageFile(null);
    onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a Post</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Subcross</label>
            <select value={subId} onChange={e => setSubId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Select...</option>
              {subcrosses.map(s => <option key={s.id} value={s.id}>c/{s.name}</option>)}
            </select>
          </div>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" maxLength={200} />
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Body (optional)" rows={5} maxLength={5000} />
          <div>
            <label className="text-xs font-medium">Image (optional)</label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Posting..." : "Post"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrossunityFeed;
