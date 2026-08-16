import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  created_at: string;
}

interface ChangelogManagerProps {
  currentVersion: string;
}

const ChangelogManager = ({ currentVersion }: ChangelogManagerProps) => {
  const [listOpen, setListOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("changelog")
      .select("id, version, title, content, created_at")
      .order("created_at", { ascending: false });
    setEntries(data || []);
  };

  useEffect(() => {
    if (listOpen) fetchEntries();
  }, [listOpen]);

  const openCreate = () => {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setVersion(currentVersion || "0.0.0");
    setFormOpen(true);
  };

  const openEdit = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setVersion(entry.version);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content");
      return;
    }
    setSaving(true);

    if (editingEntry) {
      const { error } = await supabase
        .from("changelog")
        .update({ title: title.trim(), content: content.trim(), version: version.trim() })
        .eq("id", editingEntry.id);
      setSaving(false);
      if (error) {
        toast.error("Failed to update entry");
      } else {
        toast.success("Entry updated");
        setFormOpen(false);
        fetchEntries();
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("changelog").insert({
        version: version.trim() || "0.0.0",
        title: title.trim(),
        content: content.trim(),
        created_by: user?.id,
      });
      setSaving(false);
      if (error) {
        toast.error("Failed to add entry");
      } else {
        toast.success("Entry added");
        setFormOpen(false);
        fetchEntries();
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("changelog").delete().eq("id", deletingId);
    if (error) {
      toast.error("Failed to delete entry");
    } else {
      toast.success("Entry deleted");
      fetchEntries();
    }
    setDeletingId(null);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setListOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Changelog
      </Button>

      {/* List Dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Changelog</DialogTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="border border-border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary">v{entry.version}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(entry)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingId(entry.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm">{entry.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New chat effects" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe what's new..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingEntry ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>This changelog entry will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChangelogManager;
