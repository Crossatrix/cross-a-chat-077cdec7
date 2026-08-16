import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Image as ImageIcon, Video, Mic } from "lucide-react";
import { toast } from "sonner";

interface MediaPickerProps {
  onImageSelect: (file: File) => void;
  onVideoSelect: (file: File) => void;
  onVoiceStart: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  hasMedia?: boolean;
}

const MediaPicker = ({
  onImageSelect,
  onVideoSelect,
  onVoiceStart,
  disabled,
  isRecording,
  hasMedia,
}: MediaPickerProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default MediaPicker;
