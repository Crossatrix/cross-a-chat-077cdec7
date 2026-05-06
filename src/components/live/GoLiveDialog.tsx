import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VIDEO_CATEGORIES } from "@/utils/videoCategories";

interface Props {
  userId: string;
  onLiveStart: (streamId: string) => void;
  trigger?: React.ReactNode;
}

const GoLiveDialog = ({ userId, onLiveStart, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [adultsOnly, setAdultsOnly] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.from("livestreams").insert({
        user_id: userId, title: title.trim(), description: description.trim() || null,
        category, adults_only: adultsOnly, members_only: membersOnly, status: "live",
      } as any).select().single();
      if (error) throw error;
      toast.success("You're live!");
      setOpen(false);
      setTitle(""); setDescription(""); setCategory("other"); setAdultsOnly(false); setMembersOnly(false);
      onLiveStart((data as any).id);
    } catch (err: any) {
      toast.error("Failed to go live: " + err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="destructive" className="gap-2">
            <Radio className="h-4 w-4" /> Go Live
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Start Livestream</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Stream title *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VIDEO_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <Label htmlFor="live-adults" className="text-sm cursor-pointer">Adults Only (18+)</Label>
            </div>
            <Switch id="live-adults" checked={adultsOnly} onCheckedChange={setAdultsOnly} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="live-mem" className="text-sm cursor-pointer">Members Only</Label>
            <Switch id="live-mem" checked={membersOnly} onCheckedChange={setMembersOnly} />
          </div>
          <p className="text-xs text-muted-foreground">
            Your camera and microphone will be shared with viewers. Make sure you're ready!
          </p>
          <Button onClick={handleStart} disabled={starting || !title.trim()} className="w-full gap-2">
            <Radio className="h-4 w-4" /> {starting ? "Starting..." : "Start Streaming"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoLiveDialog;
