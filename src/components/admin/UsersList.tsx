import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ban, Shield } from "lucide-react";
import { z } from "zod";

const banReasonSchema = z.string().trim().min(10, "Please provide more details (min 10 characters)").max(1000, "Reason too long (max 1000 characters)");

interface User {
  id: string;
  username: string;
  created_at: string;
  banned?: boolean;
  isAdmin?: boolean;
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
      if (import.meta.env.DEV) {
        console.error("Error fetching users:", error);
      }
      toast.error("Failed to load users");
      return;
    }

    const { data: bans } = await supabase
      .from("user_bans")
      .select("user_id");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");

    const bannedIds = new Set(bans?.map(b => b.user_id) || []);
    const adminIds = new Set(roles?.map(r => r.user_id) || []);
    
    const usersWithStatus = profiles?.map(p => ({
      ...p,
      banned: bannedIds.has(p.id),
      isAdmin: adminIds.has(p.id)
    })) || [];

    setUsers(usersWithStatus);
    setLoading(false);
  };

  const handleBan = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const validation = banReasonSchema.safeParse(banReason);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const { error } = await supabase
      .from("user_bans")
      .insert({
        user_id: userId,
        banned_by: user?.id,
        reason: validation.data
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

  const handlePromoteToAdmin = async (userId: string) => {
    const { error } = await supabase.rpc("promote_to_admin", {
      target_user_id: userId
    });

    if (error) {
      toast.error(error.message || "Failed to promote user");
      return;
    }

    toast.success("User promoted to admin");
    fetchUsers();
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    const { error } = await supabase.rpc("demote_from_admin", {
      target_user_id: userId
    });

    if (error) {
      toast.error(error.message || "Failed to demote user");
      return;
    }

    toast.success("User demoted to regular user");
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
              <div className="flex gap-2">
                {user.isAdmin && <Badge variant="default">Admin</Badge>}
                {user.banned ? (
                  <Badge variant="destructive">Banned</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
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
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {banReason.length}/1000 (minimum 10 characters)
                        </p>
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
              
              {user.isAdmin ? (
                <Button
                  onClick={() => handleDemoteFromAdmin(user.id)}
                  variant="outline"
                  size="sm"
                >
                  Remove Admin
                </Button>
              ) : (
                <Button
                  onClick={() => handlePromoteToAdmin(user.id)}
                  variant="outline"
                  size="sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Make Admin
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UsersList;
