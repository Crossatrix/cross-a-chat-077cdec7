import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Star, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

const feedbackSchema = z.string().trim().min(1, "Please enter your feedback").max(5000, "Feedback too long (max 5000 characters)");

interface FeedbackItem {
  id: string;
  message: string;
  status: string;
  created_at: string;
  rating?: number | null;
  admin_response?: string | null;
  admin_response_at?: string | null;
}

export const FeedbackDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchFeedbackHistory();
    }
  }, [open]);

  const fetchFeedbackHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("feedback")
      .select("id, message, status, created_at, rating, admin_response, admin_response_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setFeedbackHistory(data);
    }
  };

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
      toast.error(t("feedback.failed"));
      return;
    }

    toast.success(t("feedback.submitted"));
    setMessage("");
    setRating(0);
    fetchFeedbackHistory();
  };

  const hasAdminResponses = feedbackHistory.some(f => f.admin_response);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3 relative" aria-label={t("feedback.title")}>
          <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden md:inline md:ml-2">{t("feedback.title")}</span>
          {hasAdminResponses && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("feedback.send")}</DialogTitle>
          <DialogDescription>
            {t("feedback.description")}
          </DialogDescription>
        </DialogHeader>
        
        {/* Feedback History Toggle */}
        {feedbackHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full justify-start"
          >
            {showHistory ? "Hide" : "Show"} your feedback history ({feedbackHistory.length})
          </Button>
        )}

        {/* Feedback History */}
        {showHistory && feedbackHistory.length > 0 && (
          <ScrollArea className="h-48 border rounded-lg p-2">
            <div className="space-y-3">
              {feedbackHistory.map((item) => (
                <div key={item.id} className="p-2 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, yyyy")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.status === "resolved" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= item.rating!
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm line-clamp-2">{item.message}</p>
                  
                  {/* Admin Response */}
                  {item.admin_response && (
                    <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
                      <div className="flex items-center gap-1 mb-1">
                        <Shield className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">Admin Response</span>
                        {item.admin_response_at && (
                          <span className="text-xs text-muted-foreground">
                            • {format(new Date(item.admin_response_at), "MMM d")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{item.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="py-2 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("feedback.rate")}
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
              placeholder={t("feedback.placeholder")}
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
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("common.submitting") : t("common.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};