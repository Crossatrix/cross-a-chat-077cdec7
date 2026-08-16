import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Check, X, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface GroupInvite {
  id: string;
  conversation_id: string;
  invited_by: string;
  created_at: string;
  status: string;
  conversation: {
    name: string;
    group_image_url: string | null;
  };
  inviter: {
    username: string;
    avatar_url: string | null;
  };
}

const GroupInvites = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("group_invites")
        .select("id, conversation_id, invited_by, created_at, status")
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading invites:", error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch conversation details
        const conversationIds = data.map(i => i.conversation_id);
        const inviterIds = data.map(i => i.invited_by);

        const [conversationsRes, profilesRes] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, name, group_image_url")
            .in("id", conversationIds),
          supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", inviterIds)
        ]);

        const invitesWithDetails = data.map(invite => ({
          ...invite,
          conversation: conversationsRes.data?.find(c => c.id === invite.conversation_id) || { name: "Unknown Group", group_image_url: null },
          inviter: profilesRes.data?.find(p => p.id === invite.invited_by) || { username: "Unknown", avatar_url: null }
        }));

        setInvites(invitesWithDetails);
      } else {
        setInvites([]);
      }
    } catch (error) {
      console.error("Error loading invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invite: GroupInvite) => {
    setProcessingId(invite.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add user to conversation participants
      const { error: participantError } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: invite.conversation_id,
          user_id: user.id,
          role: "member"
        });

      if (participantError) {
        // Check if already a member
        if (participantError.code === "23505") {
          toast.info(t("invites.alreadyMember"));
        } else {
          throw participantError;
        }
      }

      // Update invite status
      await supabase
        .from("group_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      // Add system message for join
      await supabase
        .from("messages")
        .insert({
          conversation_id: invite.conversation_id,
          user_id: user.id,
          content: "joined the group",
          is_system: true,
          system_type: "join"
        });

      toast.success(t("invites.accepted"));
      setInvites(prev => prev.filter(i => i.id !== invite.id));

      // Navigate to the group
      navigate("/");
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error(t("invites.acceptFailed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await supabase
        .from("group_invites")
        .update({ status: "declined" })
        .eq("id", inviteId);

      toast.success(t("invites.declined"));
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error("Error declining invite:", error);
      toast.error(t("invites.declineFailed"));
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return t("userInfo.justNow");
    if (diffMinutes < 60) return `${diffMinutes} ${t("userInfo.minutesAgo")}`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ${t("userInfo.hoursAgo")}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t("userInfo.daysAgo")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("settings.back")}
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          {t("invites.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("invites.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("invites.pending")}</CardTitle>
          <CardDescription>{t("invites.pendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("invites.noInvites")}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={invite.conversation.group_image_url || undefined} />
                        <AvatarFallback>
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{invite.conversation.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {t("invites.invitedBy")} @{invite.inviter.username}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(invite.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleDecline(invite.id)}
                        disabled={processingId === invite.id}
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("invites.decline")}</span>
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleAccept(invite)}
                        disabled={processingId === invite.id}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("invites.accept")}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupInvites;