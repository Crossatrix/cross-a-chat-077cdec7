import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield, Smartphone, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

interface TrustedDevice {
  id: string;
  device_name: string | null;
  last_used_at: string;
  created_at: string;
}

export const DeviceVerificationSettings = () => {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTrustedDevices();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("device_verification")
        .select("enabled, verification_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setEnabled(data.enabled);
        setVerificationEmail(data.verification_email || "");
      }
    } catch (error) {
      console.error("Error loading device verification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrustedDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trusted_devices")
        .select("*")
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false });

      if (error) throw error;
      setTrustedDevices(data || []);
    } catch (error) {
      console.error("Error loading trusted devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSave = async () => {
    if (enabled && !verificationEmail) {
      toast.error("Please enter a verification email");
      return;
    }

    if (enabled) {
      const emailValidation = emailSchema.safeParse(verificationEmail);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if settings already exist
      const { data: existing } = await supabase
        .from("device_verification")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("device_verification")
          .update({
            enabled,
            verification_email: verificationEmail || null,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("device_verification")
          .insert({
            user_id: user.id,
            enabled,
            verification_email: verificationEmail || null,
          });

        if (error) throw error;
      }

      toast.success(t("settings.saved") || "Settings saved!");
    } catch (error) {
      console.error("Error saving device verification settings:", error);
      toast.error(t("settings.error") || "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("trusted_devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;

      setTrustedDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success("Device removed");
    } catch (error) {
      console.error("Error removing device:", error);
      toast.error("Failed to remove device");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="device-verification" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("privacy.deviceVerification") || "New Device Verification"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("privacy.deviceVerificationDescription") || "Require a code when logging in from a new device"}
          </p>
        </div>
        <Switch
          id="device-verification"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Email Input */}
      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="verification-email">
            {t("privacy.verificationEmail") || "Verification Email"}
          </Label>
          <Input
            id="verification-email"
            type="email"
            value={verificationEmail}
            onChange={(e) => setVerificationEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <p className="text-xs text-muted-foreground">
            {t("privacy.verificationEmailDescription") || "A 10-digit code will be sent to this email when logging in from a new device"}
          </p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {t("settings.save") || "Save"}
      </Button>

      {/* Trusted Devices */}
      {enabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              {t("privacy.trustedDevices") || "Trusted Devices"}
            </CardTitle>
            <CardDescription>
              {t("privacy.trustedDevicesDescription") || "Devices that won't require verification"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDevices ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : trustedDevices.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                {t("privacy.noTrustedDevices") || "No trusted devices yet"}
              </p>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {trustedDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback>
                            <Smartphone className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {device.device_name || "Unknown Device"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last used: {new Date(device.last_used_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
