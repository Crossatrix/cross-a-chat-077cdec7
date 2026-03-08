import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, RefreshCw, Save, Bug, Wrench } from "lucide-react";
import { useAppVersion } from "@/hooks/useAppVersion";
import ChangelogManager from "@/components/admin/ChangelogManager";
import FileExplorer, { FileItem } from "@/components/admin/FileExplorer";
import FilePreview from "@/components/admin/FilePreview";
import { useLanguage } from "@/contexts/LanguageContext";
import CreatorVerificationManager from "@/components/admin/CreatorVerificationManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StaffRole, getStaffRole, CAN, ROLE_CONFIG, isAtLeast } from "@/utils/roleConfig";

const Admin = () => {
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
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
  const currentVersion = useAppVersion();
  const [editVersion, setEditVersion] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    if (currentVersion) setEditVersion(currentVersion);
  }, [currentVersion]);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();
      setMaintenanceMode(data?.value === "true");
    };
    fetchMaintenanceStatus();
  }, []);

  useEffect(() => {
    const checkStaffAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const role = getStaffRole((roles || []) as { role: string }[]);

      if (!role) {
        toast.error(t("admin.accessDenied"));
        navigate("/");
        return;
      }

      setStaffRole(role);
      setLoading(false);
    };

    checkStaffAccess();
  }, [navigate, t]);

  useEffect(() => {
    if (staffRole) {
      fetchCategoriesAndData();
    }
  }, [staffRole]);

  const fetchCategoriesAndData = async () => {
    const { data: categoriesData } = await supabase
      .from("emoji_categories")
      .select("name")
      .order("name", { ascending: true });
    
    const dbCategories = (categoriesData || []).map(c => c.name);
    if (!dbCategories.includes("general")) {
      dbCategories.unshift("general");
    }
    setEmojiCategories(dbCategories);
    
    await fetchAllDataWithCategories(dbCategories);
  };

  const fetchAllData = async () => {
    await fetchCategoriesAndData();
  };

  const fetchAllDataWithCategories = async (categories: string[]) => {
    const promises: Promise<any>[] = [];
    
    // Always fetch users (all staff can see users for banning)
    promises.push(fetchUsers());
    
    // Conditional fetches based on role
    if (CAN.manageEmojis(staffRole)) {
      promises.push(fetchEmojisWithCategories(categories));
    }
    if (CAN.seeReports(staffRole)) {
      promises.push(fetchReports());
      promises.push(fetchVideoReports());
    }
    if (CAN.readFeedback(staffRole)) {
      promises.push(fetchFeedback());
    }
    if (CAN.seeErrors(staffRole)) {
      promises.push(fetchErrors());
    }

    const results = await Promise.all(promises);
    
    let idx = 0;
    const users = results[idx++];
    
    const fileStructure: FileItem[] = [];
    
    if (CAN.manageEmojis(staffRole)) {
      fileStructure.push(results[idx++]);
    }
    if (CAN.seeReports(staffRole)) {
      fileStructure.push({
        id: "reports",
        name: "Reports",
        type: "folder",
        children: results[idx++],
      });
      fileStructure.push({
        id: "video-reports",
        name: "Video Reports",
        type: "folder",
        children: results[idx++],
      });
    }
    
    fileStructure.push({
      id: "users",
      name: "Users",
      type: "folder",
      children: users,
    });
    
    if (CAN.readFeedback(staffRole)) {
      fileStructure.push({
        id: "feedback",
        name: "Feedback",
        type: "folder",
        children: results[idx++],
      });
    }
    if (CAN.seeErrors(staffRole)) {
      fileStructure.push({
        id: "errors",
        name: "Errors",
        type: "folder",
        children: results[idx++],
      });
    }

    setFiles(fileStructure);
  };

  const fetchEmojisWithCategories = async (categories: string[]): Promise<FileItem> => {
    const { data } = await supabase
      .from("custom_emojis")
      .select("*")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });

    const categoryMap = new Map<string, FileItem[]>();
    categories.forEach(cat => categoryMap.set(cat, []));
    
    (data || []).forEach((emoji) => {
      const category = emoji.category || "general";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      const ext = emoji.image_url.includes(".gif") ? "gif" : 
                  emoji.image_url.includes(".webp") ? "webp" : "png";
      
      categoryMap.get(category)!.push({
        id: `emoji-${emoji.id}`,
        name: emoji.name,
        type: "file",
        extension: ext,
        data: emoji,
        category: category,
      });
    });

    const allCategories = Array.from(categoryMap.keys()).sort();
    const categoryFolders: FileItem[] = allCategories.map((category) => ({
      id: `emoji-category-${category}`,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      type: "folder" as const,
      children: categoryMap.get(category) || [],
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

  const handleCreateFolder = async (parentId: string, folderName: string) => {
    if (parentId === "emojis") {
      const sanitizedName = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      if (!emojiCategories.includes(sanitizedName)) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("emoji_categories")
          .insert({ name: sanitizedName, created_by: user?.id });
        
        if (error) {
          toast.error("Failed to create category");
          return;
        }
        
        toast.success(`Category "${folderName}" created`);
        await fetchCategoriesAndData();
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

  const fetchVideoReports = async (): Promise<FileItem[]> => {
    const { data } = await supabase
      .from("video_reports" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return [];

    // Fetch reporter profiles and video titles
    const reporterIds = [...new Set((data as any[]).map((r: any) => r.reporter_id).filter(Boolean))];
    const videoIds = [...new Set((data as any[]).map((r: any) => r.video_id).filter(Boolean))];

    const [{ data: profiles }, { data: videos }] = await Promise.all([
      reporterIds.length > 0 ? supabase.from("profiles").select("id, username").in("id", reporterIds) : { data: [] },
      videoIds.length > 0 ? supabase.from("videos").select("id, title, video_url, user_id").in("id", videoIds) : { data: [] },
    ]);

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p.username));

    const videoMap = new Map<string, any>();
    (videos || []).forEach((v: any) => videoMap.set(v.id, v));

    return (data as any[]).map((report: any) => {
      const video = videoMap.get(report.video_id);
      return {
        id: `video-report-${report.id}`,
        name: `video_report_${video?.title?.slice(0, 20) || 'unknown'}_${new Date(report.created_at).toISOString().split('T')[0]}`,
        type: "file" as const,
        extension: "txt",
        data: {
          ...report,
          type: "video_report",
          reporter_username: profileMap.get(report.reporter_id) || "Unknown",
          video_title: video?.title || "Deleted video",
          video_url: video?.video_url || "",
          video_creator_id: video?.user_id,
        },
      };
    });
  };

  const fetchUsers = async (): Promise<FileItem[]> => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: bans } = await supabase.from("user_bans").select("*");
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const banMap = new Map(bans?.map((b) => [b.user_id, b]) || []);
    
    // Build a map of user_id -> highest staff role
    const roleMap = new Map<string, StaffRole | null>();
    (allRoles || []).forEach((r) => {
      const existing = roleMap.get(r.user_id);
      const current = getStaffRole([r as { role: string }]);
      if (current) {
        if (!existing || (ROLE_CONFIG[current] && (!existing || 
          ["moderator_lite", "moderator", "elder_moderator", "admin"].indexOf(current) > 
          ["moderator_lite", "moderator", "elder_moderator", "admin"].indexOf(existing)))) {
          roleMap.set(r.user_id, current);
        }
      }
    });

    return (profiles || []).map((user) => {
      const ban = banMap.get(user.id);
      const userStaffRole = roleMap.get(user.id) || null;
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
          isAdmin: userStaffRole === "admin",
          staffRole: userStaffRole,
        },
      };
    });
  };

  const fetchFeedback = async (): Promise<FileItem[]> => {
    const { data: feedbackRows, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
      return [];
    }

    const ids = Array.from(
      new Set(
        (feedbackRows || [])
          .flatMap((fb: any) => [fb.user_id, fb.admin_response_by])
          .filter(Boolean)
      )
    ) as string[];

    const profileMap = new Map<string, { username: string }>();

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username")
        .in("id", ids);

      (profiles || []).forEach((p) => profileMap.set(p.id, { username: p.username }));
    }

    return (feedbackRows || []).map((fb: any) => {
      const username = profileMap.get(fb.user_id)?.username;
      const adminUsername = fb.admin_response_by
        ? profileMap.get(fb.admin_response_by)?.username
        : undefined;

      return {
        id: `feedback-${fb.id}`,
        name: `feedback_${username || "anon"}_${new Date(fb.created_at).toISOString().split("T")[0]}`,
        type: "file" as const,
        extension: "txt",
        data: { ...fb, type: "feedback", username, admin_username: adminUsername },
      };
    });
  };

  const fetchErrors = async (): Promise<FileItem[]> => {
    const { data: errorsData, error } = await supabase
      .from("errors")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) console.error("Error fetching errors:", error);
      return [];
    }

    const userIds = Array.from(
      new Set((errorsData || []).map((e: any) => e.user_id).filter(Boolean))
    ) as string[];

    const profileMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username")
        .in("id", userIds);

      (profiles || []).forEach((p) => profileMap.set(p.id, p.username));
    }

    return (errorsData || []).map((err: any) => {
      const username = err.user_id ? profileMap.get(err.user_id) : null;
      const errorCode = err.additional_info?.errorCode || "UNKNOWN";
      const dateStr = new Date(err.timestamp).toISOString().split("T")[0];

      return {
        id: `error-${err.id}`,
        name: `error_${errorCode}_${dateStr}`,
        type: "file" as const,
        extension: "log",
        data: { ...err, type: "error", username },
      };
    });
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.type === "image/gif") { resolve(file); return; }
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        const maxSize = 128;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width; canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: "image/webp", lastModified: Date.now() }));
          else reject(new Error("Compression failed"));
        }, "image/webp", 0.8);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleEmojiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/png", "image/gif", "image/webp", "image/jpeg"];
      if (!validTypes.includes(file.type)) { toast.error(t("emoji.invalidFormat")); return; }
      if (file.size > 2 * 1024 * 1024) { toast.error(t("emoji.tooLarge")); return; }
      try { setSelectedEmojiFile(await compressImage(file)); }
      catch { toast.error(t("emoji.compressionFailed")); }
    }
  };

  const handleUploadEmoji = async () => {
    if (!selectedEmojiFile || !newEmojiName.trim()) { toast.error(t("emoji.enterName")); return; }
    const sanitizedName = newEmojiName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = selectedEmojiFile.name.split(".").pop();
      const fileName = `${sanitizedName}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("custom-emojis").upload(fileName, selectedEmojiFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("custom-emojis").getPublicUrl(fileName);
      const { error: insertError } = await supabase.from("custom_emojis").insert({
        name: sanitizedName, image_url: urlData.publicUrl, created_by: user.id, category: selectedCategory,
      });
      if (insertError) throw insertError;
      toast.success(t("emoji.added"));
      setNewEmojiName(""); setSelectedEmojiFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchAllData();
    } catch (error: any) { toast.error(error.message || t("emoji.addFailed")); }
    finally { setUploading(false); }
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
      } catch { toast.error(t("emoji.deleteFailed")); }
    } else if (data.type === "report") {
      await supabase.from("user_reports").delete().eq("id", data.id);
      toast.success("Report deleted");
    } else if (data.type === "video_report") {
      await supabase.from("video_reports" as any).delete().eq("id", data.id);
      toast.success("Video report deleted");
    } else if (data.type === "feedback") {
      await supabase.from("feedback").delete().eq("id", data.id);
      toast.success("Feedback deleted");
    } else if (data.type === "error") {
      await supabase.from("errors").delete().eq("id", data.id);
      toast.success("Error log deleted");
    }
    setSelectedFile(null);
    fetchAllData();
  };

  const handleAction = async (action: string, file: FileItem, extra?: any) => {
    const data = file.data;
    const { data: { user } } = await supabase.auth.getUser();

    switch (action) {
      case "ai_review":
        toast.info(t("ai.reviewing"));
        try {
          const { error } = await supabase.functions.invoke("ai-moderator", { body: { reportId: data.id } });
          if (error) throw error;
          toast.success(t("ai.reviewComplete"));
          fetchAllData();
        } catch { toast.error(t("ai.reviewFailed")); }
        break;
      case "ai_video_review":
        toast.info("AI reviewing video report...");
        try {
          const { error } = await supabase.functions.invoke("video-moderator", { body: { reportId: data.id } });
          if (error) throw error;
          toast.success("AI review complete");
          fetchAllData();
        } catch { toast.error("AI review failed"); }
        break;
      case "resolve_video_report":
        await supabase.from("video_reports" as any).update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", data.id);
        toast.success("Video report resolved");
        fetchAllData();
        break;
      case "dismiss_video_report":
        await supabase.from("video_reports" as any).update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", data.id);
        toast.success("Video report dismissed");
        fetchAllData();
        break;
      case "resolve":
        await supabase.from("user_reports").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", data.id);
        toast.success("Report resolved");
        fetchAllData();
        break;
      case "ban":
        setPendingBanUserId(data.reported_user_id);
        setBanDialogOpen(true);
        break;
      case "temp_ban":
        setPendingBanUserId(data.reported_user_id || data.id);
        setTempBanDialogOpen(true);
        break;
      case "ban_user":
        setPendingBanUserId(data.id);
        setBanDialogOpen(true);
        break;
      case "temp_ban_user":
        setPendingBanUserId(data.id);
        setTempBanDialogOpen(true);
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
      case "set_role":
        if (extra?.role) {
          const { error } = await supabase.rpc("set_user_role" as any, { target_user_id: data.id, new_role: extra.role });
          if (error) { toast.error(error.message); return; }
          toast.success(`Role updated to ${extra.role === 'user' ? 'User' : extra.role}`);
          fetchAllData();
        }
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
      case "move_emoji":
        if (extra?.targetCategory) await handleMoveEmoji(file, extra.targetCategory);
        break;
    }
  };

  const handleMoveEmoji = async (file: FileItem, targetCategory: string) => {
    try {
      await supabase.from("custom_emojis").update({ category: targetCategory }).eq("id", file.data.id);
      toast.success(`Emoji moved to ${targetCategory}`);
      setSelectedFile(null);
      fetchAllData();
    } catch { toast.error("Failed to move emoji"); }
  };

  const handleBan = async () => {
    if (!pendingBanUserId || !banReason.trim()) { toast.error("Please enter a ban reason"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_bans").insert({ user_id: pendingBanUserId, banned_by: user?.id, reason: banReason });
    toast.success("User banned permanently");
    setBanDialogOpen(false); setBanReason(""); setPendingBanUserId(null);
    fetchAllData();
  };

  const handleTempBan = async () => {
    if (!pendingBanUserId || !banReason.trim()) { toast.error("Please enter a ban reason"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const days = parseInt(tempBanDays) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await supabase.from("user_bans").insert({
      user_id: pendingBanUserId, banned_by: user?.id,
      reason: `${days} day temp ban: ${banReason}`, expires_at: expiresAt.toISOString(),
    });
    toast.success(`User banned for ${days} days`);
    setTempBanDialogOpen(false); setBanReason(""); setTempBanDays("7"); setPendingBanUserId(null);
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!staffRole) return null;

  const RoleIcon = ROLE_CONFIG[staffRole].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card p-3 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("admin.backToChat")}
            </Button>
            <div className="flex items-center gap-2">
              <RoleIcon className={`h-5 w-5 ${ROLE_CONFIG[staffRole].colorClass}`} />
              <h1 className="text-xl font-bold text-primary">{t("admin.title")}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_CONFIG[staffRole].badgeClass}`}>
                {ROLE_CONFIG[staffRole].label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {CAN.manageVersion(staffRole) && (
              <>
                <Input
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value)}
                  placeholder="Version (e.g. 1.0.0)"
                  className="w-32 h-8 text-xs"
                />
                <Button
                  onClick={async () => {
                    if (!editVersion.trim()) return;
                    setSavingVersion(true);
                    const { data: { user } } = await supabase.auth.getUser();
                    const { error } = await supabase
                      .from("app_settings")
                      .update({ value: editVersion.trim(), updated_at: new Date().toISOString(), updated_by: user?.id })
                      .eq("key", "app_version");
                    setSavingVersion(false);
                    if (error) toast.error("Failed to update version");
                    else toast.success("Version updated");
                  }}
                  variant="outline"
                  size="sm"
                  disabled={savingVersion || editVersion === currentVersion}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </>
            )}
            {CAN.manageChangelog(staffRole) && (
              <ChangelogManager currentVersion={editVersion || currentVersion} />
            )}
            {CAN.manageVersion(staffRole) && (
              <Button
                onClick={() => { throw new Error("Admin test crash — triggered manually from admin panel"); }}
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                title="Test Crash (BSOD)"
              >
                <Bug className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Emoji Upload Bar - only for elder_moderator+ */}
      {CAN.manageEmojis(staffRole) && (
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              {selectedEmojiFile ? selectedEmojiFile.name.slice(0, 15) + "..." : t("emoji.selectImage")}
            </Button>
            <Button onClick={handleUploadEmoji} disabled={uploading || !selectedEmojiFile || !newEmojiName.trim()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? t("common.loading") : "Add Emoji"}
            </Button>
          </div>
        </div>
      )}

      {/* Creator Verification Manager - moderator+ */}
      {isAtLeast(staffRole, "moderator") && (
        <div className="border-b border-border bg-card/50 p-3 shrink-0">
          <div className="max-w-7xl mx-auto">
            <CreatorVerificationManager staffRole={staffRole} />
          </div>
        </div>
      )}

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
            onAction={(action, file, extra) => {
              if (action === "move_emoji" && extra?.targetCategory) {
                handleMoveEmoji(file, extra.targetCategory);
              } else {
                handleAction(action, file, extra);
              }
            }}
            emojiCategories={emojiCategories}
            onRefresh={fetchAllData}
            staffRole={staffRole}
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
              <Input id="banReason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter ban reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleBan}>Ban Permanently</Button>
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
              <Input id="tempBanDays" type="number" min="1" max="14" value={tempBanDays} onChange={(e) => setTempBanDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempBanReason">Reason</Label>
              <Input id="tempBanReason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter ban reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempBanDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleTempBan}>Apply Temp Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
