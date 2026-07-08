import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitModEvent } from "@/utils/modEvents";

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    video_url: string | null;
  };
  onUpdated: () => void;
}

const EditPostDialog = ({ open, onOpenChange, post, onUpdated }: EditPostDialogProps) => {
  const [content, setContent] = useState(post.content);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(post.image_url);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(post.video_url);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setContent(post.content);
      setExistingImageUrl(post.image_url);
      setExistingVideoUrl(post.video_url);
      setNewImageFile(null);
      setNewImagePreview(null);
      setNewVideoFile(null);
    }
  }, [open, post]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
    setExistingImageUrl(null);
    setNewVideoFile(null);
    setExistingVideoUrl(null);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be under 50MB"); return; }
    setNewVideoFile(file);
    setNewImageFile(null);
    setNewImagePreview(null);
    setExistingImageUrl(null);
    setExistingVideoUrl(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !existingImageUrl && !existingVideoUrl && !newImageFile && !newVideoFile) {
      toast.error("Post cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = existingImageUrl;
      let videoUrl = existingVideoUrl;

      if (newImageFile) {
        const ext = newImageFile.name.split('.').pop();
        const path = `${post.user_id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, newImageFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
        videoUrl = null;
      }

      if (newVideoFile) {
        const ext = newVideoFile.name.split('.').pop();
        const path = `${post.user_id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, newVideoFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        videoUrl = urlData.publicUrl;
        imageUrl = null;
      }

      const { error } = await supabase.from('posts').update({
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
      }).eq('id', post.id);

      if (error) throw error;

      emitModEvent("editpost", { postId: post.id });
      toast.success("Post updated!");
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      toast.error("Failed to update post: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">{content.length}/2000</p>

          {(existingImageUrl || newImagePreview) && (
            <div className="relative">
              <img src={existingImageUrl || newImagePreview!} alt="Preview" className="rounded-lg max-h-48 w-full object-cover" />
              <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setExistingImageUrl(null); setNewImageFile(null); setNewImagePreview(null); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {(existingVideoUrl || newVideoFile) && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{newVideoFile ? newVideoFile.name : "Current video"}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setExistingVideoUrl(null); setNewVideoFile(null); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
                <Image className="h-4 w-4" />
                <span>Image</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
                <Video className="h-4 w-4" />
                <span>Video</span>
              </div>
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostDialog;
