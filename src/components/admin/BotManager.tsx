import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bot as BotIcon, Trash2, Play, Plus, RefreshCw } from "lucide-react";

interface BotRow {
  id: string;
  persona: string;
  system_prompt: string;
  active: boolean;
  reply_chats: boolean;
  comment_posts: boolean;
  last_run_at: string | null;
  username?: string;
}

const BotManager = () => {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [persona, setPersona] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [replyChats, setReplyChats] = useState(true);
  const [commentPosts, setCommentPosts] = useState(true);

  const fetchBots = async () => {
    setLoading(true);
    const { data: rows } = await supabase.from("bots" as any).select("*").order("created_at", { ascending: false });
    const list = (rows || []) as any as BotRow[];
    if (list.length) {
      const ids = list.map(b => b.id);
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p.username]));
      list.forEach(b => { b.username = map.get(b.id) || "—"; });
    }
    setBots(list);
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, []);

  const create = async () => {
    if (!username.trim()) { toast.error("Username required"); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("bot-admin", {
      body: {
        action: "create",
        username: username.trim(),
        persona: persona.trim(),
        system_prompt: systemPrompt.trim(),
        avatar_url: avatarUrl.trim() || null,
        reply_chats: replyChats,
        comment_posts: commentPosts,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success("Bot created");
    setUsername(""); setPersona(""); setSystemPrompt(""); setAvatarUrl("");
    fetchBots();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this bot and its account?")) return;
    const { data, error } = await supabase.functions.invoke("bot-admin", { body: { action: "delete", id } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "Failed"); return; }
    toast.success("Bot deleted");
    fetchBots();
  };

  const toggle = async (b: BotRow, field: "active" | "reply_chats" | "comment_posts", val: boolean) => {
    await supabase.from("bots" as any).update({ [field]: val }).eq("id", b.id);
    fetchBots();
  };

  const runNow = async () => {
    await supabase.functions.invoke("bot-admin", { body: { action: "run_now" } });
    toast.success("Triggered bot tick");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><BotIcon className="h-5 w-5" /> Bot Manager</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runNow}><Play className="h-4 w-4 mr-1" />Run now</Button>
          <Button size="sm" variant="outline" onClick={fetchBots}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-border rounded-lg bg-card/50">
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. mia_42" />
        </div>
        <div>
          <Label>Avatar URL (optional)</Label>
          <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="md:col-span-2">
          <Label>Persona (short bio of the fake user)</Label>
          <Input value={persona} onChange={e => setPersona(e.target.value)} placeholder="22yo gamer from Berlin who likes memes" />
        </div>
        <div className="md:col-span-2">
          <Label>Extra system prompt (optional)</Label>
          <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={3} placeholder="Behaviour guidelines..." />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={replyChats} onCheckedChange={setReplyChats} id="rc" />
          <Label htmlFor="rc">Reply to chats</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={commentPosts} onCheckedChange={setCommentPosts} id="cp" />
          <Label htmlFor="cp">Comment on posts</Label>
        </div>
        <div className="md:col-span-2">
          <Button onClick={create} disabled={creating}><Plus className="h-4 w-4 mr-1" />{creating ? "Creating..." : "Create bot"}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && bots.length === 0 && <p className="text-sm text-muted-foreground">No bots yet.</p>}
        {bots.map(b => (
          <div key={b.id} className="p-3 border border-border rounded-lg bg-card flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">@{b.username}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{b.persona}</div>
              <div className="text-[10px] text-muted-foreground">Last run: {b.last_run_at ? new Date(b.last_run_at).toLocaleString() : "never"}</div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-1 text-xs"><Switch checked={b.active} onCheckedChange={v => toggle(b, "active", v)} />Active</label>
              <label className="flex items-center gap-1 text-xs"><Switch checked={b.reply_chats} onCheckedChange={v => toggle(b, "reply_chats", v)} />Chat</label>
              <label className="flex items-center gap-1 text-xs"><Switch checked={b.comment_posts} onCheckedChange={v => toggle(b, "comment_posts", v)} />Comments</label>
              <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotManager;
