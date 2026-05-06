import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Music, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  onUploaded: () => void;
}

const MAX_AUDIO = 25 * 1024 * 1024; // 25MB

const MusicUploadDialog = ({ userId, onUploaded }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [membersOnly, setMembersOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setCoverFile(f);
      setCoverPreview(URL.createObjectURL(f));
    }
  };

  const getDuration = (file: File): Promise<number> => new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => resolve(audio.duration || 0);
    audio.onerror = () => resolve(0);
  });

  const handleUpload = async () => {
    if (!title.trim() || !audioFile) {
      toast.error("Title and audio file required");
      return;
    }
    if (audioFile.size > MAX_AUDIO) {
      toast.error("Audio must be under 25MB");
      return;
    }
    setUploading(true);
    try {
      const duration = await getDuration(audioFile);

      const audioExt = audioFile.name.split(".").pop();
      const audioPath = `${userId}/${Date.now()}.${audioExt}`;
      const { error: aErr } = await supabase.storage.from("music-audio").upload(audioPath, audioFile);
      if (aErr) throw aErr;
      const audioUrl = supabase.storage.from("music-audio").getPublicUrl(audioPath).data.publicUrl;

      let coverUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("music-covers").upload(path, coverFile);
        if (error) throw error;
        coverUrl = supabase.storage.from("music-covers").getPublicUrl(path).data.publicUrl;
      }

      const { error: insErr } = await supabase.from("music_tracks").insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        audio_url: audioUrl,
        cover_url: coverUrl,
        duration,
        members_only: membersOnly,
      } as any);
      if (insErr) throw insErr;

      toast.success("Track uploaded!");
      setTitle(""); setDescription(""); setAudioFile(null); setCoverFile(null); setCoverPreview(null);
      setOpen(false);
      onUploaded();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload Music
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Music Track</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Track title *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full gap-2" onClick={() => audioInputRef.current?.click()}>
              <Music className="h-4 w-4" />
              {audioFile ? audioFile.name : "Select audio file (mp3/wav) *"}
            </Button>
            {audioFile && (
              <p className="text-xs text-muted-foreground mt-1">{(audioFile.size / 1048576).toFixed(1)} MB</p>
            )}
          </div>
          <div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
            <Button variant="outline" className="w-full gap-2" onClick={() => coverInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
              {coverFile ? "Cover selected" : "Cover art (optional)"}
            </Button>
            {coverPreview && (
              <div className="relative mt-2">
                <img src={coverPreview} alt="Cover" className="rounded-lg w-full h-40 object-cover" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
            <span className="text-sm font-medium">Members Only</span>
            <input type="checkbox" checked={membersOnly} onChange={(e) => setMembersOnly(e.target.checked)} className="h-4 w-4" />
          </label>
          <Button onClick={handleUpload} disabled={uploading || !title.trim() || !audioFile} className="w-full">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</> : "Upload Track"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MusicUploadDialog;
