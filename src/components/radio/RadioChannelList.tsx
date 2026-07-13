import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Radio as RadioIcon, Plus } from "lucide-react";

export interface RadioChannel {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
}

interface Props {
  currentUserId: string;
  isBroadcaster: boolean;
  selectedChannelId: string | null;
  onSelect: (channelId: string) => void;
}

export default function RadioChannelList({ currentUserId, isBroadcaster, selectedChannelId, onSelect }: Props) {
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("radio_channels" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const list = ((data as any) || []) as RadioChannel[];
    setChannels(list);
    if (!selectedChannelId && list.length > 0) onSelect(list[0].id);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("radio-channels-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "radio_channels" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("radio_channels" as any)
        .insert({ name: name.trim(), description: description.trim() || null, created_by: currentUserId })
        .select()
        .single();
      if (error) throw error;
      toast.success("Channel created");
      setOpen(false);
      setName("");
      setDescription("");
      await load();
      if (data) onSelect((data as any).id);
    } catch (e: any) {
      toast.error(e.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <RadioIcon className="h-4 w-4" /> Channels
        </h3>
        {isBroadcaster && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4 mr-1" /> New Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Radio Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chill Beats FM" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={create} disabled={creating}>
                  {creating ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
              selectedChannelId === c.id
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-background hover:bg-secondary"
            }`}
          >
            <div className="truncate max-w-[10rem]">{c.name}</div>
          </button>
        ))}
        {channels.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No channels yet{isBroadcaster ? " — create one!" : ""}</p>
        )}
      </div>
    </div>
  );
}
