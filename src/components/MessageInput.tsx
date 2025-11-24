import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Video, Mic, StopCircle, X, Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (message: string, imageFile?: File, voiceFile?: Blob, videoFile?: File, generateImage?: boolean) => void;
  disabled?: boolean;
  isAIChat?: boolean;
  onModelChange?: (model: string) => void;
  selectedModel?: string;
}

const messageSchema = z.string()
  .trim()
  .max(2000, "Message too long (max 2000 characters)")
  .refine(
    (val) => !/<script|<iframe|javascript:|onerror=|onload=/i.test(val),
    "Message contains invalid content"
  );

const MessageInput = ({ onSend, disabled, isAIChat = false, onModelChange, selectedModel = "openai/gpt-5-mini" }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [generateImage, setGenerateImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please select an image file (JPEG, PNG, GIF, or WEBP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please select a video file (MP4, WebM, MOV, AVI, or MKV)");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be less than 50MB");
        return;
      }
      setSelectedVideo(file);
    }
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 md:p-4 border-t border-border bg-card shrink-0">
      {isAIChat && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selectedModel === "openai/gpt-5-nano" ? "default" : "outline"}
            size="sm"
            onClick={() => onModelChange?.("openai/gpt-5-nano")}
          >
            Fast
          </Button>
          <Button
            type="button"
            variant={selectedModel === "openai/gpt-5-mini" ? "default" : "outline"}
            size="sm"
            onClick={() => onModelChange?.("openai/gpt-5-mini")}
          >
            Detailed
          </Button>
          <Button
            type="button"
            variant={generateImage ? "default" : "outline"}
            size="sm"
            onClick={() => setGenerateImage(!generateImage)}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Generate Image
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
      {selectedVideo && (
        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedVideo.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedVideo(null);
              if (videoInputRef.current) {
                videoInputRef.current.value = "";
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
        {!isAIChat && (
          <>
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
              <ImageIcon className="h-4 w-4" />
            </Button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
              onChange={handleVideoSelect}
              className="hidden"
              disabled={disabled || isRecording}
            />
            <Button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={disabled || isRecording || !!recordedBlob}
              size="icon"
              variant="outline"
              className="shrink-0"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || !!selectedImage || !!selectedVideo || !!recordedBlob}
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              className="shrink-0"
            >
              {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </>
        )}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled || isRecording}
          className="flex-1 text-sm md:text-base"
        />
        <Button 
          type="submit" 
          disabled={disabled || isRecording || (!message.trim() && !selectedImage && !selectedVideo && !recordedBlob)} 
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
