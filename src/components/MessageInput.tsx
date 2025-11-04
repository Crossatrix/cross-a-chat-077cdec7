import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, Mic, StopCircle, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (message: string, imageFile?: File, voiceFile?: Blob) => void;
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Maximum size is 5MB.");
      return;
    }

    setSelectedImage(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Failed to access microphone");
      console.error("Microphone error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordedBlob(null);
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && !selectedImage && !recordedBlob) {
      toast.error("Please enter a message, select an image, or record a voice message");
      return;
    }

    if (message.trim()) {
      const validation = messageSchema.safeParse(message);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    onSend(message || "", selectedImage || undefined, recordedBlob || undefined);
    setMessage("");
    setSelectedImage(null);
    setRecordedBlob(null);
    setRecordingTime(0);
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
      {recordedBlob && (
        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1">Voice message ({formatTime(recordingTime)})</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setRecordedBlob(null);
              setRecordingTime(0);
            }}
            className="h-6 px-2"
          >
            Remove
          </Button>
        </div>
      )}
      {isRecording && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
          <div className="flex items-center gap-2 flex-1">
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm text-destructive">Recording... {formatTime(recordingTime)}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelRecording}
            className="h-6 px-2"
          >
            <X className="h-4 w-4" />
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
          disabled={disabled || isRecording}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording || !!recordedBlob}
          size="icon"
          variant="outline"
          className="shrink-0"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || !!selectedImage || !!recordedBlob}
          size="icon"
          variant={isRecording ? "destructive" : "outline"}
          className="shrink-0"
        >
          {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled || isRecording}
          className="flex-1 text-sm md:text-base"
        />
        <Button 
          type="submit" 
          disabled={disabled || isRecording || (!message.trim() && !selectedImage && !recordedBlob)} 
          size="icon" 
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;