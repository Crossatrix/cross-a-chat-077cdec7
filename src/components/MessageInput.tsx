import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long (max 2000 characters)");

const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = messageSchema.safeParse(message);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    onSend(validation.data);
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 md:p-4 border-t border-border bg-card shrink-0">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 text-sm md:text-base"
      />
      <Button type="submit" disabled={disabled || !message.trim()} size="icon" className="shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default MessageInput;