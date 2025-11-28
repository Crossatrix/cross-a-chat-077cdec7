import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { UserX, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

interface BlockedUsersProps {
  currentUserId: string;
}

const BlockedUsers = ({ currentUserId }: BlockedUsersProps) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const fetchBlockedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_blocks")
      .select(`
        *,
        profiles!user_blocks_blocked_user_id_fkey (
          username
        )
      `)
      .eq("blocker_id", currentUserId);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching blocked users:", error);
      }
      toast.error(t("blocked.unblockFailed"));
      return;
    }

    setBlockedUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
    }
  }, [open, currentUserId]);

  const handleUnblock = async (blockId: string, username: string) => {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error(t("blocked.unblockFailed"));
      return;
    }

    toast.success(`${t("blocked.unblocked")} @${username}`);
    fetchBlockedUsers();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <UserX className="h-4 w-4 mr-2" />
          {t("blocked.title")}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("blocked.title")}</SheetTitle>
          <SheetDescription>
            {t("blocked.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("blocked.none")}</p>
          ) : (
            blockedUsers.map((block) => (
              <Card key={block.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">@{block.profiles.username}</CardTitle>
                  <CardDescription>
                    {t("blocked.on")} {new Date(block.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleUnblock(block.id, block.profiles.username)}
                    variant="secondary"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("blocked.unblock")}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BlockedUsers;
