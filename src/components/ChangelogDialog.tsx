import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  created_at: string;
}

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangelogDialog = ({ open, onOpenChange }: ChangelogDialogProps) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  useEmojiLoader();

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("changelog")
        .select("id, version, title, content, created_at")
        .order("created_at", { ascending: false });
      setEntries(data || []);
    };
    fetch();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>What's New</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No updates yet.</p>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-primary">v{entry.version}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{entry.title}</h3>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {formatMessageText(entry.content)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChangelogDialog;
