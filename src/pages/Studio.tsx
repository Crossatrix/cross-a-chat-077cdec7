import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Play, Pause, Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { checkCreatorProStatus } from "@/utils/storeItems";

const Studio = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const access = await checkCreatorProStatus(user.id);
      setHasAccess(access);
      if (!access) {
        toast.error("Creator Pro required to access Studio");
        navigate("/store");
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">🎬 Studio</h1>
      </div>

      <div className="space-y-4">
        {!videoUrl ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Upload a video to start editing</p>
              <Label htmlFor="studio-upload" className="cursor-pointer">
                <Button asChild>
                  <span>Select Video</span>
                </Button>
              </Label>
              <Input id="studio-upload" type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full rounded-lg"
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline" size="icon" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Duration: {Math.round(duration)}s
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scissors className="h-4 w-4" /> Trim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Start (s)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={trimEnd}
                      value={trimStart}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTrimStart(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">End (s)</Label>
                    <Input
                      type="number"
                      min={trimStart}
                      max={duration}
                      value={Math.round(trimEnd)}
                      onChange={(e) => setTrimEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {Math.round(trimEnd - trimStart)}s of {Math.round(duration)}s
                </p>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => {
              toast.info("Video trimming and export coming soon!");
            }}>
              Export Video
            </Button>

            <Button variant="outline" className="w-full" onClick={() => {
              setVideoUrl("");
              setVideoFile(null);
            }}>
              Choose Different Video
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Studio;
