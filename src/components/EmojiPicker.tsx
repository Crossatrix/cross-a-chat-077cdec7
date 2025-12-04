import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomEmoji {
  id: string;
  name: string;
  image_url: string;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: CustomEmoji) => void;
  disabled?: boolean;
}

const EmojiPicker = ({ onEmojiSelect, disabled }: EmojiPickerProps) => {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEmojis = async () => {
      const { data } = await supabase
        .from("custom_emojis")
        .select("*")
        .order("name");
      
      if (data) {
        setEmojis(data);
      }
    };

    fetchEmojis();

    // Subscribe to changes
    const channel = supabase
      .channel("custom_emojis_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_emojis" },
        () => fetchEmojis()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelect = (emoji: CustomEmoji) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  if (emojis.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="shrink-0"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-sm font-medium mb-2 text-foreground">{t("emoji.custom")}</p>
        <div className="grid grid-cols-5 gap-1">
          {emojis.map((emoji) => (
            <button
              key={emoji.id}
              onClick={() => handleSelect(emoji)}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title={emoji.name}
            >
              <img
                src={emoji.image_url}
                alt={emoji.name}
                className="w-8 h-8 object-contain"
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;