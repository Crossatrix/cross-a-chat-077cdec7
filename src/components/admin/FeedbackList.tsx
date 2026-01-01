import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Star, Trash2, MessageSquare, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  status: string;
  created_at: string;
  important: boolean;
  rating?: number | null;
  username?: string;
  admin_response?: string | null;
  admin_response_at?: string | null;
  admin_response_by?: string | null;
  admin_username?: string;
}

const FeedbackList = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        
        let adminUsername: string | undefined;
        if (item.admin_response_by) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", item.admin_response_by)
            .single();
          adminUsername = adminProfile?.username;
        }
        
        return {
          ...item,
          username: profile?.username,
          admin_username: adminUsername,
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

  const toggleImportant = async (id: string, currentImportant: boolean) => {
    const { error } = await supabase
      .from("feedback")
      .update({ important: !currentImportant })
      .eq("id", id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating feedback:", error);
      }
      toast.error("Failed to update feedback");
      return;
    }

    toast.success(currentImportant ? "Removed from important" : "Marked as important");
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting feedback:", error);
      }
      toast.error("Failed to delete feedback");
      return;
    }

    toast.success("Feedback deleted");
  };

  const handleRespond = async (feedbackId: string) => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Not authenticated");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("feedback")
      .update({
        admin_response: responseText.trim(),
        admin_response_at: new Date().toISOString(),
        admin_response_by: user.id,
        status: "resolved",
      })
      .eq("id", feedbackId);

    setSubmitting(false);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error responding to feedback:", error);
      }
      toast.error("Failed to send response");
      return;
    }

    toast.success("Response sent");
    setRespondingTo(null);
    setResponseText("");
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
        <Card key={item.id} className={item.important ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  @{item.username || "Unknown"}
                </CardTitle>
                {item.important && (
                  <Star className="h-4 w-4 fill-primary text-primary" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
            {item.rating && (
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= item.rating!
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="text-sm mb-4 whitespace-pre-wrap">{item.message}</p>
            
            {/* Admin Response Display */}
            {item.admin_response && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Admin Response
                  </span>
                  {item.admin_username && (
                    <span className="text-xs text-muted-foreground">
                      by @{item.admin_username}
                    </span>
                  )}
                  {item.admin_response_at && (
                    <span className="text-xs text-muted-foreground">
                      • {format(new Date(item.admin_response_at), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{item.admin_response}</p>
              </div>
            )}

            {/* Response Input */}
            {respondingTo === item.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Type your response..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRespond(item.id)}
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {submitting ? "Sending..." : "Send Response"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRespondingTo(null);
                      setResponseText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {!item.admin_response && respondingTo !== item.id && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRespondingTo(item.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Respond
                </Button>
              )}
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
              <Button
                size="sm"
                variant={item.important ? "outline" : "secondary"}
                onClick={() => toggleImportant(item.id, item.important)}
              >
                <Star className="h-4 w-4 mr-1" />
                {item.important ? "Unmark" : "Important"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this feedback? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteFeedback(item.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeedbackList;