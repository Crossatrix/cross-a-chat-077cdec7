import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  /** Function returning the text to summarize (called lazily on click). */
  getText: () => Promise<string> | string;
  kind: "chat" | "post" | "video";
  label?: string;
  iconOnly?: boolean;
  className?: string;
  size?: "sm" | "icon";
}

const AiSummaryButton = ({ getText, kind, label = "Summarize", iconOnly, className, size = "sm" }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");

  const run = async () => {
    setOpen(true);
    setLoading(true);
    setSummary("");
    try {
      const text = await getText();
      if (!text || text.trim().length < 20) {
        setSummary("Not enough content to summarize yet.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("ai-summarize", {
        body: { text, kind },
      });
      if (error) throw error;
      setSummary((data as any)?.summary || "(no summary returned)");
    } catch (e: any) {
      toast.error("Summary failed");
      setSummary("Could not generate a summary right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className ?? "gap-1 text-xs text-muted-foreground hover:text-primary"}
        onClick={(e) => { e.stopPropagation(); run(); }}
        title="AI summary"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Summary
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-[100px] text-sm whitespace-pre-wrap">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </div>
            ) : (
              summary
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiSummaryButton;
