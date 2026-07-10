import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumePendingInstantLink } from "@/utils/instantLinks";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  LogOut, Shield, Settings, Phone, Trash2, Users, MessageCircle, Play, Zap, Sparkles,
  FileText, Coins, Music, Radio, Globe, FlaskConical, Package,
  Star, Heart, Home, Flame, Gem, Gamepad2, Trophy, Video, Camera, Image, Mic,
  Newspaper, BookOpen, Calendar, Clock, MapPin, Compass, Bell, Bookmark, Tag, Flag,
  Gift, ShoppingBag, Wallet, TrendingUp, BarChart3, PieChart, Activity, Layers,
  Grid3x3, List, Palette, Wand2,
} from "lucide-react";
import ContentBlockBanner from "@/components/ContentBlockBanner";
import { useBetaStatus } from "@/hooks/useBetaStatus";
import BetaDialog from "@/components/BetaDialog";
import ModStoreDialog from "@/components/ModStoreDialog";
import ScamDetector from "@/components/ScamDetector";
import { getBalance as getCroinBalance } from "@/utils/croins";
import ModImg from "@/components/ModImg";
import { emitModEvent } from "@/utils/modEvents";
import { getModTabs, onModsUpdated, type ModTab, type ModTabIconName } from "@/utils/mods";
import ModTabView from "@/components/ModTabView";
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
import { requestNotificationPermission, registerServiceWorker, showNotification, setActiveConversation, getActiveConversation, showMessageNotification, showCallNotification } from "@/utils/notifications";
import VideoFeed from "@/components/video/VideoFeed";
import ShortsFeed from "@/components/video/ShortsFeed";
import ForYouFeed from "@/components/video/ForYouFeed";
import CreatorProfile from "@/components/video/CreatorProfile";
import PostsFeed from "@/components/posts/PostsFeed";
import MusicFeed from "@/components/music/MusicFeed";
import LiveFeed from "@/components/live/LiveFeed";
import CrossunityFeed from "@/components/crossunity/CrossunityFeed";
import RadioFeed from "@/components/radio/RadioFeed";


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

/** Maps tabs.json's `icon` name (validated against MOD_TAB_ICON_NAMES in mods.ts) to a component. */
const MOD_TAB_ICON_MAP: Record<ModTabIconName, typeof Package> = {
  Package, Star, Heart, Home, Zap, Sparkles, Flame, Gem, Gamepad2, Trophy,
  Music, Video, Camera, Image, Mic, Radio, Newspaper, BookOpen, Calendar, Clock,
  MapPin, Compass, Globe, Bell, Bookmark, Tag, Flag, Gift, ShoppingBag, Wallet,
  Coins, TrendingUp, BarChart3, PieChart, Activity, Layers, Grid3x3, List, Palette, Wand2,
};

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const MESSAGES_PAGE_SIZE = 30;
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
  const [activeTab, setActiveTab] = useState<"chats" | "videos" | "foryou" | "shorts" | "posts" | "music" | "live" | "crossunity" | "radio" | `modtab:${string}`>("chats");
  const [modTabs, setModTabs] = useState<ModTab[]>(() => getModTabs());

  useEffect(() => {
    const refresh = () => {
      const tabs = getModTabs();
      setModTabs(tabs);
      // If the active mod tab was just uninstalled/disabled, fall back to chats.
      setActiveTab((cur) => {
        if (typeof cur === "string" && cur.startsWith("modtab:")) {
          const id = cur.slice("modtab:".length);
          if (!tabs.some((t) => t.id === id)) return "chats";
        }
        return cur;
      });
    };
    return onModsUpdated(refresh);
  }, []);
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const [croinBalance, setCroinBalance] = useState<number>(0);
  const [betaDialogOpen, setBetaDialogOpen] = useState(false);
  const [modStoreOpen, setModStoreOpen] = useState(false);
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
      const today = new Date().toISOString().split('T')[0];
      if (data.last_reset_date < today) {
        setAiCredits(15);
      } else {
        setAiCredits(Number(data.credits_remaining));
      }
    } else {
      setAiCredits(15);
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
          setActiveConversation(data as string);
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

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
      .on('presence', { event: 'sync' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    const lastSeenInterval = setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }, 30000);

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
          
          if (signal.signal_type === 'offer') {
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', signal.from_user_id)
              .single();
            
            const callerName = callerProfile?.username || 'Someone';
            showCallNotification(callerName, signal.conversation_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user]);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkBan = async () => {
      const { data: ban } = await supabase
        .from("user_bans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ban) {
        if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
          await supabase.from("user_bans").delete().eq("id", ban.id);
          return true;
        } else {
          navigate("/banned");
          return false;
        }
      }
      return true;
    };

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

      fetchAiCredits();

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

    const fetchMessages = async () => {
      // Only load the most recent page of messages up front — older
      // messages are fetched on demand via "Load older messages" to
      // keep initial render light on slower devices.
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      if (error) {
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
      const ordered = (data || []).slice().reverse();
      setMessages(ordered);
      setHasMoreMessages((data || []).length === MESSAGES_PAGE_SIZE);
    };

    fetchMessages();

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
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(username, avatar_url)")
            .eq("id", payload.new.id)
            .maybeSingle();

          if (data) {
            setMessages((prev) => [...prev, data]);
            
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.user_id));
            
            // Show notification for messages from other users when not viewing this conversation
            if (data.user_id !== user.id && getActiveConversation() !== selectedConversationId) {
              showMessageNotification(
                data.profiles?.username || 'Someone',
                data.content || 'Sent a media file',
                selectedConversationId
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
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (deleteError) throw deleteError;

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

    if (isAIChat) {
      try {
        setTypingUsers((prev) => [...prev, { userId: AI_BOT_ID, username: 'CrossChatAI' }]);

        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat', {
          body: { 
            conversationId: selectedConversationId,
            userMessage: content,
            model: selectedAIModel,
            generateImage: generateImage || false
          }
        });

        setTypingUsers((prev) => prev.filter((u) => u.userId !== AI_BOT_ID));

        fetchAiCredits();

        if (aiError) {
          console.error('AI chat error:', aiError);
          if (aiError.message?.includes('credits') || aiError.message?.includes('402')) {
            toast.error('Not enough AI credits. Credits reset daily.');
          } else {
            toast.error('AI response failed. Please try again.');
          }
        }
      } catch (aiError: any) {
        console.error('AI chat error:', aiError);
        fetchAiCredits();
        if (aiError?.message?.includes('credits')) {
          toast.error('Not enough AI credits. Credits reset daily.');
        } else {
          toast.error('AI response failed. Please try again.');
        }
        setTypingUsers((prev) => prev.filter((u) => u.userId !== AI_BOT_ID));
      }
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedConversationId || messages.length === 0 || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    try {
      const oldestCreatedAt = messages[0].created_at;

      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
        .eq("conversation_id", selectedConversationId)
        .lt("created_at", oldestCreatedAt)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching older messages:", error);
        }
        toast.error("Failed to load older messages");
        return;
      }

      const olderOrdered = (data || []).slice().reverse();
      setMessages((prev) => [...olderOrdered, ...prev]);
      setHasMoreMessages((data || []).length === MESSAGES_PAGE_SIZE);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleSelectConversation = async (conversationId: string, displayName: string, isGroupChat: boolean) => {
    const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
    
    setActiveConversation(conversationId);

    if (conversationId === 'ai-chat') {
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
        const mostRecentAI = aiConversations[0];
        const aiConv = mostRecentAI.conversations as any;
        setSelectedConversationId(mostRecentAI.conversation_id);
        setSelectedUsername(aiConv.name || 'CrossChatAI');
        setSelectedUserId(AI_BOT_ID);
        setIsGroup(false);
        setMessages([]);
        setActiveConversation(mostRecentAI.conversation_id);
      } else {
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
        
        setSelectedConversationId(newConversation.id);
        setSelectedUsername('AI Chat');
        setSelectedUserId(AI_BOT_ID);
        setIsGroup(false);
        setMessages([]);
        setActiveConversation(newConversation.id);
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
    emitModEvent("openedchat", { conversationId });

    const { data: conversation } = await supabase
      .from("conversations")
      .select("is_ai_chat, group_image_url")
      .eq("id", conversationId)
      .single();

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
      setSelectedUserId(AI_BOT_ID);
    } else if (!isGroupChat) {
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
        setActiveConversation(data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error creating conversation:", error);
      }
      toast.error("Failed to start conversation");
    }
  };

  const handleLogout = async () => {
    emitModEvent("logout");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleClearAIChat = async () => {
    if (!selectedConversationId) return;

    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("id, image_url, voice_url, video_url")
        .eq("conversation_id", selectedConversationId);

      if (messages) {
        for (const msg of messages) {
          if (msg.image_url) {
            const imagePath = msg.image_url.split("/").pop();
            if (imagePath) {
              await supabase.storage.from("chat-images").remove([`${selectedConversationId}/${imagePath}`]);
            }
          }
          if (msg.voice_url) {
            const voicePath = msg.voice_url.split("/").pop();
            if (voicePath) {
              await supabase.storage.from("voice-messages").remove([`${selectedConversationId}/${voicePath}`]);
            }
          }
          if (msg.video_url) {
            const videoPath = msg.video_url.split("/").pop();
            if (videoPath) {
              await supabase.storage.from("chat-videos").remove([`${selectedConversationId}/${videoPath}`]);
            }
          }
        }
      }

      await supabase.from("messages").delete().eq("conversation_id", selectedConversationId);
      await supabase.from("conversation_participants").delete().eq("conversation_id", selectedConversationId);
      const { error } = await supabase.from("conversations").delete().eq("id", selectedConversationId);

      if (error) throw error;

      toast.success("AI chat deleted successfully");
      setShowClearChatDialog(false);
      
      setSelectedConversationId(null);
      setSelectedUsername("");
      setSelectedUserId("");
      setMessages([]);
      setActiveConversation(null);
    } catch (error) {
      console.error("Error clearing AI chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { data: participant } = await supabase
        .from("conversation_participants")
        .select("kicked_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user?.id)
        .single();

      if (participant?.kicked_at) {
        const { error } = await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user?.id);

        if (error) throw error;

        toast.success("Chat removed from your list");
        
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
          setSelectedUsername("");
          setSelectedUserId("");
          setMessages([]);
          setIsKickedFromGroup(false);
          setActiveConversation(null);
        }
        return;
      }

      const { data: messages } = await supabase
        .from("messages")
        .select("id, image_url, voice_url, video_url")
        .eq("conversation_id", conversationId);

      if (messages) {
        for (const msg of messages) {
          if (msg.image_url) {
            const imagePath = msg.image_url.split("/").pop();
            if (imagePath) {
              await supabase.storage.from("chat-images").remove([`${conversationId}/${imagePath}`]);
            }
          }
          if (msg.voice_url) {
            const voicePath = msg.voice_url.split("/").pop();
            if (voicePath) {
              await supabase.storage.from("voice-messages").remove([`${conversationId}/${voicePath}`]);
            }
          }
          if (msg.video_url) {
            const videoPath = msg.video_url.split("/").pop();
            if (videoPath) {
              await supabase.storage.from("chat-videos").remove([`${conversationId}/${videoPath}`]);
            }
          }
        }
      }

      await supabase.from("messages").delete().eq("conversation_id", conversationId);
      await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId);
      const { error } = await supabase.from("conversations").delete().eq("id", conversationId);

      if (error) throw error;

      toast.success("Chat deleted successfully");
      
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
    setActiveConversation(conversationId);
    setIsInCall(true);
  };

  if (loading || !user) {
    return null;
  }

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
      <IncomingCallHandler 
        userId={user.id} 
        onAcceptCall={handleAcceptIncomingCall} 
      />
      
      <div className="flex flex-col h-screen bg-background overflow-hidden">
      <ContentBlockBanner userId={user?.id} />
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
          onClick={() => { setActiveTab("videos"); setSelectedConversationId(null); setActiveConversation(null); emitModEvent("videotab"); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "videos" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="h-5 w-5" />
          <span>Videos</span>
        </button>
        <button
          onClick={() => { setActiveTab("foryou"); setSelectedConversationId(null); setActiveConversation(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "foryou" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span>For You</span>
        </button>
        <button
          onClick={() => { setActiveTab("crossunity"); setSelectedConversationId(null); setActiveConversation(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "crossunity" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-5 w-5" />
          <span>Crossunity</span>
        </button>
        <button
          onClick={() => { setActiveTab("music"); setSelectedConversationId(null); setActiveConversation(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "music" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Music className="h-5 w-5" />
          <span>Music</span>
        </button>
        <button
          onClick={() => { setActiveTab("radio"); setSelectedConversationId(null); setActiveConversation(null); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "radio" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Radio className="h-5 w-5" />
          <span>Radio</span>
        </button>
        {modTabs.map((tab) => {
          const TabIcon = (tab.icon && MOD_TAB_ICON_MAP[tab.icon as ModTabIconName]) || Package;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(`modtab:${tab.id}`); setSelectedConversationId(null); setActiveConversation(null); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                activeTab === `modtab:${tab.id}` ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TabIcon className="h-5 w-5" />
              <span className="truncate max-w-[4.5rem]">{tab.name}</span>
            </button>
          );
        })}
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
          <VideoFeed
            currentUserId={user.id}
            deepLinkVideoId={instantVideoId}
            onDeepLinkConsumed={() => setInstantVideoId(null)}
          />
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
          <MusicFeed
            currentUserId={user.id}
            onCreatorClick={(id) => setCreatorProfileId(id)}
            deepLinkTrackId={instantMusicId}
            onDeepLinkConsumed={() => setInstantMusicId(null)}
          />
        </div>
      ) : activeTab === "crossunity" ? (
        <div className="flex-1 min-h-0">
          <CrossunityFeed
            currentUserId={user.id}
            onCreatorClick={(id) => setCreatorProfileId(id)}
            deepLinkSubcrossId={instantSubcrossId}
            onDeepLinkConsumed={() => setInstantSubcrossId(null)}
          />
        </div>
      ) : activeTab === "radio" ? (
        <div className="flex-1 min-h-0">
          <RadioFeed currentUserId={user.id} />
        </div>

      ) : typeof activeTab === "string" && activeTab.startsWith("modtab:") ? (
        <div className="flex-1 min-h-0 flex">
          {(() => {
            const id = activeTab.slice("modtab:".length);
            const tab = modTabs.find((t) => t.id === id);
            return tab ? <ModTabView tab={tab} /> : null;
          })()}
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
                  <ModImg src={croinIcon} alt="Croins" className="h-3.5 w-3.5" loading="lazy" width={14} height={14} />
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
            <Button onClick={() => setModStoreOpen(true)} variant="secondary" size="icon" className="h-8 w-8" aria-label="Mod Store" title="Mod Store">
              <Package className="h-3.5 w-3.5 text-primary" />
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
                  setActiveConversation(null);
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
                      setActiveConversation(null);
                    }}
                    onGroupLeft={() => {
                      setSelectedConversationId(null);
                      setSelectedUsername("");
                      setSelectedUserId("");
                      setIsGroup(false);
                      setMessages([]);
                      setGroupImageUrl(undefined);
                      setActiveConversation(null);
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
            <Button onClick={() => setModStoreOpen(true)} variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Mod Store" title="Mod Store">
              <Package className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="hidden md:inline md:ml-2">Mods</span>
            </Button>
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
                    setActiveConversation(null);
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
                hasMoreMessages={hasMoreMessages}
                loadingOlderMessages={loadingOlderMessages}
                onLoadOlderMessages={loadOlderMessages}
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
                  
                  const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
                  if (selectedUserId === AI_BOT_ID) return;
                  
                  if (typingTimeout) {
                    clearTimeout(typingTimeout);
                  }

                  const channel = supabase.channel(`conversation-${selectedConversationId}`);
                  channel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { userId: user.id, username }
                  });

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
      <ModStoreDialog open={modStoreOpen} onOpenChange={setModStoreOpen} currentUserId={user?.id} />
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
