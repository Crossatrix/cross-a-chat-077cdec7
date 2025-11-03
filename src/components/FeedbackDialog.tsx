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
import { MessageSquare, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const feedbackSchema = z.string().trim().min(1, "Please enter your feedback").max(5000, "Feedback too long (max 5000 characters)");

export const FeedbackDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validation = feedbackSchema.safeParse(message);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      message: validation.data,
      rating: rating > 0 ? rating : null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    setLoading(false);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error submitting feedback:", error);
      }
      toast.error("Failed to submit feedback");
      return;
    }

    toast.success("Feedback submitted successfully!");
    setMessage("");
    setRating(0);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" aria-label="Feedback">
          <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden md:inline md:ml-2">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts, report issues, or suggest improvements.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Rate your experience (optional)
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Textarea
              placeholder="Enter your feedback here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {message.length}/5000
            </p>
          </div>
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
