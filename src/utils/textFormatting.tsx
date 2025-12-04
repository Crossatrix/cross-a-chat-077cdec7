import { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomEmoji {
  name: string;
  image_url: string;
}

let cachedEmojis: CustomEmoji[] = [];
let emojisFetched = false;

export const fetchEmojisForFormatting = async () => {
  if (emojisFetched) return cachedEmojis;
  
  const { data } = await supabase
    .from('custom_emojis')
    .select('name, image_url');
  
  if (data) {
    cachedEmojis = data;
    emojisFetched = true;
  }
  return cachedEmojis;
};

// Subscribe to emoji changes
supabase
  .channel('emoji_formatting_updates')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'custom_emojis' },
    async () => {
      emojisFetched = false;
      await fetchEmojisForFormatting();
    }
  )
  .subscribe();

export const formatMessageText = (text: string): JSX.Element => {
  // Split by asterisks for bold
  const parts: (string | JSX.Element)[] = [];
  let key = 0;

  // Process bold text (*text*)
  const boldRegex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${key++}`}>{match[1]}</strong>
    );
    
    lastIndex = boldRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // Process italic text (_text_) in the parts
  const italicParts: (string | JSX.Element)[] = [];
  parts.forEach((part, partIndex) => {
    if (typeof part === 'string') {
      const italicRegex = /_([^_]+)_/g;
      let lastItalicIndex = 0;
      let italicMatch;
      const currentItalicParts: (string | JSX.Element)[] = [];

      while ((italicMatch = italicRegex.exec(part)) !== null) {
        // Add text before the match
        if (italicMatch.index > lastItalicIndex) {
          currentItalicParts.push(part.substring(lastItalicIndex, italicMatch.index));
        }
        
        // Add italic text
        currentItalicParts.push(
          <em key={`italic-${partIndex}-${key++}`}>{italicMatch[1]}</em>
        );
        
        lastItalicIndex = italicRegex.lastIndex;
      }
      
      // Add remaining text
      if (lastItalicIndex < part.length) {
        currentItalicParts.push(part.substring(lastItalicIndex));
      }

      italicParts.push(...(currentItalicParts.length > 0 ? currentItalicParts : [part]));
    } else {
      italicParts.push(part);
    }
  });

  // Process custom emojis (:emoji_name:) in the parts
  const finalParts: (string | JSX.Element)[] = [];
  italicParts.forEach((part, partIndex) => {
    if (typeof part === 'string') {
      const emojiRegex = /:([a-z0-9_-]+):/g;
      let lastEmojiIndex = 0;
      let emojiMatch;
      const emojiParts: (string | JSX.Element)[] = [];

      while ((emojiMatch = emojiRegex.exec(part)) !== null) {
        const emojiName = emojiMatch[1];
        const emoji = cachedEmojis.find(e => e.name === emojiName);

        // Add text before the match
        if (emojiMatch.index > lastEmojiIndex) {
          emojiParts.push(part.substring(lastEmojiIndex, emojiMatch.index));
        }

        if (emoji) {
          // Add emoji image
          emojiParts.push(
            <img
              key={`emoji-${partIndex}-${key++}`}
              src={emoji.image_url}
              alt={`:${emojiName}:`}
              title={`:${emojiName}:`}
              className="inline-block w-5 h-5 align-text-bottom mx-0.5"
            />
          );
        } else {
          // Keep original text if emoji not found
          emojiParts.push(emojiMatch[0]);
        }

        lastEmojiIndex = emojiRegex.lastIndex;
      }

      // Add remaining text
      if (lastEmojiIndex < part.length) {
        emojiParts.push(part.substring(lastEmojiIndex));
      }

      finalParts.push(...(emojiParts.length > 0 ? emojiParts : [part]));
    } else {
      finalParts.push(part);
    }
  });

  return <>{finalParts}</>;
};

// Hook to ensure emojis are loaded
export const useEmojiLoader = () => {
  const [loaded, setLoaded] = useState(emojisFetched);

  useEffect(() => {
    if (!emojisFetched) {
      fetchEmojisForFormatting().then(() => setLoaded(true));
    }
  }, []);

  return loaded;
};