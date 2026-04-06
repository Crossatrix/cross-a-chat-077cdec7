import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import proBadgeIcon from "@/assets/pro-badge.png";

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

const ProPromoAd = ({ elapsed, duration, onSkip }: { elapsed: number; duration: number; onSkip: () => void }) => {
  const canSkip = elapsed >= 10;
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col items-center justify-center text-center p-6">
      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
        AD
      </div>
      <img src={proBadgeIcon} alt="Pro" className="h-20 w-20 mb-4 animate-bounce" />
      <h2 className="text-white text-2xl font-bold mb-2">Cross Chat Pro</h2>
      <p className="text-blue-200 text-sm mb-1">Tired of ads?</p>
      <p className="text-white text-lg font-semibold mb-4">Get Pro for just 50 Croins/month!</p>
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">✅ No more ads</span>
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">✅ Exclusive badge</span>
      </div>
      <p className="text-blue-300 text-xs">Go to Settings → Pro to subscribe</p>
      <div className="absolute bottom-4 right-4">
        {canSkip ? (
          <Button size="sm" variant="secondary" className="gap-1 bg-white/20 hover:bg-white/30 text-white" onClick={onSkip}>
            <X className="h-4 w-4" /> Skip Ad
          </Button>
        ) : (
          <div className="bg-white/20 text-white text-xs px-3 py-1.5 rounded">
            Skip in {10 - elapsed}s
          </div>
        )}
      </div>
    </div>
  );
};

const AdPlayer = ({ ad, onAdComplete }: AdPlayerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProPromo = ad.id === "pro-promo";
  const isSkippable = ad.duration > 30 || isProPromo;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (isSkippable && next >= 10) setCanSkip(true);
        if (isProPromo && next >= ad.duration) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onAdComplete();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSkippable, isProPromo, ad.duration]);

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAdComplete();
  };

  const handleVideoEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAdComplete();
  };

  if (isProPromo) {
    return <ProPromoAd elapsed={elapsed} duration={ad.duration} onSkip={handleSkip} />;
  }

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
      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
        AD · {ad.category.toUpperCase()}
      </div>

      <div className="absolute bottom-4 right-4">
        {isSkippable ? (
          canSkip ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1 bg-background/80 hover:bg-background"
              onClick={handleSkip}
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

      {!isSkippable && (
        <div className="absolute bottom-4 right-4 bg-background/80 text-foreground text-xs px-3 py-1.5 rounded">
          Ad · {Math.max(0, Math.round(ad.duration - elapsed))}s
        </div>
      )}
    </div>
  );
};

export default AdPlayer;

// Built-in Cross Chat Pro promo ad
const PRO_PROMO_AD: Ad = {
  id: "pro-promo",
  title: "Cross Chat Pro",
  video_url: "",
  duration: 30,
  category: "medium",
};

// Utility: pick a random ad with weighted category selection
export async function pickRandomAd(supabase: any, isPro?: boolean): Promise<Ad | null> {
  // Pro users never see ads
  if (isPro) return null;

  // 10% chance
  if (Math.random() > 0.1) return null;

  const { data: dbAds } = await supabase.from("ads").select("*");
  const allAds: Ad[] = [...(dbAds || []), PRO_PROMO_AD];

  if (allAds.length === 0) return null;

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
