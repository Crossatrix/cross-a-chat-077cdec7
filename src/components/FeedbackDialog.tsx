import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FeedbackDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      message: message.trim(),
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    setLoading(false);

    if (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
      return;
    }

    toast.success("Feedback submitted successfully!");
    setMessage("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden md:inline ml-2">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts, report issues, or suggest improvements.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Enter your feedback here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
