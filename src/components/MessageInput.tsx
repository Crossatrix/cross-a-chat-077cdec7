import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (message: string, imageFile?: File) => void;
  disabled?: boolean;
}

const messageSchema = z.string()
  .trim()
  .max(2000, "Message too long (max 2000 characters)")
  .refine(
    (val) => !/<script|<iframe|javascript:|onerror=|onload=/i.test(val),
    "Message contains invalid content"
  );

const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Maximum size is 5MB.");
      return;
    }

    setSelectedImage(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow sending if either message or image is present
    if (!message.trim() && !selectedImage) {
      toast.error("Please enter a message or select an image");
      return;
    }

    // Validate message if present
    if (message.trim()) {
      const validation = messageSchema.safeParse(message);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    onSend(message || "", selectedImage || undefined);
    setMessage("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 md:p-4 border-t border-border bg-card shrink-0">
      {selectedImage && (
        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedImage.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedImage(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="h-6 px-2"
          >
            Remove
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          size="icon"
          variant="outline"
          className="shrink-0"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 text-sm md:text-base"
        />
        <Button type="submit" disabled={disabled || (!message.trim() && !selectedImage)} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;