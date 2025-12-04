import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomEmoji {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: CustomEmoji) => void;
  disabled?: boolean;
}

const EmojiPicker = ({ onEmojiSelect, disabled }: EmojiPickerProps) => {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEmojis = async () => {
      const { data } = await supabase
        .from("custom_emojis")
        .select("*")
        .order("category")
        .order("name");
      
      if (data) {
        setEmojis(data);
        if (data.length > 0 && !activeCategory) {
          setActiveCategory(data[0].category);
        }
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

  // Group emojis by category
  const categories = [...new Set(emojis.map(e => e.category))];
  const emojisByCategory = emojis.reduce((acc, emoji) => {
    if (!acc[emoji.category]) acc[emoji.category] = [];
    acc[emoji.category].push(emoji);
    return acc;
  }, {} as Record<string, CustomEmoji[]>);

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
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-sm font-medium mb-2 text-foreground">{t("emoji.custom")}</p>
        
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="text-xs capitalize shrink-0 h-7 px-2"
            >
              {t(`emoji.category.${category}`) || category}
            </Button>
          ))}
        </div>

        {/* Emoji grid */}
        <ScrollArea className="h-40">
          <div className="grid grid-cols-5 gap-1">
            {activeCategory && emojisByCategory[activeCategory]?.map((emoji) => (
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
