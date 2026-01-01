import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Settings, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import ConversationsList from "@/components/ConversationsList";
import UserActionsMenu from "@/components/UserActionsMenu";
import BlockedUsersList from "@/components/BlockedUsersList";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { CallInterface } from "@/components/CallInterface";
import { NewChatDialog } from "@/components/NewChatDialog";
import { requestNotificationPermission, registerServiceWorker, showNotification } from "@/utils/notifications";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  voice_url?: string;
  video_url?: string;
  updated_at?: string;
  profiles: {
    username: string;
    avatar_url?: string;
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
  const [isGroup, setIsGroup] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("openai/gpt-5-mini");
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [aiCredits, setAiCredits] = useState<number>(15);
  const navigate = useNavigate();

  const fetchAiCredits = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ai_credits')
      .select('credits_remaining, last_reset_date')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      // Check if reset is needed (new day)
      const today = new Date().toISOString().split('T')[0];
      if (data.last_reset_date < today) {
        setAiCredits(15);
      } else {
        setAiCredits(Number(data.credits_remaining));
      }
    } else {
      setAiCredits(15); // Default for new users
    }
  };

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      const permission = await requestNotificationPermission();
      if (permission) {
        await registerServiceWorker();
      }
    };
    initNotifications();
  }, []);

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

  // Track user presence and update last_seen
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        // Presence state synced
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update last_seen every 30 seconds while online
    const lastSeenInterval = setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }, 30000);

    // Update last_seen on page unload
    const updateLastSeenOnUnload = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };

    window.addEventListener('beforeunload', updateLastSeenOnUnload);

    return () => {
      clearInterval(lastSeenInterval);
      window.removeEventListener('beforeunload', updateLastSeenOnUnload);
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      // Update last_seen on cleanup
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };
  }, [user]);

  // Listen for incoming call signals
  useEffect(() => {
    if (!user) return;

    const callChannel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const signal = payload.new;
          
          // Only show notification for offer signals (new calls)
          if (signal.signal_type === 'offer') {
            // Get caller's profile
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', signal.from_user_id)
              .single();
            
            const callerName = callerProfile?.username || 'Someone';
            
            showNotification(
              '📞 Incoming Call',
              `${callerName} is calling you`,
              {
                tag: `call-${signal.conversation_id}`,
                requireInteraction: true,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user]);

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

      // Fetch AI credits
      fetchAiCredits();
    };

    fetchUserData();
  }, [user, navigate, loading]);

  useEffect(() => {
    if (!user || !selectedConversationId) return;

    // Fetch initial messages for the selected conversation
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
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

    // Subscribe to new messages, updates, and typing indicators in this conversation
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
            .select("*, profiles(username, avatar_url)")
            .eq("id", payload.new.id)
            .maybeSingle();

          if (data) {
            setMessages((prev) => [...prev, data]);
            
            // Remove typing indicator for the user who sent the message
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.user_id));
            
            // Show notification for messages from other users
            if (data.user_id !== user.id) {
              showNotification(
                `New message from ${data.profiles?.username || 'Someone'}`,
                data.content || 'Sent a media file',
                { tag: `message-${selectedConversationId}` }
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          // Update the message in state
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, content: payload.new.content, updated_at: payload.new.updated_at }
                : msg
            )
          );
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers((prev) => {
            const exists = prev.find((u) => u.userId === payload.userId);
            if (!exists) {
              return [...prev, { userId: payload.userId, username: payload.username }];
            }
            return prev;
          });

          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversationId]);

  const handleUpdateMessage = (messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, updated_at: new Date().toISOString() } : msg
      )
    );
  };

  const handleDeleteMessage = async (messageId: string, imageUrl?: string, voiceUrl?: string, videoUrl?: string) => {
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

      if (videoUrl) {
        const videoPath = videoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('chat-videos').remove([videoPath]);
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

  const handleSendMessage = async (content: string, imageFile?: File, voiceBlob?: Blob, videoFile?: File, generateImage?: boolean) => {
    if (!user || !selectedConversationId) return;

    const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
    const isAIChat = selectedUserId === AI_BOT_ID;

    let imageUrl: string | null = null;
    let voiceUrl: string | null = null;
    let videoUrl: string | null = null;

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

    // Upload video if present
    if (videoFile) {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-videos')
        .upload(fileName, videoFile);

      if (uploadError) {
        if (import.meta.env.DEV) {
          console.error("Error uploading video:", uploadError);
        }
        toast.error("Failed to upload video");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-videos')
        .getPublicUrl(fileName);
      
      videoUrl = publicUrl;
    }

    const { error } = await supabase.from("messages").insert({
      user_id: user.id,
      content,
      conversation_id: selectedConversationId,
      image_url: imageUrl,
      voice_url: voiceUrl,
      video_url: videoUrl,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error sending message:", error);
      }
      toast.error("Failed to send message");
      return;
    }

    // If this is an AI chat, call the AI edge function
    if (isAIChat) {
      try {
        // Add AI to typing users
        setTypingUsers((prev) => [...prev, { userId: AI_BOT_ID, username: 'CrossChatAI' }]);

        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat', {
          body: { 
            conversationId: selectedConversationId,
            userMessage: content,
            model: selectedAIModel,
            generateImage: generateImage || false
          }
        });

        // Remove AI from typing users
        setTypingUsers((prev) => prev.filter((u) => u.userId !== AI_BOT_ID));

        // Refresh credits after AI call
        fetchAiCredits();

        if (aiError) {
          console.error('AI chat error:', aiError);
          // Check if it's a credits error
          if (aiError.message?.includes('credits') || aiError.message?.includes('402')) {
            toast.error('Not enough AI credits. Credits reset daily.');
          } else {
            toast.error('AI response failed. Please try again.');
          }
        }
      } catch (aiError: any) {
        console.error('AI chat error:', aiError);
        // Refresh credits to show current state
        fetchAiCredits();
        if (aiError?.message?.includes('credits')) {
          toast.error('Not enough AI credits. Credits reset daily.');
        } else {
          toast.error('AI response failed. Please try again.');
        }
        // Remove AI from typing users on error
        setTypingUsers((prev) => prev.filter((u) => u.userId !== AI_BOT_ID));
      }
    }
  };

  const handleSelectConversation = async (conversationId: string, displayName: string, isGroupChat: boolean) => {
    const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
    
    // Handle special "ai-chat" placeholder ID
    if (conversationId === 'ai-chat') {
      // Find existing AI conversations for this user
      const { data: aiConversations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(id, updated_at, is_ai_chat, name)
        `)
        .eq('user_id', user?.id)
        .eq('conversations.is_ai_chat', true)
        .order('conversations.updated_at', { ascending: false });

      if (aiConversations && aiConversations.length > 0) {
        // Use the most recent AI conversation
        const mostRecentAI = aiConversations[0];
        const aiConv = mostRecentAI.conversations as any;
        setSelectedConversationId(mostRecentAI.conversation_id);
        setSelectedUsername(aiConv.name || 'CrossChatAI');
        setSelectedUserId(AI_BOT_ID);
        setIsGroup(false);
        setMessages([]);
      } else {
        // No AI conversations exist, create one automatically
        console.log('Creating new AI chat for user:', user?.id);
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            is_ai_chat: true,
            created_by: user?.id,
            name: 'AI Chat',
            is_group: false
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating AI conversation:', convError);
          toast.error(`Failed to create AI chat: ${convError.message}`);
          return;
        }

        console.log('AI conversation created:', newConversation.id);
        
        // Add current user as participant
        const { error: participantError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: newConversation.id,
            user_id: user?.id
          });

        if (participantError) {
          console.error('Error adding participant:', participantError);
          toast.error(`Failed to add participant: ${participantError.message}`);
          return;
        }

        console.log('Participant added successfully');
        
        // Select the newly created AI chat
        setSelectedConversationId(newConversation.id);
        setSelectedUsername('AI Chat');
        setSelectedUserId(AI_BOT_ID);
        setIsGroup(false);
        setMessages([]);
        toast.success('AI chat created');
      }
      return;
    }

    setSelectedConversationId(conversationId);
    setSelectedUsername(displayName);
    setIsGroup(isGroupChat);
    setMessages([]);

    // Check if this is an AI conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .select("is_ai_chat")
      .eq("id", conversationId)
      .single();

    if (conversation?.is_ai_chat) {
      // This is an AI chat, set the AI bot ID
      setSelectedUserId(AI_BOT_ID);
    } else if (!isGroupChat) {
      // For 1-on-1 chats, fetch the other user's ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", displayName)
        .single();

      if (profile) {
        setSelectedUserId(profile.id);
      }
    } else {
      setSelectedUserId("");
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

  const handleClearAIChat = async () => {
    if (!selectedConversationId) return;

    try {
      // Delete all messages and their associated media files for this AI chat
      const { data: messages } = await supabase
        .from("messages")
        .select("id, image_url, voice_url, video_url")
        .eq("conversation_id", selectedConversationId);

      if (messages) {
        for (const msg of messages) {
          // Delete image if exists
          if (msg.image_url) {
            const imagePath = msg.image_url.split("/").pop();
            if (imagePath) {
              await supabase.storage.from("chat-images").remove([`${selectedConversationId}/${imagePath}`]);
            }
          }
          // Delete voice if exists
          if (msg.voice_url) {
            const voicePath = msg.voice_url.split("/").pop();
            if (voicePath) {
              await supabase.storage.from("voice-messages").remove([`${selectedConversationId}/${voicePath}`]);
            }
          }
          // Delete video if exists
          if (msg.video_url) {
            const videoPath = msg.video_url.split("/").pop();
            if (videoPath) {
              await supabase.storage.from("chat-videos").remove([`${selectedConversationId}/${videoPath}`]);
            }
          }
        }
      }

      // Delete all messages
      await supabase.from("messages").delete().eq("conversation_id", selectedConversationId);

      // Delete all participants
      await supabase.from("conversation_participants").delete().eq("conversation_id", selectedConversationId);

      // Delete the conversation
      const { error } = await supabase.from("conversations").delete().eq("id", selectedConversationId);

      if (error) throw error;

      toast.success("AI chat deleted successfully");
      setShowClearChatDialog(false);
      
      // Clear UI state
      setSelectedConversationId(null);
      setSelectedUsername("");
      setSelectedUserId("");
      setMessages([]);
    } catch (error) {
      console.error("Error clearing AI chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Delete all messages and their associated media files
      const { data: messages } = await supabase
        .from("messages")
        .select("id, image_url, voice_url, video_url")
        .eq("conversation_id", conversationId);

      if (messages) {
        for (const msg of messages) {
          // Delete image if exists
          if (msg.image_url) {
            const imagePath = msg.image_url.split("/").pop();
            if (imagePath) {
              await supabase.storage.from("chat-images").remove([`${conversationId}/${imagePath}`]);
            }
          }
          // Delete voice if exists
          if (msg.voice_url) {
            const voicePath = msg.voice_url.split("/").pop();
            if (voicePath) {
              await supabase.storage.from("voice-messages").remove([`${conversationId}/${voicePath}`]);
            }
          }
          // Delete video if exists
          if (msg.video_url) {
            const videoPath = msg.video_url.split("/").pop();
            if (videoPath) {
              await supabase.storage.from("chat-videos").remove([`${conversationId}/${videoPath}`]);
            }
          }
        }
      }

      // Delete all messages
      await supabase.from("messages").delete().eq("conversation_id", conversationId);

      // Delete all participants
      await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId);

      // Delete the conversation
      const { error } = await supabase.from("conversations").delete().eq("id", conversationId);

      if (error) throw error;

      toast.success("Chat deleted successfully");
      
      // Clear selected conversation if it was the deleted one
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setSelectedUsername("");
        setSelectedUserId("");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete chat");
    }
  };

  const startCall = () => {
    if (isGroup) {
      toast.error("Group calls are not supported yet");
      return;
    }
    if (selectedUserId === '00000000-0000-0000-0000-000000000000') {
      toast.error("Cannot call AI bot");
      return;
    }
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
  };

  if (loading || !user) {
    return null;
  }

  // Show call interface if in call
  if (isInCall && selectedConversationId && selectedUserId) {
    return (
      <CallInterface
        conversationId={selectedConversationId}
        userId={user.id}
        otherUserId={selectedUserId}
        onEndCall={endCall}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className={`${selectedConversationId ? 'hidden' : 'flex'} md:flex flex-col h-full md:h-screen w-full md:w-auto`}>
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0 md:hidden w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">Cross Chat</h1>
              <p className="text-xs text-muted-foreground truncate">@{username}</p>
            </div>
          </div>
          <div className="flex gap-0.5 md:gap-1 shrink-0 items-center ml-auto">
            <NewChatDialog
              currentUserId={user?.id || ""}
              onChatCreated={(convId, displayName, isGroup) => handleSelectConversation(convId, displayName, isGroup)}
              onUserSelected={handleSelectUser}
            />
            <BlockedUsersList currentUserId={user?.id || ""} />
            <FeedbackDialog />
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button onClick={() => navigate("/settings")} variant="secondary" size="icon" className="h-8 w-8" aria-label="Settings">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={handleLogout} variant="secondary" size="icon" className="h-8 w-8" aria-label="Logout">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>
        <ConversationsList
          currentUserId={user?.id || ""}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
      <div className={`flex flex-col flex-1 min-w-0 h-full ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
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
            {selectedUsername && user?.id && (
              <>
                {selectedUserId === '00000000-0000-0000-0000-000000000000' ? (
                  <Button
                    onClick={() => setShowClearChatDialog(true)}
                    size="icon"
                    variant="destructive"
                    className="shrink-0 h-8 w-8 md:h-10 md:w-10"
                    aria-label="Clear AI Chat"
                  >
                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                ) : (
                  !isGroup && selectedUserId && (
                    <>
                      <Button
                        onClick={startCall}
                        size="icon"
                        variant="default"
                        className="shrink-0 h-8 w-8 md:h-10 md:w-10"
                        aria-label="Start Call"
                      >
                        <Phone className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                      <UserActionsMenu
                        userId={selectedUserId}
                        username={selectedUsername}
                        currentUserId={user.id}
                        conversationId={selectedConversationId}
                      />
                    </>
                  )
                )}
              </>
            )}
          </div>
          <div className="flex gap-0.5 md:gap-2 shrink-0 items-center ml-auto">
            <NewChatDialog
              currentUserId={user?.id || ""}
              onChatCreated={(convId, displayName, isGroup) => handleSelectConversation(convId, displayName, isGroup)}
              onUserSelected={handleSelectUser}
            />
            <BlockedUsersList currentUserId={user?.id || ""} />
            <FeedbackDialog />
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5 md:hidden" />
                <span className="hidden md:inline md:text-sm">Admin</span>
              </Button>
            )}
            <Button onClick={() => navigate("/settings")} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Settings">
              <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline md:ml-2">Settings</span>
            </Button>
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
              onUpdateMessage={handleUpdateMessage}
              typingUsers={typingUsers}
              conversationId={selectedConversationId}
            />
            <MessageInput 
              onSend={handleSendMessage} 
              isAIChat={selectedUserId === '00000000-0000-0000-0000-000000000000'}
              selectedModel={selectedAIModel}
              onModelChange={setSelectedAIModel}
              aiCredits={aiCredits}
              onCreditsUpdate={fetchAiCredits}
              onTyping={() => {
                if (!selectedConversationId || !user?.id) return;
                
                // Don't broadcast typing to AI chats
                const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
                if (selectedUserId === AI_BOT_ID) return;
                
                // Clear existing timeout
                if (typingTimeout) {
                  clearTimeout(typingTimeout);
                }

                // Broadcast typing event
                const channel = supabase.channel(`conversation-${selectedConversationId}`);
                channel.send({
                  type: 'broadcast',
                  event: 'typing',
                  payload: { userId: user.id, username }
                });

                // Set timeout to stop broadcasting
                const timeout = setTimeout(() => {
                  setTypingTimeout(null);
                }, 3000);
                
                setTypingTimeout(timeout);
              }}
            />
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

      <AlertDialog open={showClearChatDialog} onOpenChange={setShowClearChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear AI Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this AI conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAIChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
