import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Video as VideoIcon, Music as MusicIcon, FileText, Users, Loader2,
  Eye, ThumbsUp, ThumbsDown, MessageSquare, Pencil, Trash2, TrendingUp, Heart,
} from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  name?: string | null;
  created_at: string;
  views_count?: number;
  likes_count?: number;
  dislikes_count?: number;
  comments_count?: number;
  plays_count?: number;
};

type Kind = "video" | "music" | "post" | "membership";

const tableFor = (k: Kind) => ({
  video: "videos",
  music: "music_tracks",
  post: "posts",
  membership: "channel_memberships",
}[k]);

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Item[]>([]);
  const [tracks, setTracks] = useState<Item[]>([]);
  const [posts, setPosts] = useState<Item[]>([]);
  const [memberships, setMemberships] = useState<Item[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [followers, setFollowers] = useState(0);

  const [editing, setEditing] = useState<{ kind: Kind; item: Item } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ kind: Kind; id: string } | null>(null);

  useEffect(() => {
    import("@/utils/modEvents").then(m => m.emitModEvent("openedcreatordashboard"));
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    const [v, m, p, mem, subs, foll] = await Promise.all([
      supabase.from("videos").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("music_tracks").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("channel_memberships" as any).select("*").eq("creator_id", uid).order("created_at", { ascending: false }),
      supabase.from("channel_subscriptions" as any).select("id", { count: "exact", head: true }).eq("creator_id", uid),
      supabase.from("video_follows").select("id", { count: "exact", head: true }).eq("following_id", uid),
    ]);
    setVideos((v.data || []) as any);
    setTracks((m.data || []) as any);
    setPosts((p.data || []) as any);
    setMemberships((mem.data || []) as any);
    setSubscribers(subs.count || 0);
    setFollowers(foll.count || 0);
  };

  const openEdit = (kind: Kind, item: Item) => {
    setEditing({ kind, item });
    setEditTitle((kind === "post" ? item.content : item.title || item.name) || "");
    setEditDesc(item.description || "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { kind, item } = editing;
    const patch: any = {};
    if (kind === "video" || kind === "music") { patch.title = editTitle; patch.description = editDesc; }
    else if (kind === "post") { patch.content = editTitle; }
    else if (kind === "membership") { patch.name = editTitle; patch.description = editDesc; }
    const { error } = await supabase.from(tableFor(kind) as any).update(patch).eq("id", item.id);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Saved");
    setEditing(null);
    if (userId) loadAll(userId);
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const { kind, id } = confirmDel;
    const { error } = await supabase.from(tableFor(kind) as any).delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Deleted");
    setConfirmDel(null);
    if (userId) loadAll(userId);
  };

  const totalViews = videos.reduce((s, v) => s + (v.views_count || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes_count || 0), 0)
    + tracks.reduce((s, v) => s + (v.likes_count || 0), 0)
    + posts.reduce((s, v) => s + (v.likes_count || 0), 0);
  const totalPlays = tracks.reduce((s, v) => s + (v.plays_count || 0), 0);
  const totalComments = videos.reduce((s, v) => s + (v.comments_count || 0), 0)
    + posts.reduce((s, v) => s + (v.comments_count || 0), 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const Stat = ({ icon: Icon, label, value }: any) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );

  const renderList = (kind: Kind, items: Item[], emptyText: string) => {
    if (!items.length) return <p className="text-sm text-muted-foreground py-8 text-center">{emptyText}</p>;
    return (
      <div className="space-y-2">
        {items.map((it) => {
          const primary = (kind === "post" ? it.content : it.title || it.name) || "(untitled)";
          return (
            <Card key={it.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{primary}</div>
                  {it.description && <div className="text-xs text-muted-foreground line-clamp-2">{it.description}</div>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(it.created_at).toLocaleDateString()}</span>
                    {typeof it.views_count === "number" && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{it.views_count}</span>}
                    {typeof it.plays_count === "number" && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{it.plays_count}</span>}
                    {typeof it.likes_count === "number" && <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{it.likes_count}</span>}
                    {typeof it.dislikes_count === "number" && <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{it.dislikes_count}</span>}
                    {typeof it.comments_count === "number" && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{it.comments_count}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(kind, it)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmDel({ kind, id: it.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">🎨 Creator Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={Users} label="Followers" value={followers} />
        <Stat icon={Heart} label="Subscribers" value={subscribers} />
        <Stat icon={Eye} label="Video Views" value={totalViews} />
        <Stat icon={TrendingUp} label="Music Plays" value={totalPlays} />
        <Stat icon={ThumbsUp} label="Total Likes" value={totalLikes} />
        <Stat icon={MessageSquare} label="Comments" value={totalComments} />
        <Stat icon={VideoIcon} label="Videos" value={videos.length} />
        <Stat icon={FileText} label="Posts" value={posts.length} />
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="videos"><VideoIcon className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Videos</span></TabsTrigger>
          <TabsTrigger value="music"><MusicIcon className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Music</span></TabsTrigger>
          <TabsTrigger value="posts"><FileText className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Posts</span></TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Members</span></TabsTrigger>
        </TabsList>
        <TabsContent value="videos" className="mt-4">{renderList("video", videos, "No videos uploaded yet.")}</TabsContent>
        <TabsContent value="music" className="mt-4">{renderList("music", tracks, "No music tracks yet.")}</TabsContent>
        <TabsContent value="posts" className="mt-4">{renderList("post", posts, "No posts yet.")}</TabsContent>
        <TabsContent value="members" className="mt-4">{renderList("membership", memberships, "No membership tiers yet.")}</TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.kind}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{editing?.kind === "post" ? "Content" : editing?.kind === "membership" ? "Name" : "Title"}</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            {editing?.kind !== "post" && (
              <div>
                <Label>Description</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {confirmDel?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreatorDashboard;
