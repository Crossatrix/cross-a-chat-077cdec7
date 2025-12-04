import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Upload, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomEmoji {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

const EmojiManager = () => {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newEmojiName, setNewEmojiName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const fetchEmojis = async () => {
    const { data, error } = await supabase
      .from("custom_emojis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("emoji.loadFailed"));
    } else {
      setEmojis(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmojis();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error(t("emoji.invalidFormat"));
        return;
      }
      if (file.size > 512 * 1024) {
        toast.error(t("emoji.tooLarge"));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newEmojiName.trim()) {
      toast.error(t("emoji.enterName"));
      return;
    }

    const sanitizedName = newEmojiName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${sanitizedName}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("custom-emojis")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("custom-emojis")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("custom_emojis")
        .insert({
          name: sanitizedName,
          image_url: urlData.publicUrl,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success(t("emoji.added"));
      setNewEmojiName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchEmojis();
    } catch (error: any) {
      toast.error(error.message || t("emoji.addFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (emoji: CustomEmoji) => {
    try {
      // Extract filename from URL
      const urlParts = emoji.image_url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      await supabase.storage.from("custom-emojis").remove([fileName]);
      
      const { error } = await supabase
        .from("custom_emojis")
        .delete()
        .eq("id", emoji.id);

      if (error) throw error;

      toast.success(t("emoji.deleted"));
      fetchEmojis();
    } catch (error) {
      toast.error(t("emoji.deleteFailed"));
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("emoji.manage")}</CardTitle>
        <CardDescription>{t("emoji.manageDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t("emoji.namePlaceholder")}
            value={newEmojiName}
            onChange={(e) => setNewEmojiName(e.target.value)}
            className="flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Upload className="h-4 w-4 mr-2" />
            {selectedFile ? selectedFile.name.slice(0, 15) + "..." : t("emoji.selectImage")}
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !newEmojiName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {uploading ? t("common.loading") : t("emoji.add")}
          </Button>
        </div>

        {emojis.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">{t("emoji.none")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {emojis.map((emoji) => (
              <div
                key={emoji.id}
                className="flex flex-col items-center gap-2 p-3 bg-secondary rounded-lg"
              >
                <img
                  src={emoji.image_url}
                  alt={emoji.name}
                  className="w-12 h-12 object-contain"
                />
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  :{emoji.name}:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(emoji)}
                  className="h-7 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmojiManager;