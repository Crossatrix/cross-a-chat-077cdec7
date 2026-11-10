import { useRef, useState } from "react";
import CrossiCloudPicker from "./CrossiCloudPicker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Image as ImageIcon, Video, Mic, Cloud, FileText } from "lucide-react";
import { toast } from "sonner";

interface MediaPickerProps {
  onImageSelect: (file: File) => void;
  onVideoSelect: (file: File) => void;
  onVoiceStart: () => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  isRecording?: boolean;
  hasMedia?: boolean;
}

const MediaPicker = ({
  onImageSelect,
  onVideoSelect,
  onVoiceStart,
  onFileSelect,
  disabled,
  isRecording,
  hasMedia,
}: MediaPickerProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudOpen, setCloudOpen] = useState(false);

  const handleAnyFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be less than 50MB");
      return;
    }
    onFileSelect?.(file);
  };

  const routeFile = (f: File) => {
    const imgTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (imgTypes.includes(f.type) && f.size <= 5 * 1024 * 1024) return onImageSelect(f);
    if (f.type.startsWith("video/") && f.size <= 50 * 1024 * 1024) return onVideoSelect(f);
    handleAnyFile(f);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      onImageSelect(file);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      onVideoSelect(file);
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
        onChange={handleVideoChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleAnyFile(f);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        className="hidden"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || isRecording || hasMedia}
            className="shrink-0"
            title="Add Media"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              Image
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="h-4 w-4" />
              Video
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="justify-start gap-2"
              onClick={onVoiceStart}
            >
              <Mic className="h-4 w-4" />
              Voice Message
            </Button>
            {onFileSelect && (
              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4" />
                File
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => setCloudOpen(true)}
            >
              <Cloud className="h-4 w-4" />
              Crossi Cloud
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <CrossiCloudPicker
        open={cloudOpen}
        onOpenChange={setCloudOpen}
        onPick={routeFile}
        allowAny={!!onFileSelect}
      />
    </>
  );
};

export default MediaPicker;
