import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, RefreshCw } from "lucide-react";
import FileExplorer, { FileItem } from "@/components/admin/FileExplorer";
import FilePreview from "@/components/admin/FilePreview";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [tempBanDialogOpen, setTempBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [tempBanDays, setTempBanDays] = useState("7");
  const [pendingBanUserId, setPendingBanUserId] = useState<string | null>(null);
  const [newEmojiName, setNewEmojiName] = useState("");
  const [selectedEmojiFile, setSelectedEmojiFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [emojiCategories, setEmojiCategories] = useState<string[]>(["general"]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        toast.error(t("admin.accessDenied"));
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate, t]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    const [emojiFolder, reports, users, feedback] = await Promise.all([
      fetchEmojis(),
      fetchReports(),
      fetchUsers(),
      fetchFeedback(),
    ]);

    const fileStructure: FileItem[] = [
      emojiFolder,
      {
        id: "reports",
        name: "Reports",
        type: "folder",
        children: reports,
      },
      {
        id: "users",
        name: "Users",
        type: "folder",
        children: users,
      },
      {
        id: "feedback",
        name: "Feedback",
        type: "folder",
        children: feedback,
      },
    ];

    setFiles(fileStructure);
  };

  const fetchEmojis = async (): Promise<FileItem> => {
    const { data } = await supabase
      .from("custom_emojis")
      .select("*")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });

    // Group emojis by category
    const categoryMap = new Map<string, FileItem[]>();
    const categories = new Set<string>(["general"]);
    
    (data || []).forEach((emoji) => {
      const category = emoji.category || "general";
      categories.add(category);
      const ext = emoji.image_url.includes(".gif") ? "gif" : 
                  emoji.image_url.includes(".webp") ? "webp" : "png";
      
      const fileItem: FileItem = {
        id: `emoji-${emoji.id}`,
        name: emoji.name,
        type: "file",
        extension: ext,
        data: emoji,
        category: category,
      };

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(fileItem);
    });

    // Update available categories
    setEmojiCategories(Array.from(categories).sort());

    // Create category folders
    const categoryFolders: FileItem[] = Array.from(categoryMap.entries()).map(([category, emojis]) => ({
      id: `emoji-category-${category}`,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      type: "folder" as const,
      children: emojis,
      data: { type: "emoji-category", category },
    }));

    return {
      id: "emojis",
      name: "Emojis",
      type: "folder",
      children: categoryFolders,
      allowCreateFolder: true,
    };
  };

  const handleCreateFolder = (parentId: string, folderName: string) => {
    if (parentId === "emojis") {
      const sanitizedName = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      if (!emojiCategories.includes(sanitizedName)) {
        setEmojiCategories(prev => [...prev, sanitizedName].sort());
        setSelectedCategory(sanitizedName);
        toast.success(`Category "${folderName}" created`);
        fetchAllData();
      } else {
        toast.error("Category already exists");
      }
    }
  };

  const fetchReports = async (): Promise<FileItem[]> => {
    const { data } = await supabase
      .from("user_reports")
      .select(`
        *,
        reporter:profiles!reporter_id(username),
        reported_user:profiles!reported_user_id(username)
      `)
      .order("created_at", { ascending: false });

    return (data || []).map((report) => ({
      id: `report-${report.id}`,
      name: `report_${report.reported_user?.username}_${new Date(report.created_at).toISOString().split('T')[0]}`,
      type: "file" as const,
      extension: "txt",
      data: { ...report, type: "report" },
    }));
  };

  const fetchUsers = async (): Promise<FileItem[]> => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: bans } = await supabase.from("user_bans").select("*");
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const banMap = new Map(bans?.map((b) => [b.user_id, b]) || []);
    const adminSet = new Set(adminRoles?.map((r) => r.user_id) || []);

    return (profiles || []).map((user) => {
      const ban = banMap.get(user.id);
      return {
        id: `user-${user.id}`,
        name: user.username,
        type: "file" as const,
        extension: "txt",
        data: {
          ...user,
          type: "user",
          banned: !!ban,
          banExpiresAt: ban?.expires_at,
          isAdmin: adminSet.has(user.id),
        },
      };
    });
  };

  const fetchFeedback = async (): Promise<FileItem[]> => {
    const { data } = await supabase
      .from("feedback")
      .select("*, profiles:user_id(username)")
      .order("created_at", { ascending: false });

    return (data || []).map((fb: any) => ({
      id: `feedback-${fb.id}`,
      name: `feedback_${fb.profiles?.username || "anon"}_${new Date(fb.created_at).toISOString().split('T')[0]}`,
      type: "file" as const,
      extension: "txt",
      data: { ...fb, type: "feedback", username: fb.profiles?.username },
    }));
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.type === "image/gif") {
        resolve(file);
        return;
      }

      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        const maxSize = 128;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/webp", lastModified: Date.now() }));
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/webp",
          0.8
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleEmojiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/png", "image/gif", "image/webp", "image/jpeg"];
      if (!validTypes.includes(file.type)) {
        toast.error(t("emoji.invalidFormat"));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("emoji.tooLarge"));
        return;
      }
      try {
        const compressedFile = await compressImage(file);
        setSelectedEmojiFile(compressedFile);
      } catch {
        toast.error(t("emoji.compressionFailed"));
      }
    }
  };

  const handleUploadEmoji = async () => {
    if (!selectedEmojiFile || !newEmojiName.trim()) {
      toast.error(t("emoji.enterName"));
      return;
    }

    const sanitizedName = newEmojiName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedEmojiFile.name.split(".").pop();
      const fileName = `${sanitizedName}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("custom-emojis")
        .upload(fileName, selectedEmojiFile);

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
          category: selectedCategory,
        });

      if (insertError) throw insertError;

      toast.success(t("emoji.added"));
      setNewEmojiName("");
      setSelectedEmojiFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || t("emoji.addFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: FileItem) => {
    const data = file.data;

    if (file.extension === "png" || file.extension === "gif" || file.extension === "webp") {
      try {
        const urlParts = data.image_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from("custom-emojis").remove([fileName]);
        await supabase.from("custom_emojis").delete().eq("id", data.id);
        toast.success(t("emoji.deleted"));
      } catch {
        toast.error(t("emoji.deleteFailed"));
      }
    } else if (data.type === "report") {
      await supabase.from("user_reports").delete().eq("id", data.id);
      toast.success("Report deleted");
    } else if (data.type === "feedback") {
      await supabase.from("feedback").delete().eq("id", data.id);
      toast.success("Feedback deleted");
    }

    setSelectedFile(null);
    fetchAllData();
  };

  const handleAction = async (action: string, file: FileItem) => {
    const data = file.data;
    const { data: { user } } = await supabase.auth.getUser();

    switch (action) {
      case "ai_review":
        toast.info(t("ai.reviewing"));
        try {
          const { error } = await supabase.functions.invoke("ai-moderator", {
            body: { reportId: data.id },
          });
          if (error) throw error;
          toast.success(t("ai.reviewComplete"));
          fetchAllData();
        } catch {
          toast.error(t("ai.reviewFailed"));
        }
        break;

      case "resolve":
        await supabase
          .from("user_reports")
          .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id })
          .eq("id", data.id);
        toast.success("Report resolved");
        fetchAllData();
        break;

      case "ban":
        setPendingBanUserId(data.reported_user_id);
        setBanDialogOpen(true);
        break;

      case "temp_ban":
        setPendingBanUserId(data.reported_user_id);
        setTempBanDialogOpen(true);
        break;

      case "ban_user":
        setPendingBanUserId(data.id);
        setBanDialogOpen(true);
        break;

      case "unban":
        await supabase.from("user_bans").delete().eq("user_id", data.id);
        toast.success("User unbanned");
        fetchAllData();
        break;

      case "promote":
        await supabase.rpc("promote_to_admin", { target_user_id: data.id });
        toast.success("User promoted to admin");
        fetchAllData();
        break;

      case "demote":
        await supabase.rpc("demote_from_admin", { target_user_id: data.id });
        toast.success("Admin role removed");
        fetchAllData();
        break;

      case "resolve_feedback":
        await supabase.from("feedback").update({ status: "resolved" }).eq("id", data.id);
        toast.success("Feedback resolved");
        fetchAllData();
        break;

      case "reopen":
        await supabase.from("feedback").update({ status: "pending" }).eq("id", data.id);
        toast.success("Feedback reopened");
        fetchAllData();
        break;

      case "toggle_important":
        await supabase.from("feedback").update({ important: !data.important }).eq("id", data.id);
        toast.success(data.important ? "Unmarked as important" : "Marked as important");
        fetchAllData();
        break;
    }
  };

  const handleBan = async () => {
    if (!pendingBanUserId || !banReason.trim()) {
      toast.error("Please enter a ban reason");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_bans").insert({
      user_id: pendingBanUserId,
      banned_by: user?.id,
      reason: banReason,
    });

    toast.success("User banned permanently");
    setBanDialogOpen(false);
    setBanReason("");
    setPendingBanUserId(null);
    fetchAllData();
  };

  const handleTempBan = async () => {
    if (!pendingBanUserId || !banReason.trim()) {
      toast.error("Please enter a ban reason");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const days = parseInt(tempBanDays) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await supabase.from("user_bans").insert({
      user_id: pendingBanUserId,
      banned_by: user?.id,
      reason: `${days} day temp ban: ${banReason}`,
      expires_at: expiresAt.toISOString(),
    });

    toast.success(`User banned for ${days} days`);
    setTempBanDialogOpen(false);
    setBanReason("");
    setTempBanDays("7");
    setPendingBanUserId(null);
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card p-3 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("admin.backToChat")}
            </Button>
            <h1 className="text-xl font-bold text-primary">{t("admin.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Emoji Upload Bar */}
      <div className="border-b border-border bg-card/50 p-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 max-w-7xl mx-auto flex-wrap">
          <Input
            placeholder={t("emoji.namePlaceholder")}
            value={newEmojiName}
            onChange={(e) => setNewEmojiName(e.target.value)}
            className="flex-1 max-w-xs"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            {emojiCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/gif,image/webp"
            onChange={handleEmojiFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {selectedEmojiFile ? selectedEmojiFile.name.slice(0, 15) + "..." : t("emoji.selectImage")}
          </Button>
          <Button onClick={handleUploadEmoji} disabled={uploading || !selectedEmojiFile || !newEmojiName.trim()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {uploading ? t("common.loading") : "Add Emoji"}
          </Button>
        </div>
      </div>

      {/* File Explorer Layout */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto w-full min-h-0">
        <div className="w-full md:w-80 shrink-0 h-64 md:h-auto">
          <FileExplorer
            items={files}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            onCreateFolder={handleCreateFolder}
          />
        </div>
        <div className="flex-1 min-h-64 md:min-h-0">
          <FilePreview
            file={selectedFile}
            onDelete={handleDelete}
            onAction={handleAction}
          />
        </div>
      </main>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User Permanently</DialogTitle>
            <DialogDescription>Enter a reason for the ban.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="banReason">Reason</Label>
              <Input
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBan}>
              Ban Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Ban Dialog */}
      <Dialog open={tempBanDialogOpen} onOpenChange={setTempBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Ban</DialogTitle>
            <DialogDescription>Set ban duration and reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tempBanDays">Duration (days)</Label>
              <Input
                id="tempBanDays"
                type="number"
                min="1"
                max="14"
                value={tempBanDays}
                onChange={(e) => setTempBanDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempBanReason">Reason</Label>
              <Input
                id="tempBanReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempBanDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleTempBan}>
              Apply Temp Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
