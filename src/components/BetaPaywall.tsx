import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkBetaStatus, isPreviewDomain, purchaseBeta } from "@/utils/betaSubscription";
import { getBalance, getCrossatrixUserId } from "@/utils/croins";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FlaskConical, Loader2, LogOut } from "lucide-react";

interface Props {
  onUnlocked: () => void;
}

const BetaPaywall = ({ onUnlocked }: Props) => {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isPreviewDomain()) {
        onUnlocked();
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onUnlocked();
        return;
      }
      setUserId(user.id);
      const active = await checkBetaStatus(user.id);
      if (active) {
        onUnlocked();
        return;
      }
      const bal = await getBalance(getCrossatrixUserId(user.id));
      setBalance(bal);
      setLoading(false);
    })();
  }, [onUnlocked]);

  const handleBuy = async () => {
    if (!userId) return;
    setPurchasing(true);
    const res = await purchaseBeta(userId);
    setPurchasing(false);
    if (res.success) {
      toast.success(res.message);
      onUnlocked();
    } else {
      toast.error(res.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Cross Chat Beta Required</h1>
          <p className="text-sm text-muted-foreground">
            You're on the preview build. To continue, subscribe to Cross Chat Beta.
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-4">
          <div className="text-3xl font-bold text-primary">50 Croins</div>
          <div className="text-xs text-muted-foreground mt-1">per month</div>
        </div>
        <div className="text-sm">
          Your balance: <span className="font-semibold">{balance} Croins</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={handleBuy}
          disabled={purchasing || balance < 50}
        >
          {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Now"}
        </Button>
        {balance < 50 && (
          <p className="text-xs text-destructive">Not enough Croins to subscribe.</p>
        )}
        <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Log out
        </Button>
      </div>
    </div>
  );
};

export default BetaPaywall;
