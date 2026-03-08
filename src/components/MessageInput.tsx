import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, StopCircle, X, Sparkles, Coins, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import EmojiPicker from "./EmojiPicker";
import EffectsPicker from "./EffectsPicker";
import MediaPicker from "./MediaPicker";
import RichTextInput, { type EffectTagInfo } from "./RichTextInput";

interface CustomEmoji {
  id: string;
  name: string;
  image_url: string;
}

interface MessageInputProps {
  onSend: (message: string, imageFile?: File, voiceFile?: Blob, videoFile?: File, generateImage?: boolean, isSystemMessage?: boolean) => Promise<void> | void;
  disabled?: boolean;
  isAIChat?: boolean;
  onModelChange?: (model: string) => void;
  selectedModel?: string;
  onTyping?: () => void;
  aiCredits?: number;
  onCreditsUpdate?: () => void;
  isSending?: boolean;
  canSendSystemMessage?: boolean;
}

const messageSchema = z.string()
  .trim()
  .max(2000, "Message too long (max 2000 characters)")
  .refine(
    (val) => !/<script|<iframe|javascript:|onerror=|onload=/i.test(val),
    "Message contains invalid content"
  );

const MessageInput = ({ onSend, disabled, isAIChat = false, onModelChange, selectedModel = "openai/gpt-5-mini", onTyping, aiCredits, onCreditsUpdate, isSending = false, canSendSystemMessage = false }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [generateImage, setGenerateImage] = useState(false);
  const [editingEffect, setEditingEffect] = useState<EffectTagInfo | null>(null);
  const [pendingSystemMessage, setPendingSystemMessage] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
    
    // Allow sending media without text
    if (!message.trim() && !selectedImage && !selectedVideo && !recordedBlob) {
      toast.error("Please enter a message, select an image/video, or record a voice message");
      return;
    }

    // Only validate text if text is present
    if (message.trim()) {
      const validation = messageSchema.safeParse(message);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    // Send with empty string if no text (media only)
    onSend(message.trim() || "", selectedImage || undefined, recordedBlob || undefined, selectedVideo || undefined, generateImage);
    setMessage("");
    setSelectedImage(null);
    setSelectedVideo(null);
    setRecordedBlob(null);
    setRecordingTime(0);
    setGenerateImage(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 md:p-4 border-t border-border bg-card shrink-0">
      {isAIChat && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span>{aiCredits?.toFixed(1) ?? '15.0'}/15</span>
          </div>
          <Button
            type="button"
            variant={selectedModel === "openai/gpt-5-nano" ? "default" : "outline"}
            size="sm"
            onClick={() => onModelChange?.("openai/gpt-5-nano")}
            title="0.5 credits"
          >
            Fast (0.5)
          </Button>
          <Button
            type="button"
            variant={selectedModel === "openai/gpt-5-mini" && !generateImage ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onModelChange?.("openai/gpt-5-mini");
              setGenerateImage(false);
            }}
            title="1 credit"
          >
            Normal (1)
          </Button>
          <Button
            type="button"
            variant={selectedModel === "openai/gpt-5" ? "default" : "outline"}
            size="sm"
            onClick={() => onModelChange?.("openai/gpt-5")}
            title="1.5 credits"
          >
            Detailed (1.5)
          </Button>
          <Button
            type="button"
            variant={generateImage ? "default" : "outline"}
            size="sm"
            onClick={() => setGenerateImage(!generateImage)}
            title="5 credits"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Image (5)
          </Button>
        </div>
      )}
      {selectedImage && (
        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedImage.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedImage(null)}
            className="h-6 px-2"
          >
            Remove
          </Button>
        </div>
      )}
      {selectedVideo && (
        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedVideo.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedVideo(null)}
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
        {!isAIChat && (
          <MediaPicker
            onImageSelect={(file) => setSelectedImage(file)}
            onVideoSelect={(file) => setSelectedVideo(file)}
            onVoiceStart={startRecording}
            disabled={disabled}
            isRecording={isRecording}
            hasMedia={!!selectedImage || !!selectedVideo || !!recordedBlob}
          />
        )}
        {isRecording && (
          <Button
            type="button"
            onClick={stopRecording}
            size="icon"
            variant="destructive"
            className="shrink-0"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        )}
        <EmojiPicker 
          onEmojiSelect={(emoji: CustomEmoji) => setMessage(prev => prev + ` :${emoji.name}: `)}
          disabled={disabled || isRecording}
        />
        <EffectsPicker
          onEffectSelect={(tag: string) => {
            if (editingEffect) {
              // Replace the old effect tag with the new one
              setMessage(prev => prev.replace(editingEffect.fullMatch, tag));
              setEditingEffect(null);
            } else {
              setMessage(prev => prev + tag);
            }
          }}
          disabled={disabled || isRecording}
          editingEffect={editingEffect}
          onEditCancel={() => setEditingEffect(null)}
        />
        <RichTextInput
          value={message}
          onChange={(val) => {
            setMessage(val);
            onTyping?.();
          }}
          placeholder="Type a message..."
          disabled={disabled || isRecording}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) form.requestSubmit();
            }
          }}
          onEffectDoubleClick={(info) => setEditingEffect(info)}
        />
        <Button 
          type="submit" 
          disabled={disabled || isRecording || isSending || (!message.trim() && !selectedImage && !selectedVideo && !recordedBlob)} 
          size="icon" 
          className="shrink-0"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;
