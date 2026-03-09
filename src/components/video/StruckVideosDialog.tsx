import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Send, Clock, CheckCircle, XCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StruckVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  moderation_reason: string | null;
  appeal_status: string;
  created_at: string;
}

interface StruckVideosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onRefresh?: () => void;
}

const StruckVideosDialog = ({ open, onOpenChange, userId, onRefresh }: StruckVideosDialogProps) => {
  const [struckVideos, setStruckVideos] = useState<StruckVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) fetchStruckVideos();
  }, [open]);

  const fetchStruckVideos = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("videos")
      .select("id, title, description, video_url, thumbnail_url, category, created_at")
      .eq("user_id", userId)
      .eq("moderation_status" as any, "struck")
      .order("created_at", { ascending: false }) as any);

    // Also fetch appeal_status and moderation_reason via a second query since types may not include them
    if (data && data.length > 0) {
      const ids = data.map((v: any) => v.id);
      const { data: fullData } = await (supabase
        .from("videos")
        .select("id, moderation_reason, appeal_status")
        .in("id", ids) as any);

      const reasonMap = new Map<string, any>();
      (fullData || []).forEach((v: any) => reasonMap.set(v.id, v));

      setStruckVideos(data.map((v: any) => ({
        ...v,
        moderation_reason: reasonMap.get(v.id)?.moderation_reason || null,
        appeal_status: reasonMap.get(v.id)?.appeal_status || 'none',
      })));
    } else {
      setStruckVideos([]);
    }
    setLoading(false);
  };

  const handleAppeal = async (videoId: string) => {
    const { error } = await (supabase
      .from("videos")
      .update({ appeal_status: 'pending' } as any)
      .eq("id", videoId) as any);

    if (error) {
      toast.error("Failed to send appeal");
      return;
    }

    toast.success("Appeal sent to staff for review!");
    fetchStruckVideos();
  };

  const getAppealBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-destructive border-destructive gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Struck Videos
          </DialogTitle>
          <DialogDescription>
            These videos were flagged by our AI content analyzer. You can send them for staff review.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : struckVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No struck videos! 🎉</p>
          ) : (
            <div className="space-y-3">
              {struckVideos.map((video) => (
                <div key={video.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="relative w-20 h-14 bg-muted rounded overflow-hidden shrink-0">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium line-clamp-1">{video.title}</h4>
                      <p className="text-xs text-muted-foreground">{new Date(video.created_at).toLocaleDateString()}</p>
                      {getAppealBadge(video.appeal_status)}
                    </div>
                  </div>

                  {video.moderation_reason && (
                    <div className="bg-destructive/10 rounded p-2 text-xs text-destructive">
                      <strong>Reason:</strong> {video.moderation_reason}
                    </div>
                  )}

                  {video.appeal_status === 'none' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleAppeal(video.id)}
                    >
                      <Send className="h-3 w-3" />
                      Send to Staff for Review
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StruckVideosDialog;
