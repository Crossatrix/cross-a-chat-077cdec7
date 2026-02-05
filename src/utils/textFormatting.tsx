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

// Text effect components
const RandomizeLetters = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  const [displayText, setDisplayText] = useState(text);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const chars = text.split('');
      const shuffled = [...chars].sort(() => Math.random() - 0.5);
      setDisplayText(shuffled.join(''));
    }, 150);
    return () => clearInterval(interval);
  }, [text]);
  
  return <span key={keyPrefix} className="inline-block">{displayText}</span>;
};

const MoveUpDown = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="inline-block animate-bounce-letter"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

const WaveText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="inline-block animate-wave-letter"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

const ShakeText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-shake">{text}</span>;
};

const PulseText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-pulse-text">{text}</span>;
};

const GlowText = ({ text, keyPrefix, color }: { text: string; keyPrefix: string; color?: string }) => {
  const glowColor = color || '#FFD700';
  return (
    <span 
      key={keyPrefix} 
      className="inline-block animate-glow"
      style={{ textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor}` }}
    >
      {text}
    </span>
  );
};

const RainbowText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-rainbow">{text}</span>;
};

const TypewriterText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.slice(0, i));
        i++;
      } else {
        i = 0;
      }
    }, 100);
    return () => clearInterval(interval);
  }, [text]);
  
  return <span key={keyPrefix} className="inline-block">{displayedText}<span className="animate-blink">|</span></span>;
};

const FlipText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="inline-block animate-flip-letter"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

// Parse effect tags /#/effect; value/#/
const parseEffectTags = (text: string, keyBase: number): (string | JSX.Element)[] => {
  const effectRegex = /\/#\/([^;]+);\s*([^#]+)\/#\//g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let key = keyBase;

  while ((match = effectRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const effectType = match[1].trim().toLowerCase();
    const effectValue = match[2].trim();
    const keyPrefix = `effect-${key++}`;

    // Handle different effect types
    if (effectType === 'color') {
      // Color effect with hex value
      parts.push(
        <span key={keyPrefix} style={{ color: effectValue }}>
          {effectValue.startsWith('#') ? effectValue : `#${effectValue}`}
        </span>
      );
    } else if (effectType === 'animate' || effectType === 'animation') {
      // The value format is "animation_type text" or just "animation_type"
      const [animationType, ...textParts] = effectValue.split(' ');
      const animatedText = textParts.join(' ') || animationType;
      
      switch (animationType.toLowerCase()) {
        case 'randomize_letters':
        case 'randomize':
          parts.push(<RandomizeLetters key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'move-up-down':
        case 'bounce':
          parts.push(<MoveUpDown key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'wave':
          parts.push(<WaveText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'shake':
          parts.push(<ShakeText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'pulse':
          parts.push(<PulseText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'glow':
          parts.push(<GlowText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'rainbow':
          parts.push(<RainbowText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'typewriter':
          parts.push(<TypewriterText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        case 'flip':
          parts.push(<FlipText key={keyPrefix} text={animatedText !== animationType ? animatedText : 'Text'} keyPrefix={keyPrefix} />);
          break;
        default:
          parts.push(match[0]); // Keep original if unknown
      }
    } else if (effectType === 'text' || effectType === 'styled') {
      // Format: /#/text; #hexcolor content/#/
      const colorMatch = effectValue.match(/^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\s+(.+)$/);
      if (colorMatch) {
        parts.push(
          <span key={keyPrefix} style={{ color: colorMatch[1] }}>
            {colorMatch[2]}
          </span>
        );
      } else {
        parts.push(match[0]);
      }
    } else {
      // Unknown effect, keep original
      parts.push(match[0]);
    }

    lastIndex = effectRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

export const formatMessageText = (text: string): JSX.Element => {
  // First, process effect tags
  const effectProcessed = parseEffectTags(text, 0);
  
  // Then process each string part for bold, italic, and emojis
  const processTextPart = (part: string, partIndex: number): (string | JSX.Element)[] => {
    const result: (string | JSX.Element)[] = [];
    let key = 0;

    // Process bold text (*text*)
    const boldRegex = /\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;
    const boldParts: (string | JSX.Element)[] = [];

    while ((match = boldRegex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        boldParts.push(part.substring(lastIndex, match.index));
      }
      boldParts.push(
        <strong key={`bold-${partIndex}-${key++}`}>{match[1]}</strong>
      );
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < part.length) {
      boldParts.push(part.substring(lastIndex));
    }

    if (boldParts.length === 0) boldParts.push(part);

    // Process italic text (_text_) in the bold parts
    const italicParts: (string | JSX.Element)[] = [];
    boldParts.forEach((bPart, bIndex) => {
      if (typeof bPart === 'string') {
        const italicRegex = /_([^_]+)_/g;
        let lastItalicIndex = 0;
        let italicMatch;
        const currentItalicParts: (string | JSX.Element)[] = [];

        while ((italicMatch = italicRegex.exec(bPart)) !== null) {
          if (italicMatch.index > lastItalicIndex) {
            currentItalicParts.push(bPart.substring(lastItalicIndex, italicMatch.index));
          }
          currentItalicParts.push(
            <em key={`italic-${partIndex}-${bIndex}-${key++}`}>{italicMatch[1]}</em>
          );
          lastItalicIndex = italicRegex.lastIndex;
        }
        
        if (lastItalicIndex < bPart.length) {
          currentItalicParts.push(bPart.substring(lastItalicIndex));
        }

        italicParts.push(...(currentItalicParts.length > 0 ? currentItalicParts : [bPart]));
      } else {
        italicParts.push(bPart);
      }
    });

    // Process custom emojis (:emoji_name:) in the parts
    italicParts.forEach((iPart, iIndex) => {
      if (typeof iPart === 'string') {
        const emojiRegex = /:([a-z0-9_-]+):/g;
        let lastEmojiIndex = 0;
        let emojiMatch;
        const emojiParts: (string | JSX.Element)[] = [];

        while ((emojiMatch = emojiRegex.exec(iPart)) !== null) {
          const emojiName = emojiMatch[1];
          const emoji = cachedEmojis.find(e => e.name === emojiName);

          if (emojiMatch.index > lastEmojiIndex) {
            emojiParts.push(iPart.substring(lastEmojiIndex, emojiMatch.index));
          }

          if (emoji) {
            emojiParts.push(
              <img
                key={`emoji-${partIndex}-${iIndex}-${key++}`}
                src={emoji.image_url}
                alt={`:${emojiName}:`}
                title={`:${emojiName}:`}
                className="inline-block w-5 h-5 align-text-bottom mx-0.5"
              />
            );
          } else {
            emojiParts.push(emojiMatch[0]);
          }

          lastEmojiIndex = emojiRegex.lastIndex;
        }

        if (lastEmojiIndex < iPart.length) {
          emojiParts.push(iPart.substring(lastEmojiIndex));
        }

        result.push(...(emojiParts.length > 0 ? emojiParts : [iPart]));
      } else {
        result.push(iPart);
      }
    });

    return result;
  };

  // Process all parts
  const finalParts: (string | JSX.Element)[] = [];
  effectProcessed.forEach((part, index) => {
    if (typeof part === 'string') {
      finalParts.push(...processTextPart(part, index));
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