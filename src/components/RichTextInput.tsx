import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const RichTextInput = ({ value, onChange, placeholder, disabled, className, onKeyDown }: RichTextInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const emojiLoaded = useEmojiLoader();
  const [isFocused, setIsFocused] = useState(false);

  // Determine if content has any formatting tags
  const hasFormatting = /:\w+:|\/\#\/|_[^_]+_|\*[^*]+\*/.test(value);

  // Sync scroll between textarea and preview
  const handleScroll = () => {
    if (textareaRef.current && previewRef.current) {
      previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Auto-resize height isn't needed for single-line, but keep scroll synced
  useEffect(() => {
    handleScroll();
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex-1 h-10 rounded-md border border-input bg-background overflow-hidden",
        isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Formatted preview layer (behind) */}
      <div
        ref={previewRef}
        className="absolute inset-0 flex items-center px-3 py-2 pointer-events-none overflow-hidden whitespace-nowrap text-sm md:text-sm"
        aria-hidden="true"
      >
        {value ? (
          hasFormatting ? (
            formatMessageText(value)
          ) : (
            <span className="invisible">{value}</span>
          )
        ) : (
          !isFocused && (
            <span className="text-muted-foreground">{placeholder}</span>
          )
        )}
      </div>

      {/* Transparent textarea (on top, captures input) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={hasFormatting ? "" : placeholder}
        rows={1}
        className={cn(
          "relative z-10 w-full h-full px-3 py-2 bg-transparent resize-none outline-none text-sm md:text-sm",
          "overflow-hidden whitespace-nowrap",
          hasFormatting ? "text-transparent caret-foreground" : "text-foreground",
          "placeholder:text-muted-foreground"
        )}
        style={{
          caretColor: hasFormatting ? 'hsl(var(--foreground))' : undefined,
        }}
      />
    </div>
  );
};

export default RichTextInput;
