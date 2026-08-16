import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendCroinsGift } from "@/utils/memberships";
import { toast } from "sonner";
import { emitModEvent } from "@/utils/modEvents";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  streamId: string;
  fromUserId: string;
  toUserId: string;
}

const PRESETS = [5, 10, 25, 50, 100];

const SendCroinsDialog = ({ open, onOpenChange, streamId, fromUserId, toUserId }: Props) => {
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (amount < 1) { toast.error("Choose an amount"); return; }
    setSending(true);
    const res = await sendCroinsGift(fromUserId, toUserId, amount, "Livestream tip");
    if (!res.success) { toast.error(res.message); setSending(false); return; }
    await supabase.from("livestream_chat" as any).insert({
      stream_id: streamId, user_id: fromUserId,
      message: message.trim() || `Sent ${amount} Croins! 💎`,
      croins_gift: amount,
    });
    emitModEvent("sendcroins", { streamId, toUserId, amount });
    toast.success(res.message);
    setSending(false);
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gem className="h-5 w-5 text-yellow-500" /> Send Croins</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map(p => (
              <Button key={p} size="sm" variant={amount === p ? "default" : "outline"} onClick={() => setAmount(p)}>
                {p}
              </Button>
            ))}
          </div>
          <Input type="number" min={1} value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} />
          <Input placeholder="Optional message" value={message} onChange={e => setMessage(e.target.value)} maxLength={200} />
          <Button className="w-full" onClick={send} disabled={sending}>
            {sending ? "Sending..." : `Send ${amount} Croins`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendCroinsDialog;
