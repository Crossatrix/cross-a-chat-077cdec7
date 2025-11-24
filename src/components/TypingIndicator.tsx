interface TypingIndicatorProps {
  username: string;
}

const TypingIndicator = ({ username }: TypingIndicatorProps) => {
  return (
    <div className="flex gap-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs text-muted-foreground mb-1">
          {username}
        </span>
        <div className="rounded-2xl px-4 py-2 bg-card border border-border">
          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
