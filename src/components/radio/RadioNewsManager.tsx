import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Trash2, Plus } from "lucide-react";

interface NewsItem {
  id: string;
  text: string;
  created_at: string;
}

export default function RadioNewsManager({ userId, channelId }: { userId: string; channelId: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [text, setText] = useState("");
  const [info, setInfo] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("radio_news")
      .select("*")
      .eq("broadcaster_id", userId)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, channelId]);

  const add = async () => {
    if (!text.trim()) return;
    if (items.length >= 50) {
      toast.error("Max 50 news items");
      return;
    }
    const { error } = await supabase
      .from("radio_news")
      .insert({ broadcaster_id: userId, channel_id: channelId, text: text.trim() });
    if (error) return toast.error(error.message);
    toast.success("News added");
    setText("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("radio_news").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const generate = async () => {
    if (!info.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("radio-news-generate", {
        body: { info: info.trim(), channel_id: channelId },
      });
      if (error) throw error;
      if ((data as any)?.text) {
        setText((data as any).text);
        toast.success("News generated");
      } else {
        toast.error("No text returned");
      }
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3 bg-card space-y-2">
        <Label>Info for AI (optional)</Label>
        <Textarea
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="Describe the news you want generated..."
          rows={2}
        />
        <Button size="sm" variant="secondary" onClick={generate} disabled={aiLoading}>
          <Sparkles className="h-4 w-4 mr-1" /> {aiLoading ? "Generating..." : "Generate with AI"}
        </Button>

        <Label>News text</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Enter or edit news..." />
        <Button size="sm" onClick={add} disabled={items.length >= 50}>
          <Plus className="h-4 w-4 mr-1" /> Add ({items.length}/50)
        </Button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((n) => (
          <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card">
            <div className="flex-1 text-sm">{n.text}</div>
            <Button size="icon" variant="ghost" onClick={() => remove(n.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No news items yet</p>}
      </div>
    </div>
  );
}
