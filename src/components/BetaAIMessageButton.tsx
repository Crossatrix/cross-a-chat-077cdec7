import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  disabled?: boolean;
  onInsert: (text: string) => void;
}

const BetaAIMessageButton = ({ disabled, onInsert }: Props) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe what you want to say");
      return;
    }
    setLoading(true);
    setDraft("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beta-ai-message`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data?.message) {
        toast.error(data?.error || "AI failed");
      } else {
        setDraft(data.message);
      }
    } catch (e) {
      toast.error("AI failed");
    } finally {
      setLoading(false);
    }
  };

  const useDraft = () => {
    if (!draft) return;
    onInsert(draft);
    setOpen(false);
    setDraft("");
    setPrompt("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title="AI Message (Beta)"
          className="shrink-0"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" align="start">
        <div className="text-sm font-medium flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-primary" /> AI Message · Beta
        </div>
        <Textarea
          placeholder="Describe what you want to say..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <Button onClick={generate} disabled={loading} size="sm" className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
        </Button>
        {draft && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Draft:</div>
            <div className="text-sm p-2 rounded bg-muted whitespace-pre-wrap">{draft}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
                Regenerate
              </Button>
              <Button size="sm" onClick={useDraft} className="flex-1">
                Use this
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default BetaAIMessageButton;
