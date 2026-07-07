import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio as RadioIcon, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface NowPlaying {
  song_id: string | null;
  started_at: string | null;
  news_text: string | null;
  news_started_at: string | null;
}

interface SongInfo {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number;
}

async function signPath(bucket: string, path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}

export default function RadioPlayer() {
  const [state, setState] = useState<NowPlaying | null>(null);
  const [song, setSong] = useState<SongInfo | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [lastNewsAt, setLastNewsAt] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch state
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("radio_now_playing")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (alive && data) setState(data as any);
    };
    load();
    const ch = supabase
      .channel("radio-now-playing")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "radio_now_playing" },
        (payload) => setState(payload.new as any)
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // Load song info when song_id changes
  useEffect(() => {
    if (!state?.song_id) {
      setSong(null);
      setAudioUrl(null);
      setCoverUrl(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("radio_songs")
        .select("*")
        .eq("id", state.song_id!)
        .maybeSingle();
      if (!alive || !data) return;
      setSong(data as any);
      const [a, c] = await Promise.all([
        signPath("radio-audio", (data as any).audio_url),
        (data as any).cover_url ? signPath("radio-covers", (data as any).cover_url) : Promise.resolve(null),
      ]);
      if (!alive) return;
      setAudioUrl(a);
      setCoverUrl(c);
    })();
    return () => {
      alive = false;
    };
  }, [state?.song_id]);

  // Sync audio playback with server-started_at offset
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl || !state?.started_at) return;
    const offset = Math.max(0, (Date.now() - new Date(state.started_at).getTime()) / 1000);
    a.src = audioUrl;
    const onLoaded = () => {
      try {
        a.currentTime = Math.min(offset, (a.duration || 0) - 0.1);
        a.play().catch(() => {});
      } catch {}
    };
    a.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => a.removeEventListener("loadedmetadata", onLoaded);
  }, [audioUrl, state?.started_at]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Speak news when news_started_at changes
  useEffect(() => {
    if (!state?.news_text || !state?.news_started_at) return;
    if (state.news_started_at === lastNewsAt) return;
    setLastNewsAt(state.news_started_at);
    // ignore very old news (>2 min)
    if (Date.now() - new Date(state.news_started_at).getTime() > 120_000) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      // Duck audio during news
      const a = audioRef.current;
      const prevVol = a?.volume ?? volume;
      if (a) a.volume = Math.min(prevVol, 0.15);
      const u = new SpeechSynthesisUtterance(`Radio News. ${state.news_text}`);
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => {
        if (a) a.volume = volume;
      };
      synth.cancel();
      synth.speak(u);
    } catch {}
  }, [state?.news_started_at, state?.news_text, lastNewsAt, volume]);

  const isLive = !!state?.song_id;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <RadioIcon className="h-5 w-5 text-primary animate-pulse" />
        <span className="text-sm font-semibold">Cross Radio {isLive && <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE</span>}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <RadioIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{song?.title || "Waiting for broadcast..."}</div>
          <div className="text-sm text-muted-foreground truncate">{song?.artist || ""}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

      <div className="mt-3">
        <Slider value={[volume * 100]} onValueChange={(v) => setVolume(v[0] / 100)} max={100} step={1} />
      </div>

      {state?.news_text && state.news_started_at && Date.now() - new Date(state.news_started_at).getTime() < 60_000 && (
        <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
          <div className="font-bold text-primary mb-1">📢 News</div>
          <div>{state.news_text}</div>
        </div>
      )}

      <audio ref={audioRef} autoPlay />
    </div>
  );
}
