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

interface EmojiCategory {
  id: string;
  name: string;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: CustomEmoji) => void;
  disabled?: boolean;
}

const EmojiPicker = ({ onEmojiSelect, disabled }: EmojiPickerProps) => {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [categories, setCategories] = useState<EmojiCategory[]>([]);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("emoji_categories")
        .select("*")
        .order("name");
      
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch emojis
      const { data: emojisData } = await supabase
        .from("custom_emojis")
        .select("*")
        .order("name");
      
      if (emojisData) {
        setEmojis(emojisData);
      }
    };

    fetchData();

    // Subscribe to changes
    const emojisChannel = supabase
      .channel("custom_emojis_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_emojis" },
        () => fetchData()
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel("emoji_categories_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emoji_categories" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(emojisChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  const handleSelect = (emoji: CustomEmoji) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  // Group emojis by category
  const emojisByCategory = categories.reduce((acc, category) => {
    acc[category.name] = emojis.filter(emoji => emoji.category === category.name);
    return acc;
  }, {} as Record<string, CustomEmoji[]>);

  // Filter out empty categories
  const nonEmptyCategories = categories.filter(
    cat => emojisByCategory[cat.name]?.length > 0
  );

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
        <ScrollArea className="h-64">
          {nonEmptyCategories.map((category) => (
            <div key={category.id} className="mb-3">
              <p className="text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wide px-1">
                {category.name}
              </p>
              <div className="grid grid-cols-5 gap-1">
                {emojisByCategory[category.name]?.map((emoji) => (
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
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;