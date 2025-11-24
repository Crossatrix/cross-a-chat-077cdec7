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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface CreateGroupDialogProps {
  currentUserId: string;
  onGroupCreated: (conversationId: string, groupName: string) => void;
}

export const CreateGroupDialog = ({ currentUserId, onGroupCreated }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .neq("id", currentUserId)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .order("username");

    if (profiles) {
      const { data: blockedUsers } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("blocker_id", currentUserId);

      const blockedIds = new Set(blockedUsers?.map((b) => b.blocked_user_id) || []);
      const filteredProfiles = profiles.filter((p) => !blockedIds.has(p.id));
      setUsers(filteredProfiles);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedUsers.size < 2) {
      toast.error("Please select at least 2 members");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        group_name: groupName,
        participant_ids: Array.from(selectedUsers),
      });

      if (error) throw error;

      toast.success("Group created successfully");
      onGroupCreated(data, groupName);
      setOpen(false);
      setGroupName("");
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="icon" className="h-8 w-8" aria-label="Create Group">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Create a new group conversation with multiple people
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Select Members (minimum 2)</Label>
            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <label
                      htmlFor={user.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      @{user.username}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
