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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Info, UserX, Flag, Image, Video, X, UsersRound } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";

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
  last_seen: string | null;
}

interface SharedMedia {
  id: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

const UserInfoDialog = ({ userId, username, currentUserId, conversationId }: UserInfoDialogProps) => {
  const { t } = useLanguage();
  useEmojiLoader();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [groupBlockConfirmOpen, setGroupBlockConfirmOpen] = useState(false);
  const [isGroupBlocked, setIsGroupBlocked] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
      fetchSharedMedia();
      checkGroupBlockStatus();
    }
  }, [open, userId]);

  // Subscribe to presence for online status
  useEffect(() => {
    if (!open || !userId) return;

    const presenceChannel = supabase.channel(`user-presence-${userId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const userOnline = Object.values(state).some((presences: any) => 
          presences.some((p: any) => p.user_id === userId)
        );
        setIsOnline(userOnline);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [open, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, bio, avatar_url, created_at, last_seen")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
      // Check if user was seen in the last 2 minutes
      if (data.last_seen) {
        const lastSeenDate = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
        setIsOnline(diffMinutes < 2);
      }
    }
    setLoading(false);
  };

  const fetchSharedMedia = async () => {
    setLoadingMedia(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, image_url, video_url, created_at")
      .eq("conversation_id", conversationId)
      .or("image_url.neq.null,video_url.neq.null")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shared media:", error);
    } else {
      setSharedMedia(data || []);
    }
    setLoadingMedia(false);
  };

  const checkGroupBlockStatus = async () => {
    const { data } = await supabase
      .from("group_blocks")
      .select("id")
      .eq("blocker_id", currentUserId)
      .eq("blocked_user_id", userId)
      .single();
    
    setIsGroupBlocked(!!data);
  };

  const handleGroupBlock = async () => {
    if (isGroupBlocked) {
      // Unblock
      const { error } = await supabase
        .from("group_blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_user_id", userId);

      if (error) {
        toast.error(t("privacy.groupUnblockFailed"));
        return;
      }

      toast.success(`${t("privacy.groupUnblocked")} @${username}`);
      setIsGroupBlocked(false);
    } else {
      // Block
      const { error } = await supabase
        .from("group_blocks")
        .insert({
          blocker_id: currentUserId,
          blocked_user_id: userId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error(t("privacy.alreadyGroupBlocked"));
        } else {
          toast.error(t("privacy.groupBlockFailed"));
        }
        return;
      }

      toast.success(`${t("privacy.groupBlocked")} @${username}`);
      setIsGroupBlocked(true);
    }
    setGroupBlockConfirmOpen(false);
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

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return t("userInfo.neverSeen");
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return t("userInfo.justNow");
    if (diffMinutes < 60) return `${diffMinutes} ${t("userInfo.minutesAgo")}`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ${t("userInfo.hoursAgo")}`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ${t("userInfo.daysAgo")}`;
    
    return formatJoinDate(dateString);
  };

  const images = sharedMedia.filter(m => m.image_url);
  const videos = sharedMedia.filter(m => m.video_url);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("userInfo.title")}</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : profile ? (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                    <AvatarFallback className="text-xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {/* Online Status Indicator */}
                  <div 
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${
                      isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                    }`}
                    title={isOnline ? t("userInfo.online") : t("userInfo.offline")}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">@{profile.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isOnline ? (
                      <span className="text-green-500 font-medium">{t("userInfo.online")}</span>
                    ) : (
                      <span>{t("userInfo.lastSeen")}: {formatLastSeen(profile.last_seen)}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("userInfo.joined")} {formatJoinDate(profile.created_at)}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">{t("userInfo.bio")}</Label>
                <div className="text-sm p-3 bg-muted/50 rounded-lg min-h-[40px]">
                  {profile.bio ? formatMessageText(profile.bio) : t("userInfo.noBio")}
                </div>
              </div>

              {/* Shared Media Tabs */}
              <Tabs defaultValue="images" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="images" className="gap-2">
                    <Image className="h-4 w-4" />
                    {t("userInfo.images")} ({images.length})
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="gap-2">
                    <Video className="h-4 w-4" />
                    {t("userInfo.videos")} ({videos.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="images" className="flex-1 overflow-hidden mt-2">
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : images.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t("userInfo.noImages")}
                    </p>
                  ) : (
                    <ScrollArea className="h-[140px]">
                      <div className="grid grid-cols-3 gap-2 pr-4">
                        {images.map((media) => (
                          <button
                            key={media.id}
                            onClick={() => setSelectedMedia(media.image_url)}
                            className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                          >
                            <img 
                              src={media.image_url!} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
                
                <TabsContent value="videos" className="flex-1 overflow-hidden mt-2">
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : videos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t("userInfo.noVideos")}
                    </p>
                  ) : (
                    <ScrollArea className="h-[140px]">
                      <div className="grid grid-cols-3 gap-2 pr-4">
                        {videos.map((media) => (
                          <button
                            key={media.id}
                            onClick={() => setSelectedMedia(media.video_url)}
                            className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity relative"
                          >
                            <video 
                              src={media.video_url!} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <div className="flex gap-2">
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
                <Button
                  variant={isGroupBlocked ? "secondary" : "outline"}
                  className="w-full gap-2"
                  onClick={() => setGroupBlockConfirmOpen(true)}
                >
                  <UsersRound className="h-4 w-4" />
                  {isGroupBlocked ? t("privacy.unblockFromGroups") : t("privacy.blockFromGroups")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("userInfo.loadFailed")}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedMedia.includes('.mp4') || selectedMedia.includes('.webm') || selectedMedia.includes('.mov') ? (
              <video 
                src={selectedMedia} 
                controls 
                autoPlay
                className="w-full h-full max-h-[85vh] object-contain"
              />
            ) : (
              <img 
                src={selectedMedia} 
                alt="" 
                className="w-full h-full max-h-[85vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      )}

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

      {/* Group Block Confirmation Dialog */}
      <AlertDialog open={groupBlockConfirmOpen} onOpenChange={setGroupBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isGroupBlocked ? t("privacy.unblockFromGroupsConfirm") : t("privacy.blockFromGroupsConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isGroupBlocked 
                ? t("privacy.unblockFromGroupsDescription") 
                : t("privacy.blockFromGroupsDescription")} @{username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleGroupBlock}>
              {isGroupBlocked ? t("privacy.unblockFromGroups") : t("privacy.blockFromGroups")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserInfoDialog;
