import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ban, Shield } from "lucide-react";

interface User {
  id: string;
  username: string;
  created_at: string;
  banned?: boolean;
}

const UsersList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [banReason, setBanReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      return;
    }

    const { data: bans } = await supabase
      .from("user_bans")
      .select("user_id");

    const bannedIds = new Set(bans?.map(b => b.user_id) || []);
    
    const usersWithBanStatus = profiles?.map(p => ({
      ...p,
      banned: bannedIds.has(p.id)
    })) || [];

    setUsers(usersWithBanStatus);
    setLoading(false);
  };

  const handleBan = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!banReason.trim()) {
      toast.error("Please provide a reason for the ban");
      return;
    }

    const { error } = await supabase
      .from("user_bans")
      .insert({
        user_id: userId,
        banned_by: user?.id,
        reason: banReason
      });

    if (error) {
      toast.error("Failed to ban user");
      return;
    }

    toast.success("User banned successfully");
    setBanReason("");
    setSelectedUser(null);
    fetchUsers();
  };

  const handleUnban = async (userId: string) => {
    const { error } = await supabase
      .from("user_bans")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to unban user");
      return;
    }

    toast.success("User unbanned successfully");
    fetchUsers();
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  return (
    <div className="space-y-4 mt-6">
      {users.map((user) => (
        <Card key={user.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">@{user.username}</CardTitle>
                <CardDescription>
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              {user.banned ? (
                <Badge variant="destructive">Banned</Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {user.banned ? (
                <Button
                  onClick={() => handleUnban(user.id)}
                  variant="secondary"
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Unban
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setSelectedUser(user.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Ban User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ban @{user.username}?</DialogTitle>
                      <DialogDescription>
                        This will prevent the user from accessing the chat. Please provide a reason.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason for ban</Label>
                        <Textarea
                          id="reason"
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Enter reason..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => handleBan(user.id)}
                        variant="destructive"
                      >
                        Confirm Ban
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UsersList;