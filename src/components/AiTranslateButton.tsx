import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGS = [
  "English", "German", "Spanish", "French", "Italian", "Portuguese",
  "Dutch", "Polish", "Turkish", "Russian", "Ukrainian", "Arabic",
  "Hindi", "Chinese", "Japanese", "Korean",
];

interface Props {
  /** Returns the text to translate (called lazily). */
  getText: () => Promise<string> | string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
  size?: "sm" | "icon";
}

const AiTranslateButton = ({ getText, label = "Translate", iconOnly, className, size = "sm" }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(() => localStorage.getItem("beta_translate_lang") || "English");
  const [result, setResult] = useState("");
  useEmojiLoader();

  const run = async (lang: string) => {
    setLoading(true);
    setResult("");
    try {
      const text = await getText();
      if (!text || !text.trim()) {
        setResult("Nothing to translate.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("ai-translate", {
        body: { text, target: lang },
      });
      if (error) throw error;
      setResult((data as any)?.translation || "(no translation returned)");
    } catch {
      toast.error("Translation failed");
      setResult("Could not translate right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onLangChange = (lang: string) => {
    setTarget(lang);
    localStorage.setItem("beta_translate_lang", lang);
    run(lang);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className ?? "gap-1 text-xs text-muted-foreground hover:text-primary"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); run(target); }}
        title="AI translate"
      >
        <Languages className="h-3.5 w-3.5" />
        {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" /> AI Translation
            </DialogTitle>
          </DialogHeader>
          <Select value={target} onValueChange={onLangChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="min-h-[100px] text-sm whitespace-pre-wrap break-words">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Translating…
              </div>
            ) : (
              formatMessageText(result)
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

export default AiTranslateButton;
