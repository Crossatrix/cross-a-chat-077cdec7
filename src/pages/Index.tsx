import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumePendingInstantLink } from "@/utils/instantLinks";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Settings, Phone, Trash2, Users, MessageCircle, Play, Zap, Sparkles, FileText, Coins, Music, Radio, Globe, FlaskConical } from "lucide-react";
import { useBetaStatus } from "@/hooks/useBetaStatus";
import BetaDialog from "@/components/BetaDialog";
import ScamDetector from "@/components/ScamDetector";
import { getBalance as getCroinBalance } from "@/utils/croins";
import croinIcon from "@/assets/croin.png";
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
import UserInfoDialog from "@/components/UserInfoDialog";
import BlockedUsersList from "@/components/BlockedUsersList";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { CallInterface } from "@/components/CallInterface";
import { IncomingCallHandler } from "@/components/IncomingCallHandler";
import { NewChatDialog } from "@/components/NewChatDialog";
import { GroupSettingsDialog } from "@/components/GroupSettingsDialog";
import { requestNotificationPermission, registerServiceWorker, showNotification } from "@/utils/notifications";
import VideoFeed from "@/components/video/VideoFeed";
import ShortsFeed from "@/components/video/ShortsFeed";
import ForYouFeed from "@/components/video/ForYouFeed";
import CreatorProfile from "@/components/video/CreatorProfile";
import PostsFeed from "@/components/posts/PostsFeed";
import MusicFeed from "@/components/music/MusicFeed";
import LiveFeed from "@/components/live/LiveFeed";
import CrossunityFeed from "@/components/crossunity/CrossunityFeed";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  voice_url?: string;
  video_url?: string;
  updated_at?: string;
  is_system?: boolean;
  system_type?: string;
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
  const [isStaff, setIsStaff] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupImageUrl, setGroupImageUrl] = useState<string | undefined>(undefined);
  const [isKickedFromGroup, setIsKickedFromGroup] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("openai/gpt-5-mini");
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
const [aiCredits, setAiCredits] = useState<number>(15);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"chats" | "videos" | "foryou" | "shorts" | "posts" | "music" | "live" | "crossunity">("chats");
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const [croinBalance, setCroinBalance] = useState<number>(0);
  const [betaDialogOpen, setBetaDialogOpen] = useState(false);
  const [instantVideoId, setInstantVideoId] = useState<string | null>(null);
  const [instantMusicId, setInstantMusicId] = useState<string | null>(null);
  const [instantSubcrossId, setInstantSubcrossId] = useState<string | null>(null);
  const isBeta = useBetaStatus(user?.id);
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

  // Handle pending instant-link after auth
  useEffect(() => {
    if (!user) return;
    const pending = consumePendingInstantLink();
    if (!pending) return;
    (async () => {
      try {
        if (pending.action === "chat") {
          const { data, error } = await supabase.rpc("find_or_create_conversation", {
            other_user_id: pending.id,
          });
          if (error) throw error;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", pending.id)
            .single();
          setSelectedConversationId(data as string);
          setSelectedUsername(profile?.username || "");
          setSelectedUserId(pending.id);
          setIsGroup(false);
          setActiveTab("chats");
        } else if (pending.action === "video") {
          setActiveTab("videos");
          setInstantVideoId(pending.id);
        } else if (pending.action === "music") {
          setActiveTab("music");
          setInstantMusicId(pending.id);
        } else if (pending.action === "subcross") {
          setActiveTab("crossunity");
          setInstantSubcrossId(pending.id);
        }
      } catch (e) {
        console.error("instant-link error", e);
      }
    })();
  }, [user?.id]);

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
        .eq("user_id", user.id);

      const staffRoles = ['moderator_lite', 'moderator', 'elder_moderator', 'admin'];
      const hasStaffRole = (roles || []).some(r => staffRoles.includes(r.role));
      setIsStaff(hasStaffRole);
      const modRoles = ['moderator', 'elder_moderator', 'admin'];
      setIsModerator((roles || []).some(r => modRoles.includes(r.role)));

      // Fetch AI credits
      fetchAiCredits();

      // Fetch Croin balance using Crossatrix user ID
      const crossatrixId = localStorage.getItem("crossatrix_user_id") || user.id;
      getCroinBalance(crossatrixId).then(b => setCroinBalance(b));
    };

    fetchUserData();
  }, [user, navigate, loading]);

  // Fetch pending group invites count
  useEffect(() => {
    if (!user) return;

    const fetchPendingInvites = async () => {
      const { count } = await supabase
        .from('group_invites')
        .select('*', { count: 'exact', head: true })
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');
      
      setPendingInvitesCount(count || 0);
    };

    fetchPendingInvites();

    // Subscribe to invite changes
    const channel = supabase
      .channel('group-invites-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invites',
          filter: `invited_user_id=eq.${user.id}`,
        },
        () => {
          fetchPendingInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
        // Check if error is due to RLS (kicked from group)
        if (error.code === 'PGRST116' || error.message.includes('permission')) {
          setIsKickedFromGroup(true);
          return;
        }
        if (import.meta.env.DEV) {
          console.error("Error fetching messages:", error);
        }
        toast.error("Failed to load messages");
        return;
      }

      setIsKickedFromGroup(false);
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

  const handleSendMessage = async (content: string, imageFile?: File, voiceBlob?: Blob, videoFile?: File, generateImage?: boolean, isSystemMessage?: boolean) => {
    if (!user || !selectedConversationId) return;

    setIsSendingMessage(true);
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

    const { escapeUnauthorizedCreatorEmojis } = await import("@/utils/creatorEmojis");
    const safeContent = await escapeUnauthorizedCreatorEmojis(content, user.id);
    const messagePayload: any = {
      user_id: user.id,
      content: safeContent,
      conversation_id: selectedConversationId,
      image_url: imageUrl,
      voice_url: voiceUrl,
      video_url: videoUrl,
    };

    if (isSystemMessage && isModerator) {
      messagePayload.is_system = true;
      messagePayload.system_type = 'announcement';
    }

    const { error } = await supabase.from("messages").insert(messagePayload);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error sending message:", error);
      }
      toast.error("Failed to send message");
      setIsSendingMessage(false);
      return;
    }

    setIsSendingMessage(false);

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
    setGroupImageUrl(undefined);
    setIsKickedFromGroup(false);

    // Check if this is an AI conversation and fetch group image if applicable
    const { data: conversation } = await supabase
      .from("conversations")
      .select("is_ai_chat, group_image_url")
      .eq("id", conversationId)
      .single();

    // Check if user is kicked from group
    if (isGroupChat) {
      const { data: participant } = await supabase
        .from("conversation_participants")
        .select("kicked_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id)
        .single();
      
      if (participant?.kicked_at) {
        setIsKickedFromGroup(true);
      }
    }

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
      // Set group image if available
      if (conversation?.group_image_url) {
        setGroupImageUrl(conversation.group_image_url);
      }
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
      // Check if user is kicked from this conversation
      const { data: participant } = await supabase
        .from("conversation_participants")
        .select("kicked_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id)
        .single();

      // If user is kicked, just delete their participant record
      if (participant?.kicked_at) {
        const { error } = await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user?.id);

        if (error) throw error;

        toast.success("Chat removed from your list");
        
        // Clear selected conversation if it was the deleted one
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
          setSelectedUsername("");
          setSelectedUserId("");
          setMessages([]);
          setIsKickedFromGroup(false);
        }
        return;
      }

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

  const handleAcceptIncomingCall = (conversationId: string, callerId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedUserId(callerId);
    setIsInCall(true);
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
    <>
      {/* Incoming call handler - polls every 10 seconds */}
      <IncomingCallHandler 
        userId={user.id} 
        onAcceptCall={handleAcceptIncomingCall} 
      />
      
      <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Bottom navigation bar */}
      <div className="order-last md:order-none flex border-t md:border-t-0 md:border-b border-border bg-card shrink-0 z-10">
        <button
          onClick={() => { setActiveTab("chats"); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "chats" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span>Chats</span>
        </button>
        <button
          onClick={() => { setActiveTab("videos"); setSelectedConversationId(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "videos" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="h-5 w-5" />
          <span>Videos</span>
        </button>
        <button
          onClick={() => { setActiveTab("foryou"); setSelectedConversationId(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "foryou" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span>For You</span>
        </button>
        <button
          onClick={() => { setActiveTab("shorts"); setSelectedConversationId(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "shorts" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-5 w-5" />
          <span>Shorts</span>
        </button>
        <button
          onClick={() => { setActiveTab("crossunity"); setSelectedConversationId(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "crossunity" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-5 w-5" />
          <span>Crossunity</span>
        </button>
        <button
          onClick={() => { setActiveTab("music"); setSelectedConversationId(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "music" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Music className="h-5 w-5" />
          <span>Music</span>
        </button>
      </div>

      {creatorProfileId ? (
        <div className="flex-1 min-h-0">
          <CreatorProfile
            creatorId={creatorProfileId}
            currentUserId={user.id}
            onBack={() => setCreatorProfileId(null)}
            onSelectVideo={() => setCreatorProfileId(null)}
          />
        </div>
      ) : activeTab === "videos" ? (
        <div className="flex-1 min-h-0">
          <VideoFeed currentUserId={user.id} />
        </div>
      ) : activeTab === "foryou" ? (
        <div className="flex-1 min-h-0">
          <ForYouFeed currentUserId={user.id} onCreatorClick={(id) => setCreatorProfileId(id)} />
        </div>
      ) : activeTab === "shorts" ? (
        <div className="flex-1 min-h-0">
          <ShortsFeed currentUserId={user.id} onCreatorClick={(id) => setCreatorProfileId(id)} />
        </div>
      ) : activeTab === "music" ? (
        <div className="flex-1 min-h-0">
          <MusicFeed currentUserId={user.id} onCreatorClick={(id) => setCreatorProfileId(id)} />
        </div>
      ) : activeTab === "crossunity" ? (
        <div className="flex-1 min-h-0">
          <CrossunityFeed currentUserId={user.id} onCreatorClick={(id) => setCreatorProfileId(id)} />
        </div>
      ) : (
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className={`${selectedConversationId ? 'hidden' : 'flex'} md:flex flex-col h-full md:h-screen w-full md:w-auto`}>
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0 md:hidden w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">Cross Chat</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
                <button onClick={() => navigate("/store")} className="flex items-center gap-0.5 text-xs font-semibold text-amber-500 hover:opacity-80 transition-opacity">
                  <img src={croinIcon} alt="Croins" className="h-3.5 w-3.5" loading="lazy" width={14} height={14} />
                  {croinBalance}
                </button>
              </div>
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
            <Button onClick={() => navigate("/invites")} variant="secondary" size="icon" className="h-8 w-8 relative" aria-label="Group Invites">
              <Users className="h-3.5 w-3.5" />
              {pendingInvitesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {pendingInvitesCount > 99 ? '99+' : pendingInvitesCount}
                </span>
              )}
            </Button>
            {isStaff && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button onClick={() => navigate("/settings")} variant="secondary" size="icon" className="h-8 w-8" aria-label="Settings">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            {isBeta && (
              <Button onClick={() => setBetaDialogOpen(true)} variant="secondary" size="icon" className="h-8 w-8" aria-label="Beta features" title="Beta features">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
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
                ) : isGroup && selectedConversationId ? (
                  <GroupSettingsDialog
                    conversationId={selectedConversationId}
                    groupName={selectedUsername}
                    groupImageUrl={groupImageUrl}
                    currentUserId={user.id}
                    onGroupUpdated={async () => {
                      // Refetch conversation details
                      const { data } = await supabase
                        .from("conversations")
                        .select("name, group_image_url")
                        .eq("id", selectedConversationId)
                        .single();
                      if (data) {
                        setSelectedUsername(data.name || "Group Chat");
                        setGroupImageUrl(data.group_image_url || undefined);
                      }
                    }}
                    onGroupDeleted={() => {
                      setSelectedConversationId(null);
                      setSelectedUsername("");
                      setSelectedUserId("");
                      setIsGroup(false);
                      setMessages([]);
                      setGroupImageUrl(undefined);
                    }}
                    onGroupLeft={() => {
                      setSelectedConversationId(null);
                      setSelectedUsername("");
                      setSelectedUserId("");
                      setIsGroup(false);
                      setMessages([]);
                      setGroupImageUrl(undefined);
                    }}
                  />
                ) : (
                  selectedUserId && selectedUserId !== '00000000-0000-0000-0000-000000000000' && (
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
                      <UserInfoDialog
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
            {isStaff && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Admin Panel">
                <Shield className="h-3.5 w-3.5 md:hidden" />
                <span className="hidden md:inline md:text-sm">Admin</span>
              </Button>
            )}
            <Button onClick={() => navigate("/settings")} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Settings">
              <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline md:ml-2">Settings</span>
            </Button>
            {isBeta && (
              <Button onClick={() => setBetaDialogOpen(true)} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Beta features" title="Beta features">
                <FlaskConical className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                <span className="hidden md:inline md:ml-2">Beta</span>
              </Button>
            )}
            <Button onClick={handleLogout} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Logout">
              <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden md:inline md:ml-2">Logout</span>
            </Button>
          </div>
        </header>
        {selectedConversationId ? (
          isKickedFromGroup ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center space-y-4">
                <div className="text-6xl">🚫</div>
                <h2 className="text-xl font-semibold text-destructive">You were removed from this group</h2>
                <p className="text-muted-foreground">You can no longer view or send messages in this group.</p>
                <Button
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    handleDeleteConversation(selectedConversationId);
                    setSelectedConversationId(null);
                    setSelectedUsername("");
                    setSelectedUserId("");
                    setIsGroup(false);
                    setIsKickedFromGroup(false);
                    setMessages([]);
                  }}
                >
                  <Trash2 className="h-5 w-5" />
                  Delete This Chat
                </Button>
              </div>
            </div>
          ) : (
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
                isSending={isSendingMessage}
                canSendSystemMessage={isModerator}
                isBeta={isBeta}
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
          )
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
    )}

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
      <BetaDialog open={betaDialogOpen} onOpenChange={setBetaDialogOpen} />
      <ScamDetector
        conversationId={selectedConversationId}
        currentUserDbId={user?.id}
        otherUserId={selectedUserId}
        isGroup={isGroup}
        isAIChat={selectedUserId === '00000000-0000-0000-0000-000000000000'}
        enabled={isBeta}
      />
    </div>
    </>
  );
};

export default Index;
