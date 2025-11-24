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
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface NewChatDialogProps {
  currentUserId: string;
  onChatCreated: (conversationId: string, displayName: string, isGroup: boolean) => void;
  onUserSelected: (userId: string) => void;
}

export const NewChatDialog = ({ currentUserId, onChatCreated, onUserSelected }: NewChatDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showGroupNameInput, setShowGroupNameInput] = useState(false);
  const [showAiChatNameInput, setShowAiChatNameInput] = useState(false);
  const [aiChatName, setAiChatName] = useState("");
  const [usernameSearch, setUsernameSearch] = useState("");
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUsers(new Set());
      setGroupName("");
      setShowGroupNameInput(false);
      setUsernameSearch("");
      setSearchedUser(null);
    }
  }, [open]);

  const fetchUsers = async () => {
    // Fetch recent conversation participants
    const { data: conversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    const conversationIds = conversations?.map((c) => c.conversation_id) || [];
    
    let recentUserIds: string[] = [];
    if (conversationIds.length > 0) {
      const { data: recentParticipants } = await supabase
        .from("conversation_participants")
        .select("user_id, joined_at")
        .in("conversation_id", conversationIds)
        .neq("user_id", currentUserId)
        .order("joined_at", { ascending: false });

      // Get unique user IDs from recent conversations
      recentUserIds = [...new Set(recentParticipants?.map((p) => p.user_id) || [])].slice(0, 5);
    }

    // Fetch all profiles
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
      const recentUserIdsSet = new Set(recentUserIds);
      
      const filteredRecent = profiles.filter((p) => !blockedIds.has(p.id) && recentUserIdsSet.has(p.id));
      const filteredOther = profiles.filter((p) => !blockedIds.has(p.id) && !recentUserIdsSet.has(p.id));
      
      setRecentUsers(filteredRecent);
      setUsers(filteredOther);
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
    
    // Reset group name input if going back to single selection
    if (newSelected.size < 2) {
      setShowGroupNameInput(false);
      setGroupName("");
    }
  };

  const handleNext = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one person");
      return;
    }

    if (selectedUsers.size === 1) {
      const userId = Array.from(selectedUsers)[0];
      const selectedUser = [...recentUsers, ...users, searchedUser].find(u => u?.id === userId);
      
      // Check if selecting AI
      if (selectedUser?.username.toLowerCase() === 'ai') {
        // Check AI chat count
        const { data: existingAIChats, error: countError } = await supabase
          .from('conversations')
          .select('id')
          .eq('is_ai_chat', true)
          .eq('created_by', currentUserId);

        if (countError) {
          console.error('Error checking AI chats:', countError);
          toast.error("Failed to check AI chat limit");
          return;
        }

        if (existingAIChats && existingAIChats.length >= 5) {
          toast.error("You can only have up to 5 AI chat conversations");
          return;
        }

        // Show AI chat name input
        setShowAiChatNameInput(true);
        return;
      }
      
      // Start 1-on-1 chat immediately for non-AI users
      onUserSelected(userId);
      setOpen(false);
      setSelectedUsers(new Set());
    } else {
      // Show group name input for multiple selections
      setShowGroupNameInput(true);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
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
      onChatCreated(data, groupName, true);
      setOpen(false);
      setGroupName("");
      setSelectedUsers(new Set());
      setShowGroupNameInput(false);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowGroupNameInput(false);
    setShowAiChatNameInput(false);
    setGroupName("");
    setAiChatName("");
  };

  const handleCreateAIChat = async () => {
    if (!aiChatName.trim()) {
      toast.error("Please enter a name for your AI chat");
      return;
    }

    setLoading(true);
    try {
      const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
      
      // Create new AI conversation with name
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_ai_chat: true,
          is_group: false,
          name: aiChatName.trim(),
          created_by: currentUserId
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: currentUserId },
          { conversation_id: newConv.id, user_id: AI_BOT_ID }
        ]);

      if (participantError) throw participantError;

      toast.success("AI chat created successfully");
      onChatCreated(newConv.id, aiChatName.trim(), false);
      setOpen(false);
      setAiChatName("");
      setSelectedUsers(new Set());
      setShowAiChatNameInput(false);
    } catch (error) {
      console.error("Error creating AI chat:", error);
      toast.error("Failed to create AI chat");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsername = async () => {
    if (!usernameSearch.trim()) {
      toast.error("Please enter a username");
      return;
    }

    setSearching(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("username", usernameSearch.trim())
        .neq("id", currentUserId)
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        toast.error("User not found");
        setSearchedUser(null);
        return;
      }

      // Check if user is blocked
      const { data: blockCheck } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", currentUserId)
        .eq("blocked_user_id", profile.id)
        .maybeSingle();

      if (blockCheck) {
        toast.error("This user is blocked");
        setSearchedUser(null);
        return;
      }

      setSearchedUser(profile);
      
      // Auto-select the searched user
      const newSelected = new Set(selectedUsers);
      newSelected.add(profile.id);
      setSelectedUsers(newSelected);
      
      toast.success(`Found @${profile.username}`);
    } catch (error) {
      console.error("Error searching username:", error);
      toast.error("Failed to search username");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="icon" className="h-8 w-8" aria-label="New Chat">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {showAiChatNameInput ? (
          <>
            <DialogHeader>
              <DialogTitle>Name Your AI Chat</DialogTitle>
              <DialogDescription>
                Give your AI conversation a unique name
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiChatName">AI Chat Name</Label>
                <Input
                  id="aiChatName"
                  placeholder="Enter AI chat name"
                  value={aiChatName}
                  onChange={(e) => setAiChatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAIChat()}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleCreateAIChat} disabled={loading}>
                  {loading ? "Creating..." : "Create AI Chat"}
                </Button>
              </div>
            </div>
          </>
        ) : !showGroupNameInput ? (
          <>
            <DialogHeader>
              <DialogTitle>New Chat</DialogTitle>
              <DialogDescription>
                Select one person for direct chat, or multiple for a group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usernameSearch">Search by username</Label>
                <div className="flex gap-2">
                  <Input
                    id="usernameSearch"
                    placeholder="Enter username"
                    value={usernameSearch}
                    onChange={(e) => setUsernameSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsername()}
                  />
                  <Button 
                    onClick={handleSearchUsername} 
                    disabled={searching || !usernameSearch.trim()}
                    variant="secondary"
                  >
                    {searching ? "..." : "Find"}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-3">
                  {searchedUser && (
                    <div className="pb-3 mb-3 border-b">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={searchedUser.id}
                          checked={selectedUsers.has(searchedUser.id)}
                          onCheckedChange={() => toggleUser(searchedUser.id)}
                        />
                        <label
                          htmlFor={searchedUser.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                        >
                          @{searchedUser.username} <span className="text-xs text-muted-foreground">(searched)</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUsers.length > 0 && (
                    <div className="pb-3 mb-3 border-b">
                      <div className="text-xs text-muted-foreground mb-2 font-semibold">Recent</div>
                      <div className="space-y-3">
                        {recentUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={user.id}
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => toggleUser(user.id)}
                            />
                            <label
                              htmlFor={user.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                            >
                              @{user.username}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label
                        htmlFor={user.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                      >
                        @{user.username}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{selectedUsers.size} selected</span>
                {selectedUsers.size > 1 && <span>Group chat</span>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleNext} disabled={selectedUsers.size === 0}>
                  {selectedUsers.size === 1 ? "Start Chat" : "Next"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Name Your Group</DialogTitle>
              <DialogDescription>
                Creating group with {selectedUsers.size} members
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
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleCreateGroup} disabled={loading}>
                  {loading ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
