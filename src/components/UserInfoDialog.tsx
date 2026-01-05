import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Info, UserX, Flag } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

const reportSchema = z.string().trim().min(10, "Please provide more details (min 10 characters)").max(1000, "Reason too long (max 1000 characters)");

interface UserInfoDialogProps {
  userId: string;
  username: string;
  currentUserId: string;
  conversationId: string;
}

interface UserProfile {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

const UserInfoDialog = ({ userId, username, currentUserId, conversationId }: UserInfoDialogProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, bio, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleBlock = async () => {
    const { error } = await supabase
      .from("user_blocks")
      .insert({
        blocker_id: currentUserId,
        blocked_user_id: userId,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error(t("user.alreadyBlocked"));
      } else {
        toast.error(t("user.blockFailed"));
      }
      return;
    }

    toast.success(`${t("user.blocked")} @${username}`);
    setBlockConfirmOpen(false);
    setOpen(false);
  };

  const handleReport = async () => {
    setSubmittingReport(true);
    try {
      const validation = reportSchema.safeParse(reportReason);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmittingReport(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: currentUserId,
          reported_user_id: userId,
          conversation_id: conversationId,
          reason: validation.data,
        })
        .select()
        .single();

      if (error) {
        toast.error(t("user.reportFailed"));
        setSubmittingReport(false);
        return;
      }

      toast.success(t("user.reportSubmitted"));
      setReportReason("");
      setReportOpen(false);

      // Trigger AI auto-moderation
      if (data?.id) {
        toast.info(t("ai.reviewing"));
        supabase.functions
          .invoke("ai-moderator", {
            body: { reportId: data.id },
          })
          .then(({ data: aiData, error: aiError }) => {
            if (aiError) {
              console.error("AI moderation error:", aiError);
            } else if (aiData?.success) {
              if (aiData.verdict === 'false_report' && aiData.reporterWarned) {
                toast.warning(t("ai.warningIssued"));
                if (aiData.reporterBanned) {
                  toast.error(t("ai.reporterBanned"));
                }
              } else if (aiData.banCreated) {
                toast.success(`${t("ai.autoBanned")} ${aiData.banDays} ${t("ban.days")}`);
              } else {
                toast.info(t("ai.reviewComplete"));
              }
            }
          });
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("userInfo.title")}</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                  <AvatarFallback className="text-xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">@{profile.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("userInfo.joined")} {formatJoinDate(profile.created_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">{t("userInfo.bio")}</Label>
                <p className="text-sm p-3 bg-muted/50 rounded-lg min-h-[60px]">
                  {profile.bio || t("userInfo.noBio")}
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setBlockConfirmOpen(true)}
                >
                  <UserX className="h-4 w-4" />
                  {t("user.block")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4" />
                  {t("user.report")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("userInfo.loadFailed")}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userInfo.blockConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userInfo.blockConfirmDescription")} @{username}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("user.block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("user.reportTitle")} @{username}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("user.reportDescription")}</p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">{t("user.reportReason")}</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t("user.reportPlaceholder")}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportReason.length}/1000 ({t("user.reportMinChars")})
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleReport} variant="destructive" disabled={submittingReport}>
              {submittingReport ? t("common.submitting") : t("user.reportSubmit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserInfoDialog;
