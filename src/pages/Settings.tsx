import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Upload, Shield, UsersRound, X, EyeOff, Play, Trash2, Ban, Crown, FlaskConical, Palette, LayoutDashboard } from "lucide-react";
import ShareLinkButton from "@/components/ShareLinkButton";
import { checkProStatus, purchasePro } from "@/utils/proSubscription";
import { checkBetaStatus, purchaseBeta, BETA_PRICE } from "@/utils/betaSubscription";
import proBadgeIcon from "@/assets/pro-badge.png";
import { VIDEO_CATEGORIES } from "@/utils/videoCategories";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const Settings = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, resetTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [bio, setBio] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowGroupInvitesFromStrangers, setAllowGroupInvitesFromStrangers] = useState(true);
  const [groupBlockedUsers, setGroupBlockedUsers] = useState<Array<{
    id: string;
    blocked_user_id: string;
    created_at: string;
    profile: { username: string; avatar_url: string | null };
  }>>([]);
  const [loadingGroupBlocks, setLoadingGroupBlocks] = useState(false);
  const [notInterestedItems, setNotInterestedItems] = useState<Array<{
    id: string;
    video_id: string;
    category: string;
    created_at: string;
    video?: { title: string; thumbnail_url: string | null };
  }>>([]);
  const [loadingNotInterested, setLoadingNotInterested] = useState(false);
  const [blockedCategories, setBlockedCategories] = useState<string[]>([]);
  const [loadingBlockedCategories, setLoadingBlockedCategories] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proExpiry, setProExpiry] = useState<string | null>(null);
  const [buyingPro, setBuyingPro] = useState(false);
  const [isBeta, setIsBeta] = useState(false);
  const [betaExpiry, setBetaExpiry] = useState<string | null>(null);
  const [buyingBeta, setBuyingBeta] = useState(false);

  useEffect(() => {
    import("@/utils/modEvents").then(m => m.emitModEvent("openedsettings"));
    loadProfile();
    loadGroupBlockedUsers();
    loadNotInterested();
    loadBlockedCategories();
    loadProStatus();
    loadBetaStatus();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);


      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url, text_hue, text_saturation, text_lightness, show_online_status, allow_group_invites_from_strangers, creator_username")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setShowOnlineStatus(profile.show_online_status ?? true);
        setAllowGroupInvitesFromStrangers(profile.allow_group_invites_from_strangers ?? true);
        setCreatorUsername((profile as any).creator_username || "");
        
        // Load saved text color settings
        if (profile.text_hue !== null && profile.text_saturation !== null && profile.text_lightness !== null) {
          setTheme({
            ...theme,
            textHue: profile.text_hue,
            textSaturation: profile.text_saturation,
            textLightness: profile.text_lightness,
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupBlockedUsers = async () => {
    setLoadingGroupBlocks(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_blocks")
        .select("id, blocked_user_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading group blocks:", error);
        return;
      }

      // Fetch profiles for blocked users
      if (data && data.length > 0) {
        const userIds = data.map(b => b.blocked_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const blocksWithProfiles = data.map(block => ({
          ...block,
          profile: profiles?.find(p => p.id === block.blocked_user_id) || { username: "Unknown", avatar_url: null }
        }));

        setGroupBlockedUsers(blocksWithProfiles);
      } else {
        setGroupBlockedUsers([]);
      }
    } catch (error) {
      console.error("Error loading group blocks:", error);
    } finally {
      setLoadingGroupBlocks(false);
    }
  };

  const loadNotInterested = async () => {
    setLoadingNotInterested(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("video_not_interested" as any)
        .select("id, video_id, category, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading not interested:", error);
        return;
      }

      const items = (data || []) as any[];
      if (items.length > 0) {
        const videoIds = items.map((i: any) => i.video_id);
        const { data: videos } = await supabase
          .from("videos")
          .select("id, title, thumbnail_url")
          .in("id", videoIds);

        const enriched = items.map((item: any) => ({
          ...item,
          video: videos?.find((v: any) => v.id === item.video_id) || undefined,
        }));
        setNotInterestedItems(enriched);
      } else {
        setNotInterestedItems([]);
      }
    } catch (error) {
      console.error("Error loading not interested:", error);
    } finally {
      setLoadingNotInterested(false);
    }
  };

  const handleRemoveNotInterested = async (id: string) => {
    const { error } = await supabase
      .from("video_not_interested" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove");
      return;
    }

    toast.success("Removed from Not Interested");
    setNotInterestedItems(prev => prev.filter(i => i.id !== id));
  };

  const loadProStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("pro_subscriptions" as any)
      .select("expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data && new Date((data as any).expires_at) > new Date()) {
      setIsPro(true);
      setProExpiry((data as any).expires_at);
    }
  };

  const handleBuyPro = async () => {
    setBuyingPro(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await purchasePro(user.id);
      if (result.success) {
        toast.success(result.message);
        loadProStatus();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error("Purchase failed");
    } finally {
      setBuyingPro(false);
    }
  };

  const loadBetaStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("beta_subscriptions" as any)
      .select("expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data && new Date((data as any).expires_at) > new Date()) {
      setIsBeta(true);
      setBetaExpiry((data as any).expires_at);
    } else {
      setIsBeta(false);
      setBetaExpiry(null);
    }
  };

  const handleBuyBeta = async () => {
    setBuyingBeta(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await purchaseBeta(user.id);
      if (result.success) {
        toast.success(result.message);
        loadBetaStatus();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error("Purchase failed");
    } finally {
      setBuyingBeta(false);
    }
  };

  const loadBlockedCategories = async () => {
    setLoadingBlockedCategories(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("blocked_categories" as any)
        .select("category")
        .eq("user_id", user.id);
      setBlockedCategories((data || []).map((d: any) => d.category));
    } catch (error) {
      console.error("Error loading blocked categories:", error);
    } finally {
      setLoadingBlockedCategories(false);
    }
  };

  const handleToggleBlockCategory = async (category: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (blockedCategories.includes(category)) {
      const { error } = await supabase
        .from("blocked_categories" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("category", category);
      if (error) { toast.error("Failed to unblock category"); return; }
      setBlockedCategories(prev => prev.filter(c => c !== category));
      toast.success(`Unblocked ${category}`);
    } else {
      const { error } = await supabase
        .from("blocked_categories" as any)
        .insert({ user_id: user.id, category });
      if (error) { toast.error("Failed to block category"); return; }
      setBlockedCategories(prev => [...prev, category]);
      toast.success(`Blocked ${category} from your feed`);
    }
  };

  const handleClearAllNotInterested = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("video_not_interested" as any)
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to clear");
      return;
    }

    toast.success("Cleared all Not Interested preferences");
    setNotInterestedItems([]);
  };

  const handleUnblockFromGroups = async (blockId: string, username: string) => {
    const { error } = await supabase
      .from("group_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error(t("privacy.groupUnblockFailed"));
      return;
    }

    toast.success(`${t("privacy.groupUnblocked")} @${username}`);
    setGroupBlockedUsers(prev => prev.filter(b => b.id !== blockId));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          text_hue: theme.textHue,
          text_saturation: theme.textSaturation,
          text_lightness: theme.textLightness,
          show_online_status: showOnlineStatus,
          allow_group_invites_from_strangers: allowGroupInvitesFromStrangers,
          creator_username: creatorUsername.trim() || null,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast.success(t("settings.saved"));
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t("settings.error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("settings.back")}
        </Button>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">{t("settings.profile")}</TabsTrigger>
          <TabsTrigger value="creator" className="gap-1">
            <Palette className="h-3 w-3 hidden sm:inline text-primary" />
            Creator
          </TabsTrigger>
          <TabsTrigger value="pro" className="gap-1">
            <Crown className="h-3 w-3 hidden sm:inline text-yellow-500" />
            Pro
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1">
            <Shield className="h-3 w-3 hidden sm:inline" />
            {t("settings.privacy")}
          </TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
          <TabsTrigger value="language">{t("settings.language")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img src={proBadgeIcon} alt="Pro" className="h-8 w-8" />
                Cross Chat Pro
              </CardTitle>
              <CardDescription>
                Remove all ads and get a special Pro badge next to your name!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPro ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <img src={proBadgeIcon} alt="Pro" className="h-6 w-6" />
                    <span className="font-semibold text-primary">You are a Pro member!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your subscription expires on {proExpiry ? new Date(proExpiry).toLocaleDateString() : "N/A"}
                  </p>
                  <Button onClick={handleBuyPro} disabled={buyingPro} variant="outline" className="w-full mt-2">
                    {buyingPro ? "Processing..." : "Extend for 50 Croins (+1 month)"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Benefits:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ No more ads before videos</li>
                      <li>✅ Exclusive Pro badge next to your name</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                    <span className="text-2xl font-bold">50 Croins</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </div>
                  <Button onClick={handleBuyPro} disabled={buyingPro} className="w-full" size="lg">
                    {buyingPro ? "Processing..." : "Buy Cross Chat Pro"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-7 w-7 text-primary" />
                Cross Chat Beta
              </CardTitle>
              <CardDescription>
                Try experimental features early — AI Message generator, Scam Detector and more.
                Adds a Beta button next to Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isBeta ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-primary" />
                    <span className="font-semibold text-primary">You are a Beta member!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your subscription expires on {betaExpiry ? new Date(betaExpiry).toLocaleDateString() : "N/A"}
                  </p>
                  <Button onClick={handleBuyBeta} disabled={buyingBeta} variant="outline" className="w-full mt-2">
                    {buyingBeta ? "Processing..." : `Extend for ${BETA_PRICE} Croins (+1 month)`}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Beta features:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>🧪 New Beta button next to Settings</li>
                      <li>✨ AI Message generator in any chat</li>
                      <li>🛡️ Scam Detector warns you about suspicious new contacts</li>
                      <li>🚀 Early access to upcoming features</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                    <span className="text-2xl font-bold">{BETA_PRICE} Croins</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </div>
                  <Button onClick={handleBuyBeta} disabled={buyingBeta} className="w-full" size="lg">
                    {buyingBeta ? "Processing..." : "Buy Cross Chat Beta"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.profile")}</CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                    disabled={uploadingAvatar}
                  />
                  <Label htmlFor="avatar-upload">
                    <Button
                      variant="outline"
                      disabled={uploadingAvatar}
                      asChild
                    >
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {avatarUrl ? t("settings.changeAvatar") : t("settings.uploadAvatar")}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t("settings.username")}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t("settings.bio")}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("settings.bioPlaceholder")}
                  rows={4}
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                {saving ? "Saving..." : t("settings.save")}
              </Button>

              <ShareLinkButton action="chat" id={currentUserId} label="Share my profile link" variant="outline" className="w-full gap-2" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Creator
              </CardTitle>
              <CardDescription>
                Set a separate name shown on your videos, posts, and creator profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="creator-username">Creator Username</Label>
                <Input
                  id="creator-username"
                  value={creatorUsername}
                  onChange={(e) => setCreatorUsername(e.target.value)}
                  placeholder={username ? `Defaults to @${username}` : "Enter creator name"}
                  maxLength={40}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use your normal username.
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                {saving ? "Saving..." : t("settings.save")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Creator Dashboard
              </CardTitle>
              <CardDescription>
                See all your videos, music, posts and memberships with detailed stats — edit or delete them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/creator-dashboard")} className="w-full gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Open Creator Dashboard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.privacy")}</CardTitle>
              <CardDescription>{t("privacy.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-online">{t("privacy.showOnlineStatus")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("privacy.showOnlineStatusDescription")}
                  </p>
                </div>
                <Switch
                  id="show-online"
                  checked={showOnlineStatus}
                  onCheckedChange={setShowOnlineStatus}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-strangers">{t("privacy.allowGroupInvites")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("privacy.allowGroupInvitesDescription")}
                  </p>
                </div>
                <Switch
                  id="allow-strangers"
                  checked={allowGroupInvitesFromStrangers}
                  onCheckedChange={setAllowGroupInvitesFromStrangers}
                />
              </div>

              {/* OneSignal Notification Subscription */}
              <div className="space-y-2">
                <Label>{t("settings.notifications") || "Push Notifications"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("privacy.notificationsDescription") || "Subscribe to receive push notifications for messages and calls"}
                </p>
                <div className="onesignal-customlink-container py-2" />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                {saving ? "Saving..." : t("settings.save")}
              </Button>
            </CardContent>
          </Card>

          {/* Group Blocked Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5" />
                {t("privacy.groupBlockedUsers")}
              </CardTitle>
              <CardDescription>{t("privacy.groupBlockedUsersDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingGroupBlocks ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : groupBlockedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  {t("privacy.noGroupBlockedUsers")}
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {groupBlockedUsers.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={block.profile.avatar_url || undefined} />
                            <AvatarFallback>
                              {block.profile.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">@{block.profile.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("blocked.on")} {new Date(block.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblockFromGroups(block.id, block.profile.username)}
                          className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                          {t("blocked.unblock")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Not Interested Videos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="h-5 w-5" />
                Not Interested ({notInterestedItems.length})
              </CardTitle>
              <CardDescription>Videos you've marked as not interesting. Removing them will restore their visibility in your feed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNotInterested ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : notInterestedItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No videos marked as not interested
                </p>
              ) : (
                <>
                  <div className="flex justify-end mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllNotInterested}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear All
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {notInterestedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {item.video?.thumbnail_url ? (
                              <img
                                src={item.video.thumbnail_url}
                                alt=""
                                className="w-16 h-10 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Play className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.video?.title || "Deleted video"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.category} · {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNotInterested(item.id)}
                            className="gap-1 text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>

          {/* Blocked Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Blocked Categories
              </CardTitle>
              <CardDescription>Hide entire categories from your video feeds. Blocked categories won't appear in Videos, Shorts, or For You.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBlockedCategories ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {VIDEO_CATEGORIES.map((cat) => (
                    <div
                      key={cat.value}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.label}</span>
                      </div>
                      <Switch
                        checked={blockedCategories.includes(cat.value)}
                        onCheckedChange={() => handleToggleBlockCategory(cat.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.appearance")}</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>{t("settings.backgroundColor")}</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hue</Label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={theme.backgroundHue}
                      onChange={(e) => setTheme({ ...theme, backgroundHue: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Saturation</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.backgroundSaturation}
                      onChange={(e) => setTheme({ ...theme, backgroundSaturation: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Lightness</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.backgroundLightness}
                      onChange={(e) => setTheme({ ...theme, backgroundLightness: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div
                    className="w-16 h-16 rounded-lg border"
                    style={{
                      backgroundColor: `hsl(${theme.backgroundHue}, ${theme.backgroundSaturation}%, ${theme.backgroundLightness}%)`,
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Background Preview</p>
                    <p className="text-xs text-muted-foreground">
                      HSL({theme.backgroundHue}, {theme.backgroundSaturation}%, {theme.backgroundLightness}%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label>{t("settings.buttonColor")}</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hue</Label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={theme.buttonHue}
                      onChange={(e) => setTheme({ ...theme, buttonHue: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Saturation</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.buttonSaturation}
                      onChange={(e) => setTheme({ ...theme, buttonSaturation: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Lightness</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.buttonLightness}
                      onChange={(e) => setTheme({ ...theme, buttonLightness: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div
                    className="w-16 h-16 rounded-lg"
                    style={{
                      backgroundColor: `hsl(${theme.buttonHue}, ${theme.buttonSaturation}%, ${theme.buttonLightness}%)`,
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Button Preview</p>
                    <p className="text-xs text-muted-foreground">
                      HSL({theme.buttonHue}, {theme.buttonSaturation}%, {theme.buttonLightness}%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label>Text Color</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hue</Label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={theme.textHue}
                      onChange={(e) => setTheme({ ...theme, textHue: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Saturation</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.textSaturation}
                      onChange={(e) => setTheme({ ...theme, textSaturation: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Lightness</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.textLightness}
                      onChange={(e) => setTheme({ ...theme, textLightness: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg" style={{
                  backgroundColor: `hsl(${theme.backgroundHue}, ${theme.backgroundSaturation}%, ${theme.backgroundLightness}%)`,
                }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{
                      color: `hsl(${theme.textHue}, ${theme.textSaturation}%, ${theme.textLightness}%)`,
                    }}>
                      Sample Text Preview
                    </p>
                    <p className="text-xs" style={{
                      color: `hsl(${theme.textHue}, ${theme.textSaturation}%, ${theme.textLightness}%)`,
                    }}>
                      HSL({theme.textHue}, {theme.textSaturation}%, {theme.textLightness}%)
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={resetTheme} variant="outline" className="w-full">
                Reset to Default
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.language")}</CardTitle>
              <CardDescription>Choose your preferred language</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={language} onValueChange={(value) => setLanguage(value as "en" | "de")}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="en" id="en" />
                  <Label htmlFor="en" className="flex-1 cursor-pointer">
                    <div className="font-medium">English</div>
                    <div className="text-sm text-muted-foreground">English language</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="de" id="de" />
                  <Label htmlFor="de" className="flex-1 cursor-pointer">
                    <div className="font-medium">Deutsch</div>
                    <div className="text-sm text-muted-foreground">German language</div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
