import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { getBetaScamEnabled } from "./BetaDialog";

interface Props {
  conversationId: string | null;
  currentUserDbId: string | undefined;
  otherUserId: string | undefined;
  isGroup: boolean;
  isAIChat: boolean;
  enabled: boolean; // beta active
}

const MIN_MSGS = 2;
const MAX_MSGS = 5;
const ANALYZE_DELAY_MS = 8000;
const AI_BOT_ID = "00000000-0000-0000-0000-000000000000";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

const ScamDetector = ({ conversationId, currentUserDbId, otherUserId, isGroup, isAIChat, enabled }: Props) => {
  const [warning, setWarning] = useState<{ reason: string; confidence: number } | null>(null);
  const collected = useRef<string[]>([]);
  const analyzed = useRef(false);

  useEffect(() => {
    collected.current = [];
    analyzed.current = false;
    setWarning(null);

    if (!enabled || !getBetaScamEnabled()) return;
    if (!conversationId || !currentUserDbId || !otherUserId) return;
    if (isGroup || isAIChat) return;
    if (otherUserId === AI_BOT_ID || otherUserId === SYSTEM_USER_ID) return;

    const doneKey = `scam_done:${conversationId}`;
    if (localStorage.getItem(doneKey) === "1") return;

    let cancelled = false;

    const analyze = async () => {
      if (analyzed.current) return;
      if (collected.current.length < MIN_MSGS) return;
      analyzed.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("beta-scam-check", {
          body: { messages: collected.current.slice(0, MAX_MSGS) },
        });
        if (cancelled) return;
        if (error) { console.error("scam check failed", error); analyzed.current = false; return; }
        localStorage.setItem(doneKey, "1");
        if (data?.scam && Number(data.confidence) >= 50) {
          setWarning({ reason: data.reason || "Possible scam detected.", confidence: Number(data.confidence) });
        }
      } catch (e) {
        console.error("scam check failed", e);
        analyzed.current = false;
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleAnalyze = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { analyze(); }, ANALYZE_DELAY_MS);
    };

    const setup = async () => {
      // If the current user has ever sent a message in this conversation, this is not a "first contact" — skip.
      const { data: ownMsgs } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserDbId)
        .limit(1);
      if (cancelled) return;
      if (ownMsgs && ownMsgs.length > 0) {
        localStorage.setItem(doneKey, "1");
        return;
      }

      // Pull existing messages from the other user (up to MAX_MSGS).
      const { data: incoming } = await supabase
        .from("messages")
        .select("content, created_at, user_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", otherUserId)
        .order("created_at", { ascending: true })
        .limit(MAX_MSGS);
      if (cancelled) return;
      collected.current = (incoming || [])
        .map((m: any) => String(m.content || ""))
        .filter((c) => c.length > 0)
        .slice(0, MAX_MSGS);

      if (collected.current.length >= MAX_MSGS) {
        await analyze();
        return;
      }
      if (collected.current.length >= MIN_MSGS) {
        scheduleAnalyze();
      }

      // Subscribe for more incoming messages from the other user.
      const channel = supabase
        .channel(`scam-${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          async (payload: any) => {
            const row = payload?.new;
            if (!row) return;
            // If current user sends something, abort.
            if (row.user_id === currentUserDbId) {
              localStorage.setItem(doneKey, "1");
              analyzed.current = true;
              if (timer) clearTimeout(timer);
              supabase.removeChannel(channel);
              return;
            }
            if (row.user_id !== otherUserId) return;
            const content = String(row.content || "");
            if (content) collected.current.push(content);
            if (collected.current.length >= MAX_MSGS) {
              if (timer) clearTimeout(timer);
              await analyze();
              supabase.removeChannel(channel);
            } else if (collected.current.length >= MIN_MSGS) {
              scheduleAnalyze();
            }
          }
        )
        .subscribe();

      return () => {
        if (timer) clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setup();
    return () => {
      cancelled = true;
      Promise.resolve(cleanupPromise).then((fn) => { if (typeof fn === "function") fn(); });
    };
  }, [conversationId, currentUserDbId, otherUserId, isGroup, isAIChat, enabled]);

  if (!warning) return null;



  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) setWarning(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Possible scam detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>
              Cross Chat Beta's Scam Detector flagged this new contact's messages
              (confidence {warning.confidence}%).
            </div>
            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
              {warning.reason}
            </div>
            <div className="text-xs text-muted-foreground">
              Be careful with money, links, personal info or anything that feels urgent.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setWarning(null)}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ScamDetector;
