import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangelogManagerProps {
  currentVersion: string;
}

const ChangelogManager = ({ currentVersion }: ChangelogManagerProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("changelog").insert({
      version: currentVersion || "0.0.0",
      title: title.trim(),
      content: content.trim(),
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to add changelog entry");
    } else {
      toast.success("Changelog entry added");
      setTitle("");
      setContent("");
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Changelog
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Changelog Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Version</Label>
              <p className="text-sm font-mono text-primary">{currentVersion || "0.0.0"}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cl-title" className="text-xs">Title</Label>
              <Input
                id="cl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New chat effects"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cl-content" className="text-xs">Content</Label>
              <Textarea
                id="cl-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe what's new..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChangelogManager;
