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
    // Fetch conversation participants - only users you've chatted with
    const { data: conversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    const conversationIds = conversations?.map((c) => c.conversation_id) || [];
    
    if (conversationIds.length === 0) {
      setRecentUsers([]);
      setUsers([]);
      return;
    }

    // Get all users from conversations (people you've chatted with)
    const { data: chatPartners } = await supabase
      .from("conversation_participants")
      .select("user_id, joined_at")
      .in("conversation_id", conversationIds)
      .neq("user_id", currentUserId);

    // Get unique user IDs from conversations
    const chatPartnerIds = [...new Set(chatPartners?.map((p) => p.user_id) || [])];

    if (chatPartnerIds.length === 0) {
      setRecentUsers([]);
      setUsers([]);
      return;
    }

    // Fetch profiles only for users you've chatted with
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", chatPartnerIds)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .order("username");

    if (profiles) {
      const { data: blockedUsers } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("blocker_id", currentUserId);

      const blockedIds = new Set(blockedUsers?.map((b) => b.blocked_user_id) || []);
      
      // Get recent user IDs (last 5 unique)
      const recentUserIds = [...new Set(chatPartners?.map((p) => p.user_id) || [])].slice(0, 5);
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
      toast.error(t("newChat.selectOne"));
      return;
    }

    if (selectedUsers.size === 1) {
      const userId = Array.from(selectedUsers)[0];
      const selectedUser = [...recentUsers, ...users, searchedUser].find(u => u?.id === userId);
      
      // Check if selecting AI
      if (selectedUser?.username.toLowerCase() === 'ai') {
        // Show AI chat name input (no limit on AI chats)
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
      toast.error(t("group.enterName"));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        group_name: groupName,
        participant_ids: Array.from(selectedUsers),
      });

      if (error) throw error;

      toast.success(t("group.created"));
      onChatCreated(data, groupName, true);
      setOpen(false);
      setGroupName("");
      setSelectedUsers(new Set());
      setShowGroupNameInput(false);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(t("group.createFailed"));
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
      toast.error(t("ai.enterChatName"));
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

      toast.success(t("ai.chatCreated"));
      onChatCreated(newConv.id, aiChatName.trim(), false);
      setOpen(false);
      setAiChatName("");
      setSelectedUsers(new Set());
      setShowAiChatNameInput(false);
    } catch (error) {
      console.error("Error creating AI chat:", error);
      toast.error(t("ai.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsername = async () => {
    if (!usernameSearch.trim()) {
      toast.error(t("newChat.selectOne"));
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
        toast.error(t("newChat.userNotFound"));
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
        toast.error(t("newChat.userBlocked"));
        setSearchedUser(null);
        return;
      }

      setSearchedUser(profile);
      
      // Auto-select the searched user
      const newSelected = new Set(selectedUsers);
      newSelected.add(profile.id);
      setSelectedUsers(newSelected);
      
      toast.success(`${t("newChat.found")} @${profile.username}`);
    } catch (error) {
      console.error("Error searching username:", error);
      toast.error(t("newChat.searchFailed"));
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
              <DialogTitle>{t("ai.nameChat")}</DialogTitle>
              <DialogDescription>
                {t("ai.nameDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiChatName">{t("ai.chatName")}</Label>
                <Input
                  id="aiChatName"
                  placeholder={t("ai.enterName")}
                  value={aiChatName}
                  onChange={(e) => setAiChatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAIChat()}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleBack}>
                  {t("common.back")}
                </Button>
                <Button onClick={handleCreateAIChat} disabled={loading}>
                  {loading ? t("common.creating") : t("ai.createChat")}
                </Button>
              </div>
            </div>
          </>
        ) : !showGroupNameInput ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("newChat.title")}</DialogTitle>
              <DialogDescription>
                {t("newChat.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usernameSearch">{t("newChat.searchUsername")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="usernameSearch"
                    placeholder={t("newChat.enterUsername")}
                    value={usernameSearch}
                    onChange={(e) => setUsernameSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsername()}
                  />
                  <Button 
                    onClick={handleSearchUsername} 
                    disabled={searching || !usernameSearch.trim()}
                    variant="secondary"
                  >
                    {searching ? "..." : t("newChat.find")}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-3">
                  {recentUsers.length === 0 && users.length === 0 && !searchedUser && (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">{t("newChat.noContacts")}</p>
                      <p className="text-xs mt-2">{t("newChat.searchToFind")}</p>
                    </div>
                  )}
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
                          @{searchedUser.username} <span className="text-xs text-muted-foreground">({t("common.searched")})</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {recentUsers.length > 0 && (
                    <div className="pb-3 mb-3 border-b">
                      <div className="text-xs text-muted-foreground mb-2 font-semibold">{t("common.recent")}</div>
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
                <span>{selectedUsers.size} {t("common.selected")}</span>
                {selectedUsers.size > 1 && <span>{t("chat.groupChat")}</span>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleNext} disabled={selectedUsers.size === 0}>
                  {selectedUsers.size === 1 ? t("chat.startChat") : t("common.next")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("group.nameYourGroup")}</DialogTitle>
              <DialogDescription>
                {t("group.creatingWith")} {selectedUsers.size} {t("group.members")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">{t("group.name")}</Label>
                <Input
                  id="groupName"
                  placeholder={t("group.namePlaceholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleBack}>
                  {t("common.back")}
                </Button>
                <Button onClick={handleCreateGroup} disabled={loading}>
                  {loading ? t("common.creating") : t("group.create")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
