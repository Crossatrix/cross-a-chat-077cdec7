import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserX, Shield } from "lucide-react";

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  profiles: {
    username: string;
  };
}

interface BlockedUsersListProps {
  currentUserId: string;
}

const BlockedUsersList = ({ currentUserId }: BlockedUsersListProps) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    const { data: blocks, error } = await supabase
      .from("user_blocks")
      .select("id, blocked_user_id")
      .eq("blocker_id", currentUserId);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching blocked users:", error);
      }
      toast.error("Failed to load blocked users");
      setLoading(false);
      return;
    }

    if (!blocks || blocks.length === 0) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", blocks.map(b => b.blocked_user_id));

    if (profilesError) {
      if (import.meta.env.DEV) {
        console.error("Error fetching profiles:", profilesError);
      }
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const blockedUsersData = blocks.map(block => ({
      id: block.id,
      blocked_user_id: block.blocked_user_id,
      profiles: profiles?.find(p => p.id === block.blocked_user_id) || { username: "Unknown" }
    }));

    setBlockedUsers(blockedUsersData);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
    }
  }, [open]);

  const handleUnblock = async (blockId: string, username: string) => {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error("Failed to unblock user");
      return;
    }

    toast.success(`Unblocked @${username}`);
    fetchBlockedUsers();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <UserX className="h-4 w-4 mr-2" />
          Blocked Users
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Blocked Users</SheetTitle>
          <SheetDescription>
            Manage users you've blocked
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked users</p>
          ) : (
            blockedUsers.map((block) => (
              <Card key={block.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    @{block.profiles?.username || "Unknown User"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleUnblock(block.id, block.profiles?.username || "user")}
                    variant="secondary"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Unblock
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

export default BlockedUsersList;
