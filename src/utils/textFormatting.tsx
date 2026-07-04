import { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModEmojis, onModsUpdated } from '@/utils/mods';

interface CustomEmoji {
  name: string;
  image_url: string;
}

let cachedEmojis: CustomEmoji[] = [];
let emojisFetched = false;

const withModEmojis = (base: CustomEmoji[]): CustomEmoji[] => {
  const map = new Map<string, CustomEmoji>();
  base.forEach(e => map.set(e.name, e));
  // Mod emojis override existing ones with the same name
  for (const m of getModEmojis()) {
    map.set(m.name, { name: m.name, image_url: m.dataUrl });
  }
  return Array.from(map.values());
};

export const fetchEmojisForFormatting = async () => {
  if (emojisFetched) return withModEmojis(cachedEmojis);

  const [{ data: custom }, { data: creator }] = await Promise.all([
    supabase.from('custom_emojis').select('name, image_url'),
    supabase.from('creator_emojis' as any).select('name, image_url'),
  ]);

  const merged: CustomEmoji[] = [...(custom || [])];
  // Creator emojis: first one for a given name wins if not already present
  for (const c of (creator as any[] || [])) {
    if (!merged.find(e => e.name === c.name)) {
      merged.push({ name: c.name, image_url: c.image_url });
    }
  }
  cachedEmojis = merged;
  emojisFetched = true;
  return withModEmojis(cachedEmojis);
};

// Refresh in-memory cache when mods change so :emoji: rendering picks them up
onModsUpdated(() => {
  cachedEmojis = withModEmojis(cachedEmojis.filter(e => !getModEmojis().some(m => m.name === e.name)));
});

// Subscribe to emoji changes
supabase
  .channel('emoji_formatting_updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_emojis' },
    async () => { emojisFetched = false; await fetchEmojisForFormatting(); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_emojis' },
    async () => { emojisFetched = false; await fetchEmojisForFormatting(); })
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

const FadeText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-fade-text">{text}</span>;
};

const ZoomText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-zoom-text">{text}</span>;
};

const SpinText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-spin-text">{text}</span>;
};

const GlitchText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-block relative animate-glitch">
      <span className="relative">{text}</span>
    </span>
  );
};

const NeonText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return <span key={keyPrefix} className="inline-block animate-neon">{text}</span>;
};

const JellyText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="inline-block animate-jelly"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

const FloatText = ({ text, keyPrefix }: { text: string; keyPrefix: string }) => {
  return (
    <span key={keyPrefix} className="inline-flex">
      {text.split('').map((char, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="inline-block animate-float"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

// Helper to render animation component by type
const renderAnimation = (type: string, text: string, keyPrefix: string, color?: string): JSX.Element | null => {
  const style = color ? { color } : undefined;
  const wrap = (el: JSX.Element) => style ? <span key={`${keyPrefix}-wrap`} style={style}>{el}</span> : el;
  
  switch (type) {
    case 'randomize_letters':
    case 'randomize':
      return wrap(<RandomizeLetters key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'move-up-down':
    case 'bounce':
      return wrap(<MoveUpDown key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'wave':
      return wrap(<WaveText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'shake':
      return wrap(<ShakeText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'pulse':
      return wrap(<PulseText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'glow':
      return wrap(<GlowText key={keyPrefix} text={text} keyPrefix={keyPrefix} color={color} />);
    case 'rainbow':
      return wrap(<RainbowText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'typewriter':
      return wrap(<TypewriterText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'flip':
      return wrap(<FlipText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'fade':
      return wrap(<FadeText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'zoom':
      return wrap(<ZoomText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'spin':
      return wrap(<SpinText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'glitch':
      return wrap(<GlitchText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'neon':
      return wrap(<NeonText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'jelly':
      return wrap(<JellyText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    case 'float':
      return wrap(<FloatText key={keyPrefix} text={text} keyPrefix={keyPrefix} />);
    default:
      return null;
  }
};

// Parse effect tags /#/effect; value/#/
const parseEffectTags = (text: string, keyBase: number): (string | JSX.Element)[] => {
  const effectRegex = /\/#\/([^;]+);\s*(.+?)\/#\//g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let key = keyBase;

  while ((match = effectRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const effectType = match[1].trim().toLowerCase();
    const effectValue = match[2].trim();
    const keyPrefix = `effect-${key++}`;

    if (effectType === 'color') {
      parts.push(
        <span key={keyPrefix} style={{ color: effectValue }}>
          {effectValue.startsWith('#') ? effectValue : `#${effectValue}`}
        </span>
      );
    } else if (effectType === 'combo') {
      // Format: /#/combo; wave,bounce #FF0000 Hello/#/ or /#/combo; wave,bounce Hello/#/
      const comboMatch = effectValue.match(/^([a-z,_-]+)\s+(#[0-9A-Fa-f]{3,6})\s+(.+)$/i);
      const comboNoColor = effectValue.match(/^([a-z,_-]+)\s+(.+)$/i);
      
      if (comboMatch) {
        const animTypes = comboMatch[1].split(',');
        const color = comboMatch[2];
        const comboText = comboMatch[3];
        const firstAnim = animTypes[0];
        const rendered = renderAnimation(firstAnim, comboText, keyPrefix, color);
        parts.push(rendered || <span key={keyPrefix} style={{ color }}>{comboText}</span>);
      } else if (comboNoColor) {
        const animTypes = comboNoColor[1].split(',');
        const comboText = comboNoColor[2];
        const firstAnim = animTypes[0];
        const rendered = renderAnimation(firstAnim, comboText, keyPrefix);
        parts.push(rendered || <span key={keyPrefix}>{comboText}</span>);
      } else {
        parts.push(match[0]);
      }
    } else if (effectType === 'animate' || effectType === 'animation') {
      const [animationType, ...textParts] = effectValue.split(' ');
      const animatedText = textParts.join(' ') || animationType;
      const displayText = animatedText !== animationType ? animatedText : 'Text';
      const rendered = renderAnimation(animationType.toLowerCase(), displayText, keyPrefix);
      parts.push(rendered || match[0]);
    } else if (effectType === 'text' || effectType === 'styled') {
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
      parts.push(match[0]);
    }

    lastIndex = effectRegex.lastIndex;
  }

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