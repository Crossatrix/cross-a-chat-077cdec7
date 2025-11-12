import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ban, Clock, LogOut } from "lucide-react";

interface BanInfo {
  reason: string;
  created_at: string;
  expires_at: string | null;
}

const Banned = () => {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkBanStatus();
  }, []);

  const checkBanStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: ban } = await supabase
      .from("user_bans")
      .select("reason, created_at, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ban) {
      // Not banned, redirect to home
      navigate("/");
      return;
    }

    // Check if temporary ban has expired
    if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
      // Ban has expired, remove it and redirect
      await supabase.from("user_bans").delete().eq("user_id", user.id);
      navigate("/");
      return;
    }

    setBanInfo(ban);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!banInfo) {
    return null;
  }

  const isPermanent = !banInfo.expires_at;
  const expiryDate = banInfo.expires_at ? new Date(banInfo.expires_at) : null;
  const isExpired = expiryDate && expiryDate < new Date();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-destructive">
                Account {isPermanent ? "Banned" : "Temporarily Suspended"}
              </CardTitle>
              <CardDescription>
                Your account has been {isPermanent ? "permanently banned" : "temporarily suspended"} from Cross Chat
              </CardDescription>
            </div>
            {!isPermanent && expiryDate && (
              <Badge variant="destructive" className="gap-1">
                <Clock className="h-3 w-3" />
                {isExpired ? "Expired" : `Until ${expiryDate.toLocaleDateString()}`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Reason for {isPermanent ? "Ban" : "Suspension"}
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-foreground whitespace-pre-wrap">{banInfo.reason}</p>
              </CardContent>
            </Card>
          </div>

          {!isPermanent && expiryDate && !isExpired && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Suspension Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Suspended On</p>
                    <p className="font-semibold">{new Date(banInfo.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Expires On</p>
                    <p className="font-semibold">{expiryDate.toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              What You Can Do
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                {!isPermanent && expiryDate && !isExpired ? (
                  <>
                    <p className="text-sm">
                      • Your suspension will automatically expire on <strong>{expiryDate.toLocaleDateString()}</strong>
                    </p>
                    <p className="text-sm">
                      • You'll regain full access to your account after the suspension period
                    </p>
                  </>
                ) : (
                  <p className="text-sm">
                    • This is a permanent ban and will not expire automatically
                  </p>
                )}
                <p className="text-sm">
                  • If you believe this {isPermanent ? "ban" : "suspension"} is an error, contact support
                </p>
                <p className="text-sm">
                  • Review our community guidelines to understand our policies
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1"
              asChild
            >
              <a href="mailto:support@crosschat.app">Contact Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Banned;
