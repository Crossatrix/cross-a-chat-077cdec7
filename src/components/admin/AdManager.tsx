import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Trash2, Film } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  short: "Short (1-10s)",
  medium: "Medium (10-30s)",
  long: "Long (30-60s)",
  xl: "XL (>60s)",
};

function categorize(duration: number): string {
  if (duration <= 10) return "short";
  if (duration <= 30) return "medium";
  if (duration <= 60) return "long";
  return "xl";
}

const AdManager = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(data || []);
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const duration = await getVideoDuration(file);
      const category = categorize(duration);
      const fileName = `ad_${Date.now()}.mp4`;

      const { error: uploadErr } = await supabase.storage.from("ad-videos").upload(fileName, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("ad-videos").getPublicUrl(fileName);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertErr } = await supabase.from("ads").insert({
        title: title.trim(),
        video_url: urlData.publicUrl,
        duration,
        category,
        created_by: user?.id,
      });
      if (insertErr) throw insertErr;

      toast.success(`Ad uploaded! Category: ${CATEGORY_LABELS[category]} (${duration}s)`);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchAds();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (ad: any) => {
    try {
      const urlParts = ad.video_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from("ad-videos").remove([fileName]);
      await supabase.from("ads").delete().eq("id", ad.id);
      toast.success("Ad deleted");
      fetchAds();
    } catch {
      toast.error("Failed to delete ad");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Ads Manager</h3>
        <span className="text-xs text-muted-foreground">({ads.length} ads)</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Ad title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 max-w-xs"
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          {file ? file.name.slice(0, 20) + "..." : "Select .mp4"}
        </Button>
        <Button size="sm" onClick={handleUpload} disabled={uploading || !file || !title.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Add Ad"}
        </Button>
      </div>

      {ads.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-auto">
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30">
              <Film className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate font-medium">{ad.title}</span>
              <span className="text-muted-foreground">{ad.duration}s</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
                {CATEGORY_LABELS[ad.category] || ad.category}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDelete(ad)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdManager;
