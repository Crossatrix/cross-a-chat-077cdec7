import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tags, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadVideoCategories } from "@/utils/videoCategories";

interface Row {
  id: string;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
}

const VideoCategoryManager = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("video_categories" as any)
      .select("id, value, label, icon, sort_order")
      .order("sort_order", { ascending: true });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) fetchRows(); }, [open]);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

  const add = async () => {
    const label = newLabel.trim();
    const icon = newIcon.trim();
    if (!label) { toast.error("Enter a name"); return; }
    if (!icon) { toast.error("Enter an emoji"); return; }
    const value = slugify(newValue || label);
    if (!value) { toast.error("Invalid category id"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { error } = await supabase.from("video_categories" as any).insert({
      value, label, icon, sort_order: maxOrder + 10, created_by: user?.id,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That category already exists" : "Failed to add category"); return; }
    toast.success("Category added");
    setNewLabel(""); setNewIcon(""); setNewValue("");
    await fetchRows();
    loadVideoCategories(true);
  };

  const save = async (row: Row) => {
    const { error } = await supabase.from("video_categories" as any)
      .update({ label: row.label, icon: row.icon, sort_order: row.sort_order } as any)
      .eq("id", row.id);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Saved");
    loadVideoCategories(true);
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete category "${row.label}"? Existing videos keep the value.`)) return;
    const { error } = await supabase.from("video_categories" as any).delete().eq("id", row.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Category deleted");
    await fetchRows();
    loadVideoCategories(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} title="Video categories">
        <Tags className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" /> Video Categories
            </DialogTitle>
            <DialogDescription>Add or edit the categories creators can pick for videos and livestreams.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[3rem_1fr_auto] gap-2 items-end border border-border rounded-lg p-2">
            <div>
              <Label className="text-[11px]">Emoji</Label>
              <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="🎬" className="h-8 text-center" />
            </div>
            <div>
              <Label className="text-[11px]">Name</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Documentaries" className="h-8" />
            </div>
            <Button size="sm" onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[45vh] pr-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={row.id} className="grid grid-cols-[3rem_1fr_auto_auto] gap-2 items-center">
                    <Input
                      value={row.icon}
                      onChange={(e) => setRows(r => r.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
                      className="h-8 text-center"
                    />
                    <Input
                      value={row.label}
                      onChange={(e) => setRows(r => r.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      className="h-8"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => save(row)} title="Save">
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(row)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {rows.length === 0 && <p className="text-sm text-muted-foreground p-3">No categories yet.</p>}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoCategoryManager;
