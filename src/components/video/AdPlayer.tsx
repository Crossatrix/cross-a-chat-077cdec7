import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  video_url: string;
  duration: number;
  category: string;
}

interface AdPlayerProps {
  ad: Ad;
  onAdComplete: () => void;
}

const AdPlayer = ({ ad, onAdComplete }: AdPlayerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSkippable = ad.duration > 30;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (isSkippable && next >= 10) setCanSkip(true);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSkippable]);

  const handleVideoEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAdComplete();
  };

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={videoRef}
        src={ad.video_url}
        autoPlay
        playsInline
        onEnded={handleVideoEnd}
        className="w-full h-full object-contain"
      />
      {/* Ad label */}
      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
        AD · {ad.category.toUpperCase()}
      </div>

      {/* Skip / countdown */}
      <div className="absolute bottom-4 right-4">
        {isSkippable ? (
          canSkip ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1 bg-background/80 hover:bg-background"
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onAdComplete();
              }}
            >
              <X className="h-4 w-4" /> Skip Ad
            </Button>
          ) : (
            <div className="bg-background/80 text-foreground text-xs px-3 py-1.5 rounded">
              Skip in {10 - elapsed}s
            </div>
          )
        ) : null}
      </div>

      {/* Non-skippable short timer */}
      {!isSkippable && (
        <div className="absolute bottom-4 right-4 bg-background/80 text-foreground text-xs px-3 py-1.5 rounded">
          Ad · {Math.max(0, Math.round(ad.duration - elapsed))}s
        </div>
      )}
    </div>
  );
};

export default AdPlayer;

// Utility: pick a random ad with weighted category selection
export async function pickRandomAd(supabase: any, isPro?: boolean): Promise<Ad | null> {
  // Pro users never see ads
  if (isPro) return null;

  // 10% chance
  if (Math.random() > 0.1) return null;

  const { data: allAds } = await supabase.from("ads").select("*");
  if (!allAds || allAds.length === 0) return null;

  // Categorize
  const short = allAds.filter((a: Ad) => a.category === "short");
  const medium = allAds.filter((a: Ad) => a.category === "medium");
  const long = allAds.filter((a: Ad) => a.category === "long");
  const xl = allAds.filter((a: Ad) => a.category === "xl");

  // Weighted pick: 50% short, 30% medium, 15% long, 5% xl
  const roll = Math.random();
  let pool: Ad[];
  if (roll < 0.5) pool = short;
  else if (roll < 0.8) pool = medium;
  else if (roll < 0.95) pool = long;
  else pool = xl;

  // Fallback if chosen pool is empty
  if (pool.length === 0) pool = allAds;

  return pool[Math.floor(Math.random() * pool.length)];
}
