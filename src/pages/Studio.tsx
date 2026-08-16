import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Upload, Play, Pause, Scissors, Loader2,
  Sparkles, Type, Music, Plus, Trash2, Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { checkCreatorProStatus } from "@/utils/storeItems";

type FilterPreset = {
  id: string;
  name: string;
  emoji: string;
  filter: string;
};

const FILTERS: FilterPreset[] = [
  { id: "none", name: "Original", emoji: "🎬", filter: "none" },
  { id: "vivid", name: "Vivid", emoji: "🌈", filter: "saturate(1.6) contrast(1.1)" },
  { id: "warm", name: "Warm", emoji: "🌅", filter: "sepia(0.3) saturate(1.3) hue-rotate(-10deg)" },
  { id: "cool", name: "Cool", emoji: "❄️", filter: "saturate(1.2) hue-rotate(15deg) brightness(1.05)" },
  { id: "mono", name: "Mono", emoji: "⚫", filter: "grayscale(1) contrast(1.1)" },
  { id: "vintage", name: "Vintage", emoji: "📼", filter: "sepia(0.5) contrast(0.95) brightness(1.05) saturate(0.9)" },
  { id: "dramatic", name: "Dramatic", emoji: "🎭", filter: "contrast(1.4) saturate(1.2) brightness(0.95)" },
  { id: "fade", name: "Fade", emoji: "🌫️", filter: "contrast(0.85) saturate(0.8) brightness(1.1)" },
  { id: "noir", name: "Noir", emoji: "🖤", filter: "grayscale(1) contrast(1.5) brightness(0.9)" },
  { id: "neon", name: "Neon", emoji: "💜", filter: "saturate(2) contrast(1.2) hue-rotate(280deg)" },
];

interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  size: number; // px
  color: string;
  bold: boolean;
}

const Studio = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [duration, setDuration] = useState(0);

  // New: filter / overlays / music
  const [filterId, setFilterId] = useState("none");
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [musicVolume, setMusicVolume] = useState(50);
  const [originalVolume, setOriginalVolume] = useState(100);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const access = await checkCreatorProStatus(user.id);
      if (!access) {
        toast.error("Creator Pro required to access Studio");
        navigate("/store");
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  // Sync music with video playback
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    const onPlay = () => { a.currentTime = v.currentTime; a.play().catch(() => {}); };
    const onPause = () => a.pause();
    const onSeek = () => { a.currentTime = v.currentTime; };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", onSeek);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", onSeek);
    };
  }, [musicUrl]);

  // Volume sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = originalVolume / 100;
  }, [originalVolume]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume / 100;
  }, [musicVolume]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleMusicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicFile(file);
    setMusicUrl(URL.createObjectURL(file));
    toast.success(`Added music: ${file.name}`);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const addOverlay = () => {
    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: "Your text",
      x: 50,
      y: 50,
      size: 32,
      color: "#ffffff",
      bold: true,
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  const currentFilter = FILTERS.find((f) => f.id === filterId)?.filter || "none";
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) || null;

  const resetAll = () => {
    setVideoUrl("");
    setVideoFile(null);
    setOverlays([]);
    setFilterId("none");
    setMusicFile(null);
    setMusicUrl("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-3xl mx-auto pb-24">
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
            {/* Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="relative w-full bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full block"
                    style={{ filter: currentFilter }}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                  />
                  {/* Text overlays */}
                  {overlays.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOverlayId(o.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none px-2 ${
                        selectedOverlayId === o.id ? "ring-2 ring-primary ring-offset-1" : ""
                      }`}
                      style={{
                        left: `${o.x}%`,
                        top: `${o.y}%`,
                        fontSize: `${o.size}px`,
                        color: o.color,
                        fontWeight: o.bold ? 700 : 400,
                        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.text}
                    </div>
                  ))}
                </div>
                {musicUrl && <audio ref={audioRef} src={musicUrl} loop />}

                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline" size="icon" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(duration)}s
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Editor tabs */}
            <Tabs defaultValue="trim" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="trim"><Scissors className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Trim</span></TabsTrigger>
                <TabsTrigger value="filters"><Sparkles className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Filters</span></TabsTrigger>
                <TabsTrigger value="text"><Type className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Text</span></TabsTrigger>
                <TabsTrigger value="music"><Music className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Music</span></TabsTrigger>
              </TabsList>

              {/* Trim */}
              <TabsContent value="trim">
                <Card>
                  <CardContent className="space-y-3 p-4">
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
              </TabsContent>

              {/* Filters */}
              <TabsContent value="filters">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilterId(f.id)}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                            filterId === f.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <span className="text-2xl">{f.emoji}</span>
                          <span className="font-medium">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Text */}
              <TabsContent value="text">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Button onClick={addOverlay} className="w-full gap-2" size="sm">
                      <Plus className="h-4 w-4" /> Add Text
                    </Button>

                    {overlays.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No text overlays yet. Add one to get started.
                      </p>
                    )}

                    {overlays.length > 0 && (
                      <div className="space-y-2">
                        {overlays.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setSelectedOverlayId(o.id)}
                            className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                              selectedOverlayId === o.id ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <span className="truncate">{o.text || "(empty)"}</span>
                            <Trash2
                              className="h-4 w-4 text-destructive shrink-0"
                              onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedOverlay && (
                      <div className="space-y-3 border-t pt-3">
                        <div>
                          <Label className="text-xs">Text</Label>
                          <Input
                            value={selectedOverlay.text}
                            onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Color</Label>
                            <Input
                              type="color"
                              value={selectedOverlay.color}
                              onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
                              className="h-10 p-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Style</Label>
                            <Select
                              value={selectedOverlay.bold ? "bold" : "regular"}
                              onValueChange={(v) => updateOverlay(selectedOverlay.id, { bold: v === "bold" })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Size: {selectedOverlay.size}px</Label>
                          <Slider
                            min={12} max={96} step={1}
                            value={[selectedOverlay.size]}
                            onValueChange={(v) => updateOverlay(selectedOverlay.id, { size: v[0] })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Horizontal: {selectedOverlay.x}%</Label>
                          <Slider
                            min={0} max={100} step={1}
                            value={[selectedOverlay.x]}
                            onValueChange={(v) => updateOverlay(selectedOverlay.id, { x: v[0] })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Vertical: {selectedOverlay.y}%</Label>
                          <Slider
                            min={0} max={100} step={1}
                            value={[selectedOverlay.y]}
                            onValueChange={(v) => updateOverlay(selectedOverlay.id, { y: v[0] })}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Music */}
              <TabsContent value="music">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="music-upload" className="cursor-pointer">
                        <Button asChild variant="outline" className="w-full gap-2">
                          <span>
                            <Music className="h-4 w-4" />
                            {musicFile ? musicFile.name : "Add Background Music"}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="music-upload"
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleMusicSelect}
                      />
                    </div>

                    {musicUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive"
                        onClick={() => { setMusicFile(null); setMusicUrl(""); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Music
                      </Button>
                    )}

                    <div className="space-y-3 border-t pt-3">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Volume2 className="h-3 w-3" /> Original Audio: {originalVolume}%
                        </Label>
                        <Slider
                          min={0} max={100} step={1}
                          value={[originalVolume]}
                          onValueChange={(v) => setOriginalVolume(v[0])}
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Music className="h-3 w-3" /> Music Volume: {musicVolume}%
                        </Label>
                        <Slider
                          min={0} max={100} step={1}
                          value={[musicVolume]}
                          onValueChange={(v) => setMusicVolume(v[0])}
                          disabled={!musicUrl}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Button className="w-full" onClick={() => {
              toast.info("Server-side video rendering with filters, text & music coming soon!");
            }}>
              Export Video
            </Button>

            <Button variant="outline" className="w-full" onClick={resetAll}>
              Choose Different Video
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Studio;
