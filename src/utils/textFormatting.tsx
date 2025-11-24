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
  const finalParts: (string | JSX.Element)[] = [];
  parts.forEach((part, partIndex) => {
    if (typeof part === 'string') {
      const italicRegex = /_([^_]+)_/g;
      let lastItalicIndex = 0;
      let italicMatch;
      const italicParts: (string | JSX.Element)[] = [];

      while ((italicMatch = italicRegex.exec(part)) !== null) {
        // Add text before the match
        if (italicMatch.index > lastItalicIndex) {
          italicParts.push(part.substring(lastItalicIndex, italicMatch.index));
        }
        
        // Add italic text
        italicParts.push(
          <em key={`italic-${partIndex}-${key++}`}>{italicMatch[1]}</em>
        );
        
        lastItalicIndex = italicRegex.lastIndex;
      }
      
      // Add remaining text
      if (lastItalicIndex < part.length) {
        italicParts.push(part.substring(lastItalicIndex));
      }

      finalParts.push(...(italicParts.length > 0 ? italicParts : [part]));
    } else {
      finalParts.push(part);
    }
  });

  return <>{finalParts}</>;
};
