import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface User {
  id: string;
  username: string;
}

interface UsersListProps {
  currentUserId: string;
  onSelectUser: (userId: string) => void;
}

const UsersList = ({ currentUserId, onSelectUser }: UsersListProps) => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .neq("id", currentUserId);

      if (data) {
        setUsers(data);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm">
          <Users className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Start a Conversation</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-2">
            {users.map((user) => (
              <Button
                key={user.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => onSelectUser(user.id)}
              >
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarFallback className="bg-secondary text-foreground">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{user.username}</div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default UsersList;
