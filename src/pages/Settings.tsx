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
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, resetTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url, text_hue, text_saturation, text_lightness")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        
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
        })
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">{t("settings.profile")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
          <TabsTrigger value="language">{t("settings.language")}</TabsTrigger>
        </TabsList>

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
