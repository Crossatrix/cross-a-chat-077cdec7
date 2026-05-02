import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, X, Image, ShieldAlert, Loader2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VIDEO_CATEGORIES } from "@/utils/videoCategories";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import LiveBroadcaster from "@/components/live/LiveBroadcaster";

interface VideoUploadDialogProps {
  userId: string;
  onUploaded: () => void;
}

const VideoUploadDialog = ({ userId, onUploaded }: VideoUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [adultsOnly, setAdultsOnly] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatorStatus, setCreatorStatus] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCreatorStatus = async () => {
      const { data } = await supabase
        .from("creator_verifications")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      setCreatorStatus(data?.status || null);
    };
    fetchCreatorStatus();
  }, [userId]);

  const isVerifiedCreator = creatorStatus === "verified" || creatorStatus === "verified_plus";

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !videoFile) {
      toast.error("Title and video file are required");
      return;
    }

    setUploading(true);
    try {
      const videoExt = videoFile.name.split(".").pop();
      const videoPath = `${userId}/${Date.now()}.${videoExt}`;
      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoFile);
      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(videoPath);

      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split(".").pop();
        const thumbPath = `${userId}/${Date.now()}_thumb.${thumbExt}`;
        const { error: thumbError } = await supabase.storage
          .from("video-thumbnails")
          .upload(thumbPath, thumbnailFile);
        if (thumbError) throw thumbError;
        const { data: thumbUrlData } = supabase.storage
          .from("video-thumbnails")
          .getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrlData.publicUrl;
      }

      // Determine initial moderation status
      const needsAnalysis = !isVerifiedCreator && !adultsOnly;

      const { data: insertedVideo, error: insertError } = await supabase.from("videos").insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        category,
        adults_only: adultsOnly,
        moderation_status: needsAnalysis ? 'pending' : 'approved',
      } as any).select().single();

      if (insertError) throw insertError;

      // Notify followers (fire-and-forget) - only if approved immediately
      if (!needsAnalysis) {
        supabase.functions.invoke("notify-followers", {
          body: { creatorId: userId, videoTitle: title.trim() },
        }).catch((err) => console.error("Failed to notify followers:", err));
      }

      // Trigger AI analysis for unverified creators with non-18+ videos
      if (needsAnalysis && insertedVideo) {
        setUploading(false);
        setAnalyzing(true);
        toast.info("🔍 Your video is being analyzed for content compliance...", { duration: 10000 });

        try {
          const { data: analyzerResult, error: analyzerError } = await supabase.functions.invoke("video-content-analyzer", {
            body: { videoId: (insertedVideo as any).id },
          });

          if (analyzerError) {
            console.error("Analyzer error:", analyzerError);
            toast.warning("Content analysis couldn't complete. Your video has been published.");
          } else if (analyzerResult?.struck) {
            toast.error(
              `⚠️ Your video has been struck for: ${analyzerResult.violations?.join(', ')}. You can appeal this decision from your video list.`,
              { duration: 15000 }
            );
          } else if (analyzerResult?.autoMarked18Plus) {
            toast.warning("Your video was auto-marked as 18+ content based on AI analysis.", { duration: 8000 });
            // Notify followers now that it's approved
            supabase.functions.invoke("notify-followers", {
              body: { creatorId: userId, videoTitle: title.trim() },
            }).catch((err) => console.error("Failed to notify followers:", err));
          } else {
            toast.success("✅ Video approved and published!");
            // Notify followers
            supabase.functions.invoke("notify-followers", {
              body: { creatorId: userId, videoTitle: title.trim() },
            }).catch((err) => console.error("Failed to notify followers:", err));
          }
        } catch (err) {
          console.error("Analyzer invocation error:", err);
          toast.warning("Content analysis couldn't complete. Your video has been published.");
        }
        setAnalyzing(false);
      } else {
        toast.success("Video uploaded!");
      }

      setTitle("");
      setDescription("");
      setCategory("other");
      setAdultsOnly(false);
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setOpen(false);
      onUploaded();
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Video title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <Label htmlFor="adults-only" className="text-sm font-medium cursor-pointer">Adults Only (18+)</Label>
            </div>
            <Switch id="adults-only" checked={adultsOnly} onCheckedChange={setAdultsOnly} />
          </div>

          {!isVerifiedCreator && !adultsOnly && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p>📋 Your video will be automatically analyzed by AI for content compliance before publishing. This may take a moment.</p>
            </div>
          )}

          <div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => videoInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {videoFile ? videoFile.name : "Select Video File *"}
            </Button>
            {videoFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>
          <div>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => thumbInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
              {thumbnailFile ? "Thumbnail selected" : "Select Thumbnail (optional)"}
            </Button>
            {thumbnailPreview && (
              <div className="relative mt-2">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="rounded-lg w-full h-32 object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <Button onClick={handleUpload} disabled={uploading || analyzing || !title.trim() || !videoFile} className="w-full">
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing content...</>
            ) : uploading ? (
              "Uploading..."
            ) : (
              "Upload Video"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadDialog;
