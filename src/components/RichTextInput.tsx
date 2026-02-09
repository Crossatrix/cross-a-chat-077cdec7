import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";

interface EffectTagInfo {
  fullMatch: string;
  startIndex: number;
  endIndex: number;
  effectType: string;
  animations: string[];
  color: string | null;
  text: string;
}

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onEffectDoubleClick?: (info: EffectTagInfo) => void;
}

/**
 * Find all effect tags in a string and return their metadata
 */
const findEffectTags = (text: string): EffectTagInfo[] => {
  const tags: EffectTagInfo[] = [];
  const regex = /\/#\/([^;]+);\s*(.+?)\/#\//g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const effectType = match[1].trim().toLowerCase();
    const effectValue = match[2].trim();
    let animations: string[] = [];
    let color: string | null = null;
    let innerText = effectValue;

    if (effectType === "combo") {
      const comboColor = effectValue.match(/^([a-z,_-]+)\s+(#[0-9A-Fa-f]{3,6})\s+(.+)$/i);
      const comboNoColor = effectValue.match(/^([a-z,_-]+)\s+(.+)$/i);
      if (comboColor) {
        animations = comboColor[1].split(",");
        color = comboColor[2];
        innerText = comboColor[3];
      } else if (comboNoColor) {
        animations = comboNoColor[1].split(",");
        innerText = comboNoColor[2];
      }
    } else if (effectType === "text" || effectType === "styled") {
      const colorMatch = effectValue.match(/^(#[0-9A-Fa-f]{3,6})\s+(.+)$/);
      if (colorMatch) {
        color = colorMatch[1];
        innerText = colorMatch[2];
      }
    } else if (effectType === "animate" || effectType === "animation") {
      const [animType, ...rest] = effectValue.split(" ");
      animations = [animType];
      innerText = rest.join(" ") || animType;
    }

    tags.push({
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      effectType,
      animations,
      color,
      text: innerText,
    });
  }

  return tags;
};

const RichTextInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  onKeyDown,
  onEffectDoubleClick,
}: RichTextInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useEmojiLoader();
  const [isFocused, setIsFocused] = useState(false);

  const hasFormatting = /:\w+:|\/\#\/|_[^_]+_|\*[^*]+\*/.test(value);

  // Sync scroll
  const handleScroll = () => {
    if (inputRef.current && previewRef.current) {
      previewRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  // Handle double-click on the preview layer to detect effect tags
  const handlePreviewDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onEffectDoubleClick || !inputRef.current) return;

      // Get cursor position from click coordinates
      const input = inputRef.current;
      // Focus the input so we can work with selection
      input.focus();

      // Find which effect tag the cursor might be in
      const tags = findEffectTags(value);
      if (tags.length === 0) return;

      // Use the click position relative to the preview to estimate character position
      // We'll try to find which tag was clicked by checking the clicked element
      const target = e.target as HTMLElement;
      const previewEl = previewRef.current;
      if (!previewEl) return;

      // Walk up to find if we clicked inside an animated/colored span
      let el: HTMLElement | null = target;
      while (el && el !== previewEl) {
        // Check if this element is a rendered effect (has animation classes or inline color)
        const hasAnimation = el.className?.includes?.("animate-") || el.className?.includes?.("inline-flex");
        const hasColor = el.style?.color && el.style.color !== "";
        if (hasAnimation || hasColor) {
          // Find the matching tag by text content
          const clickedText = el.textContent || "";
          const matchingTag = tags.find(
            (t) => t.text === clickedText || clickedText.includes(t.text)
          );
          if (matchingTag) {
            e.preventDefault();
            e.stopPropagation();
            onEffectDoubleClick(matchingTag);
            return;
          }
        }
        el = el.parentElement;
      }
    },
    [value, onEffectDoubleClick]
  );

  return (
    <div
      className={cn(
        "relative flex-1 h-10 rounded-md border border-input bg-background overflow-hidden",
        isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Formatted preview layer */}
      {hasFormatting && (
        <div
          ref={previewRef}
          className="absolute inset-0 flex items-center px-3 py-2 overflow-hidden whitespace-nowrap text-sm"
          onDoubleClick={handlePreviewDoubleClick}
          style={{ zIndex: 1 }}
        >
          {formatMessageText(value)}
        </div>
      )}

      {/* Input element */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "relative w-full h-full px-3 py-2 bg-transparent outline-none text-sm",
          hasFormatting
            ? "text-transparent selection:bg-primary/30"
            : "text-foreground",
          "placeholder:text-muted-foreground"
        )}
        style={{
          caretColor: "hsl(var(--foreground))",
          zIndex: hasFormatting ? 2 : 1,
        }}
      />
    </div>
  );
};

export default RichTextInput;
export type { EffectTagInfo };
