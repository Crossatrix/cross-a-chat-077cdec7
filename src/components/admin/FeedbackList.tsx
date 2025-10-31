import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  status: string;
  created_at: string;
  username?: string;
}

const FeedbackList = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();

    const channel = supabase
      .channel("feedback-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feedback",
        },
        () => {
          fetchFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching feedback:", error);
      }
      toast.error("Failed to load feedback");
      return;
    }

    // Fetch usernames for all feedback
    const feedbackWithUsernames = await Promise.all(
      (data || []).map(async (item) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", item.user_id)
          .single();
        
        return {
          ...item,
          username: profile?.username,
        };
      })
    );

    setFeedback(feedbackWithUsernames);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("feedback")
      .update({ status })
      .eq("id", id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating feedback:", error);
      }
      toast.error("Failed to update feedback");
      return;
    }

    toast.success("Feedback status updated");
  };

  if (loading) {
    return <div className="p-4 text-center">Loading feedback...</div>;
  }

  if (feedback.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No feedback yet</div>;
  }

  return (
    <div className="space-y-4">
      {feedback.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                @{item.username || "Unknown"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    item.status === "resolved"
                      ? "default"
                      : item.status === "pending"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {item.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(item.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 whitespace-pre-wrap">{item.message}</p>
            <div className="flex gap-2">
              {item.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(item.id, "resolved")}
                >
                  Mark Resolved
                </Button>
              )}
              {item.status === "resolved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(item.id, "pending")}
                >
                  Reopen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeedbackList;
