import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomEmoji {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface ReactionPickerProps {
  onReact: (emoji: string, isCustom: boolean) => void;
  children?: React.ReactNode;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👎", "🎉"];

const ReactionPicker = ({ onReact, children }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("custom_emojis")
        .select("*")
        .order("category, name");
      if (data) setCustomEmojis(data);
    };
    fetch();
  }, [open]);

  const handleSelect = (emoji: string, isCustom: boolean) => {
    onReact(emoji, isCustom);
    setOpen(false);
    setShowCustom(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowCustom(false); }}>
      <PopoverTrigger asChild>
        {children || (
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" side="top">
        {!showCustom ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji, false)}
                  className="text-xl hover:bg-muted rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {customEmojis.length > 0 && (
              <button
                onClick={() => setShowCustom(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
              >
                Custom emojis →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setShowCustom(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <ScrollArea className="h-40 w-56">
              <div className="grid grid-cols-5 gap-1">
                {customEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    onClick={() => handleSelect(`:${emoji.name}:`, true)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={emoji.name}
                  >
                    <img src={emoji.image_url} alt={emoji.name} className="w-7 h-7 object-contain" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;
