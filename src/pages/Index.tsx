import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import ConversationsList from "@/components/ConversationsList";
import UsersList from "@/components/UsersList";
import UserActionsMenu from "@/components/UserActionsMenu";
import BlockedUsersList from "@/components/BlockedUsersList";
import { FeedbackDialog } from "@/components/FeedbackDialog";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  voice_url?: string;
  profiles: {
    username: string;
  };
}

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is banned
    const checkBan = async () => {
      const { data: ban } = await supabase
        .from("user_bans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ban) {
        // Check if ban has expired
        if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
          // Ban has expired, remove it
          await supabase.from("user_bans").delete().eq("id", ban.id);
          return true;
        } else {
          // Ban is still active, redirect to banned page
          navigate("/banned");
          return false;
        }
      }
      return true;
    };

    // Fetch username and check admin status
    const fetchUserData = async () => {
      const notBanned = await checkBan();
      if (!notBanned) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUsername(profile.username);
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!roles);
    };

    fetchUserData();
  }, [user, navigate, loading]);

  useEffect(() => {
    if (!user || !selectedConversationId) return;

    // Fetch initial messages for the selected conversation
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(username)")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching messages:", error);
        }
        toast.error("Failed to load messages");
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`conversation-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(username)")
            .eq("id", payload.new.id)
            .maybeSingle();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversationId]);

  const handleDeleteMessage = async (messageId: string, imageUrl?: string, voiceUrl?: string) => {
    try {
      // Delete the message from database
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (deleteError) throw deleteError;

      // Delete associated files from storage
      if (imageUrl) {
        const imagePath = imageUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('chat-images').remove([imagePath]);
      }

      if (voiceUrl) {
        const voicePath = voiceUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('voice-messages').remove([voicePath]);
      }

      // Update local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success("Message deleted");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting message:", error);
      }
      toast.error("Failed to delete message");
    }
  };

  const handleSendMessage = async (content: string, imageFile?: File, voiceBlob?: Blob) => {
    if (!user || !selectedConversationId) return;

    let imageUrl: string | null = null;
    let voiceUrl: string | null = null;

    // Upload image if present
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, imageFile);

      if (uploadError) {
        if (import.meta.env.DEV) {
          console.error("Error uploading image:", uploadError);
        }
        toast.error("Failed to upload image");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    // Upload voice message if present
    if (voiceBlob) {
      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, voiceBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) {
        if (import.meta.env.DEV) {
          console.error("Error uploading voice message:", uploadError);
        }
        toast.error("Failed to upload voice message");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);
      
      voiceUrl = publicUrl;
    }

    const { error } = await supabase.from("messages").insert({
      user_id: user.id,
      content,
      conversation_id: selectedConversationId,
      image_url: imageUrl,
      voice_url: voiceUrl,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error sending message:", error);
      }
      toast.error("Failed to send message");
    }
  };

  const handleSelectConversation = async (conversationId: string, otherUsername: string) => {
    setSelectedConversationId(conversationId);
    setSelectedUsername(otherUsername);
    setMessages([]);

    // Fetch the other user's ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", otherUsername)
      .single();

    if (profile) {
      setSelectedUserId(profile.id);
    }
  };

  const handleSelectUser = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase.rpc("find_or_create_conversation", {
        other_user_id: otherUserId,
      });

      if (error) throw error;

      // Fetch the other user's username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", otherUserId)
        .single();

      if (profile) {
        setSelectedConversationId(data);
        setSelectedUsername(profile.username);
        setSelectedUserId(otherUserId);
        setMessages([]);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error creating conversation:", error);
      }
      toast.error("Failed to start conversation");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className={`${selectedConversationId ? 'hidden' : 'flex'} md:flex flex-col h-full md:h-screen`}>
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0 md:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">Cross Chat</h1>
              <p className="text-xs text-muted-foreground truncate">@{username}</p>
            </div>
          </div>
          <div className="flex gap-0.5 md:gap-1 shrink-0 overflow-x-auto items-center">
            <UsersList currentUserId={user?.id || ""} onSelectUser={handleSelectUser} />
            <BlockedUsersList currentUserId={user?.id || ""} />
            <FeedbackDialog />
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button onClick={handleLogout} variant="secondary" size="icon" className="h-8 w-8" aria-label="Logout">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>
        <ConversationsList
          currentUserId={user?.id || ""}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
      <div className={`flex flex-col flex-1 min-w-0 h-full ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedConversationId && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden shrink-0"
                onClick={() => {
                  setSelectedConversationId(null);
                  setSelectedUsername("");
                  setSelectedUserId("");
                }}
              >
                ← Back
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-primary truncate">
                {selectedUsername ? `@${selectedUsername}` : "Cross Chat"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">@{username}</p>
            </div>
            {selectedUsername && selectedUserId && user?.id && (
              <UserActionsMenu
                userId={selectedUserId}
                username={selectedUsername}
                currentUserId={user.id}
              />
            )}
          </div>
          <div className="flex gap-0.5 md:gap-2 shrink-0 overflow-x-auto items-center">
            <UsersList currentUserId={user?.id || ""} onSelectUser={handleSelectUser} />
            <BlockedUsersList currentUserId={user?.id || ""} />
            <FeedbackDialog />
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5 md:hidden" />
                <span className="hidden md:inline md:text-sm">Admin</span>
              </Button>
            )}
            <Button onClick={handleLogout} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Logout">
              <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline md:ml-2">Logout</span>
            </Button>
          </div>
        </header>
        {selectedConversationId ? (
          <>
            <MessageList 
              messages={messages} 
              currentUserId={username} 
              currentUserDbId={user?.id}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to Cross Chat</h2>
              <p className="mb-4">Click on a chat to view messages</p>
              <p className="text-sm">or use the "New Chat" button to start a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
