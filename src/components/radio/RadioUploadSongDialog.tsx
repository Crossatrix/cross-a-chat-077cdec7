import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Props {
  userId: string;
  onUploaded: () => void;
}

export default function RadioUploadSongDialog({ userId, onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const getDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const a = document.createElement("audio");
      a.preload = "metadata";
      a.onloadedmetadata = () => resolve(Math.round(a.duration || 180));
      a.onerror = () => resolve(180);
      a.src = URL.createObjectURL(file);
    });

  const submit = async () => {
    if (!title.trim() || !audioFile) {
      toast.error("Title and audio file required");
      return;
    }
    setUploading(true);
    try {
      const duration = await getDuration(audioFile);
      const rawExt = (audioFile.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const audioExt = rawExt || (audioFile.type.includes("mpeg") ? "mp3" : audioFile.type.split("/")[1] || "mp3");
      const audioContentType = audioFile.type && audioFile.type !== "application/octet-stream"
        ? audioFile.type
        : (audioExt === "mp3" ? "audio/mpeg" : audioExt === "m4a" ? "audio/mp4" : audioExt === "wav" ? "audio/wav" : audioExt === "ogg" ? "audio/ogg" : "audio/mpeg");
      const audioPath = `${userId}/${crypto.randomUUID()}.${audioExt}`;
      const { error: aErr } = await supabase.storage
        .from("radio-audio")
        .upload(audioPath, audioFile, { upsert: false, contentType: audioContentType });
      if (aErr) throw aErr;

      let coverPath: string | null = null;
      if (coverFile) {
        const coverExt = (coverFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        coverPath = `${userId}/${crypto.randomUUID()}.${coverExt}`;
        const { error: cErr } = await supabase.storage
          .from("radio-covers")
          .upload(coverPath, coverFile, { upsert: false, contentType: coverFile.type || "image/jpeg" });
        if (cErr) throw cErr;
      }

      const { error: iErr } = await supabase.from("radio_songs").insert({
        uploader_id: userId,
        title: title.trim(),
        artist: artist.trim() || null,
        audio_url: audioPath,
        cover_url: coverPath,
        duration_seconds: duration,
      });
      if (iErr) throw iErr;

      toast.success("Song uploaded");
      setOpen(false);
      setTitle("");
      setArtist("");
      setAudioFile(null);
      setCoverFile(null);
      onUploaded();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Upload className="h-4 w-4 mr-1" /> Upload Song
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Radio Song</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Artist</Label>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
          </div>
          <div>
            <Label>Audio file</Label>
            <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label>Cover art (optional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" onClick={submit} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
