import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { z } from "zod";

interface UsersListProps {
  currentUserId: string;
  onSelectUser: (userId: string) => void;
}

const usernameSchema = z.string()
  .trim()
  .min(1, "Username is required")
  .max(50, "Username must be less than 50 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const UsersList = ({ currentUserId, onSelectUser }: UsersListProps) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleStartChat = async () => {
    try {
      // Validate username
      const validatedUsername = usernameSchema.parse(username);
      
      setLoading(true);

      // Find user by exact username match
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", validatedUsername)
        .neq("id", currentUserId)
        .single();

      if (error || !profile) {
        toast.error("User not found");
        setLoading(false);
        return;
      }

      // Check if user is blocked
      const { data: block } = await supabase
        .from("user_blocks")
        .select("*")
        .eq("blocker_id", currentUserId)
        .eq("blocked_user_id", profile.id)
        .single();

      if (block) {
        toast.error("You have blocked this user");
        setLoading(false);
        return;
      }

      onSelectUser(profile.id);
      setUsername("");
      setIsOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to start chat");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="New Chat">
          <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden md:inline md:ml-2">New Chat</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Start a Conversation</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="username">Enter Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleStartChat();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Type the exact username to start chatting
            </p>
          </div>
          <Button 
            onClick={handleStartChat} 
            disabled={loading || !username.trim()}
            className="w-full"
          >
            {loading ? "Searching..." : "Start Chat"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UsersList;
