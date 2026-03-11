import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import starRequestIcon from "@/assets/stars/star_request.png";
import starGreyIcon from "@/assets/stars/star_grey.png";
import starSendIcon from "@/assets/stars/star_send.png";
import starYellowIcon from "@/assets/stars/star_yellow.png";
import starRequestSentIcon from "@/assets/stars/star_request_sent.png";

interface VideoStarRatingProps {
  videoId: string;
  currentUserId: string;
  isElderModOrAbove: boolean;
}

const VideoStarRating = ({ videoId, currentUserId, isElderModOrAbove }: VideoStarRatingProps) => {
  const [avgRating, setAvgRating] = useState(0);
  const [staffRating, setStaffRating] = useState<number | null>(null);
  const [staffRatedBy, setStaffRatedBy] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [videoId]);

  const fetchRatings = async () => {
    const { data: videoData } = await supabase
      .from("videos")
      .select("staff_rating, staff_rated_by")
      .eq("id", videoId)
      .single();

    if (videoData) {
      setStaffRating(videoData.staff_rating);
      setStaffRatedBy(videoData.staff_rated_by);
    }

    const { data: ratings } = await supabase
      .from("video_ratings" as any)
      .select("rating, user_id")
      .eq("video_id", videoId);

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
      setAvgRating(Math.round(sum / ratings.length));
      setRatingCount(ratings.length);
      const mine = ratings.find((r: any) => r.user_id === currentUserId);
      setUserRating(mine ? (mine as any).rating : null);
    } else {
      setAvgRating(0);
      setRatingCount(0);
      setUserRating(null);
    }
  };

  const handleOpenRateDialog = () => {
    if (userRating !== null) return;
    setSelectedStars(0);
    setDialogOpen(true);
  };

  const handleOpenStaffDialog = () => {
    setSelectedStars(0);
    setStaffDialogOpen(true);
  };

  const handleSubmitCommunityRating = async () => {
    if (selectedStars < 1 || selectedStars > 5) return;
    setLoading(true);
    await supabase
      .from("video_ratings" as any)
      .upsert(
        { video_id: videoId, user_id: currentUserId, rating: selectedStars },
        { onConflict: "video_id,user_id" }
      );
    setUserRating(selectedStars);
    toast.success(`Rated ${selectedStars} stars`);
    setDialogOpen(false);
    setLoading(false);
    fetchRatings();
  };

  const handleSubmitStaffRating = async () => {
    if (selectedStars < 1 || selectedStars > 5) return;
    setLoading(true);
    await supabase
      .from("videos")
      .update({ staff_rating: selectedStars, staff_rated_by: currentUserId })
      .eq("id", videoId);
    setStaffRating(selectedStars);
    setStaffRatedBy(currentUserId);
    toast.success(`Staff rating set to ${selectedStars} stars`);
    setStaffDialogOpen(false);
    setLoading(false);
    fetchRatings();
  };

  const handleUnrate = async () => {
    setLoading(true);
    await supabase
      .from("videos")
      .update({ staff_rating: null, staff_rated_by: null })
      .eq("id", videoId);
    setStaffRating(null);
    setStaffRatedBy(null);
    setStaffDialogOpen(false);
    setLoading(false);
    toast.success("Staff rating removed");
    fetchRatings();
  };

  const displayRating = staffRating ?? avgRating;
  const isStaffRated = staffRating !== null;
  const hasUserRated = userRating !== null;
  const isCommunityButtonDisabled = hasUserRated || isStaffRated;

  return (
    <div className="flex items-center gap-1.5">
      {/* Star display */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <img
            key={star}
            src={star <= displayRating ? starYellowIcon : starGreyIcon}
            alt={`${star} star`}
            className="h-4 w-4"
            style={!isStaffRated && star <= displayRating ? { filter: "hue-rotate(0deg) saturate(0.4) brightness(1.2)" } : undefined}
          />
        ))}
      </div>

      {ratingCount > 0 && !isStaffRated && (
        <span className="text-[10px] text-muted-foreground">({ratingCount})</span>
      )}
      {isStaffRated && (
        <span className="text-[10px] text-primary font-semibold">★</span>
      )}

      {/* Community rate button (for everyone including admins) */}
      <button
        onClick={handleOpenRateDialog}
        disabled={isCommunityButtonDisabled}
        className={`shrink-0 transition-opacity ${isCommunityButtonDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
      >
        <img
          src={hasUserRated ? starRequestSentIcon : starRequestIcon}
          alt="Rate"
          className="h-5 w-5"
        />
      </button>

      {/* Staff lock button (only for elder mods / admins) */}
      {isElderModOrAbove && (
        <button
          onClick={handleOpenStaffDialog}
          className="shrink-0 transition-opacity hover:opacity-80 cursor-pointer"
        >
          <img
            src={starSendIcon}
            alt="Staff Rate"
            className="h-5 w-5"
          />
        </button>
      )}

      {/* Community Rating Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Rate Video</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedStars(star)}
                className="transition-transform hover:scale-110"
              >
                <img
                  src={star <= selectedStars ? starYellowIcon : starGreyIcon}
                  alt={`${star} star`}
                  className="h-8 w-8"
                />
              </button>
            ))}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmitCommunityRating} disabled={selectedStars < 1 || loading} className="flex-1">
              {loading ? "..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Rating Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Staff Rating</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedStars(star)}
                className="transition-transform hover:scale-110"
              >
                <img
                  src={star <= selectedStars ? starYellowIcon : starGreyIcon}
                  alt={`${star} star`}
                  className="h-8 w-8"
                />
              </button>
            ))}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmitStaffRating} disabled={selectedStars < 1 || loading} className="flex-1">
              {loading ? "..." : "Lock Rating"}
            </Button>
            {isStaffRated && (
              <Button variant="destructive" onClick={handleUnrate} disabled={loading} className="flex-1">
                Unrate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoStarRating;
