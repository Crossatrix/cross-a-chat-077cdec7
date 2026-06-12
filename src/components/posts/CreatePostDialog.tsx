import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Image, Video, BarChart3, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assertNotBlocked } from "@/utils/contentBlock";

interface CreatePostDialogProps {
  currentUserId: string;
  onPostCreated: () => void;
}

const CreatePostDialog = ({ currentUserId, onPostCreated }: CreatePostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setContent("");
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageFile(file);
    setVideoFile(null);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be under 50MB"); return; }
    setVideoFile(file);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile && !videoFile) {
      toast.error("Post cannot be empty");
      return;
    }
    if (showPoll && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) {
      toast.error("Poll needs a question and at least 2 options");
      return;
    }

    if (await assertNotBlocked(currentUserId)) return;
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${currentUserId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, imageFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      if (videoFile) {
        const ext = videoFile.name.split('.').pop();
        const path = `${currentUserId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, videoFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        videoUrl = urlData.publicUrl;
      }

      const postData: any = {
        user_id: currentUserId,
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
      };

      if (showPoll && pollQuestion.trim()) {
        postData.poll_question = pollQuestion.trim();
        postData.poll_options = pollOptions.filter(o => o.trim()).map(o => o.trim());
      }

      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;

      toast.success("Post created!");
      reset();
      setOpen(false);
      onPostCreated();
    } catch (error: any) {
      toast.error("Failed to create post: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
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

          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="rounded-lg max-h-48 w-full object-cover" />
              <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {videoFile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{videoFile.name}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setVideoFile(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {showPoll && (
            <div className="space-y-2 p-3 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Poll</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPoll(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input placeholder="Poll question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} maxLength={200} />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[i] = e.target.value;
                      setPollOptions(updated);
                    }}
                    maxLength={100}
                  />
                  {pollOptions.length > 2 && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}>
                  Add Option
                </Button>
              )}
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
            {!showPoll && (
              <button onClick={() => setShowPoll(true)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
                <BarChart3 className="h-4 w-4" />
                <span>Poll</span>
              </button>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
