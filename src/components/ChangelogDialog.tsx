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
import { Sparkles } from "lucide-react";

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

const VERSION_COLORS = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-green-500",
  "from-amber-500 to-orange-500",
  "from-fuchsia-500 to-pink-500",
];

const getVersionColor = (index: number) =>
  VERSION_COLORS[index % VERSION_COLORS.length];

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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            What's New
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No updates yet.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="border border-border rounded-xl p-4 space-y-2 animate-fade-in bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${getVersionColor(i)}`}
                    >
                      v{entry.version}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{formatMessageText(entry.title)}</h3>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
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
