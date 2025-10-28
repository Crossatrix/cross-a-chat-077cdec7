import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
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
        .single();

      if (ban) {
        await supabase.auth.signOut();
        toast.error("Your account has been banned");
        navigate("/auth");
        return false;
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
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(username)")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(username)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const { error } = await supabase.from("messages").insert({
      user_id: user.id,
      content,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cross Chat</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => navigate("/admin")} variant="secondary" size="sm">
              Admin Panel
            </Button>
          )}
          <Button onClick={handleLogout} variant="secondary" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      <MessageList messages={messages} currentUserId={username} currentUserDbId={user?.id} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};

export default Index;
