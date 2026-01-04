import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, UserPlus, UserMinus, Trash2, LogOut, Crown, Shield, User, Image } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type GroupRole = "admin" | "moderator" | "member";

interface GroupMember {
  id: string;
  user_id: string;
  role: GroupRole;
  username: string;
  avatar_url?: string;
}

interface GroupSettingsDialogProps {
  conversationId: string;
  groupName: string;
  groupImageUrl?: string;
  currentUserId: string;
  onGroupUpdated: () => void;
  onGroupDeleted: () => void;
  onGroupLeft: () => void;
}

export const GroupSettingsDialog = ({
  conversationId,
  groupName,
  groupImageUrl,
  currentUserId,
  onGroupUpdated,
  onGroupDeleted,
  onGroupLeft,
}: GroupSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<GroupRole>("member");
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [usernameSearch, setUsernameSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [editingName, setEditingName] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchMembers();
      setNewGroupName(groupName);
    }
  }, [open, conversationId, groupName]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: participants, error } = await supabase
        .from("conversation_participants")
        .select("id, user_id, role")
        .eq("conversation_id", conversationId)
        .is("kicked_at", null);

      if (error) throw error;

      const userIds = participants?.map((p) => p.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const membersData: GroupMember[] = (participants || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        role: (p.role as GroupRole) || "member",
        username: profileMap.get(p.user_id)?.username || "Unknown",
        avatar_url: profileMap.get(p.user_id)?.avatar_url,
      }));

      // Sort: admins first, then moderators, then members
      membersData.sort((a, b) => {
        const order = { admin: 0, moderator: 1, member: 2 };
        return order[a.role] - order[b.role];
      });

      setMembers(membersData);

      // Find current user's role
      const currentMember = membersData.find((m) => m.user_id === currentUserId);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load group members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!usernameSearch.trim()) return;

    setSearching(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", usernameSearch.trim())
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        toast.error("User not found");
        return;
      }

      // Check if already a member
      if (members.some((m) => m.user_id === profile.id)) {
        toast.error("User is already a member");
        return;
      }

      const { data: result, error: addError } = await supabase.rpc("add_group_member", {
        _conversation_id: conversationId,
        _new_user_id: profile.id,
      });

      if (addError) throw addError;

      if (result) {
        toast.success(`Added @${profile.username} to the group`);
        setUsernameSearch("");
        setShowAddMember(false);
        fetchMembers();
        onGroupUpdated();
      } else {
        toast.error("Failed to add member");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    } finally {
      setSearching(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { data: result, error } = await supabase.rpc("remove_group_member", {
        _conversation_id: conversationId,
        _target_user_id: userId,
      });

      if (error) throw error;

      if (result) {
        toast.success("Member removed");
        fetchMembers();
        onGroupUpdated();
      } else {
        toast.error("Cannot remove this member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: GroupRole) => {
    try {
      const { data: result, error } = await supabase.rpc("change_group_role", {
        _conversation_id: conversationId,
        _target_user_id: userId,
        _new_role: newRole,
      });

      if (error) throw error;

      if (result) {
        toast.success("Role updated");
        fetchMembers();
      } else {
        toast.error("Cannot change this member's role");
      }
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Failed to change role");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const { data: result, error } = await supabase.rpc("leave_group", {
        _conversation_id: conversationId,
      });

      if (error) throw error;

      if (result) {
        toast.success("You left the group");
        setOpen(false);
        onGroupLeft();
      } else {
        toast.error("Cannot leave. You're the only admin - promote someone else first.");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group");
    } finally {
      setShowLeaveConfirm(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      const { data: result, error } = await supabase.rpc("delete_group", {
        _conversation_id: conversationId,
      });

      if (error) throw error;

      if (result) {
        toast.success("Group deleted");
        setOpen(false);
        onGroupDeleted();
      } else {
        toast.error("Only admins can delete the group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim() || newGroupName === groupName) {
      setEditingName(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ name: newGroupName.trim() })
        .eq("id", conversationId);

      if (error) throw error;

      toast.success("Group name updated");
      setEditingName(false);
      onGroupUpdated();
    } catch (error) {
      console.error("Error updating group name:", error);
      toast.error("Failed to update group name");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `groups/${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("conversations")
        .update({ group_image_url: publicUrl })
        .eq("id", conversationId);

      if (updateError) throw updateError;

      toast.success("Group picture updated");
      onGroupUpdated();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const getRoleBadge = (role: GroupRole) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="default" className="gap-1 bg-yellow-500 text-yellow-950">
            <Crown className="h-3 w-3" />
            Admin
          </Badge>
        );
      case "moderator":
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Mod
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

  const canManageRoles = currentUserRole === "admin";
  const canRemoveMembers = currentUserRole === "admin" || currentUserRole === "moderator";
  const canEditGroup = currentUserRole === "admin" || currentUserRole === "moderator";
  const canDeleteGroup = currentUserRole === "admin";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Settings
            </DialogTitle>
            <DialogDescription>
              Manage group members and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Group Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={groupImageUrl} />
                  <AvatarFallback className="text-xl">👥</AvatarFallback>
                </Avatar>
                {canEditGroup && (
                  <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90">
                    <Image className="h-3 w-3 text-primary-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                {editingName && canEditGroup ? (
                  <div className="flex gap-2">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateGroupName()}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleUpdateGroupName}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <h3
                    className={`font-semibold text-lg ${canEditGroup ? "cursor-pointer hover:text-primary" : ""}`}
                    onClick={() => canEditGroup && setEditingName(true)}
                  >
                    {groupName}
                  </h3>
                )}
                <p className="text-sm text-muted-foreground">
                  {members.length} members
                </p>
                <div className="mt-1">
                  {getRoleBadge(currentUserRole)}
                </div>
              </div>
            </div>

            {/* Add Member */}
            {showAddMember ? (
              <div className="space-y-2 p-3 border rounded-lg">
                <Label>Add by username</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username"
                    value={usernameSearch}
                    onChange={(e) => setUsernameSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  />
                  <Button onClick={handleAddMember} disabled={searching}>
                    {searching ? "..." : "Add"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowAddMember(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            )}

            {/* Members List */}
            <div className="flex-1 overflow-hidden">
              <Label className="mb-2 block">Members</Label>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            @{member.username}
                            {member.user_id === currentUserId && " (you)"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canManageRoles && member.user_id !== currentUserId ? (
                          <Select
                            value={member.role}
                            onValueChange={(value: GroupRole) =>
                              handleChangeRole(member.user_id, value)
                            }
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getRoleBadge(member.role)
                        )}

                        {canRemoveMembers &&
                          member.user_id !== currentUserId &&
                          (currentUserRole === "admin" || member.role === "member") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setRemovingUserId(member.user_id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="w-full gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                onClick={() => setShowLeaveConfirm(true)}
              >
                <LogOut className="h-4 w-4" />
                Leave Group
              </Button>

              {canDeleteGroup && (
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Group
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingUserId} onOpenChange={(open) => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingUserId && handleRemoveMember(removingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You'll need to be added back by a member to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? All messages and media will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};