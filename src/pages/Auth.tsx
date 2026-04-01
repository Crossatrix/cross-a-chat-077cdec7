import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Brain, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [oldUsername, setOldUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [migrateUserId, setMigrateUserId] = useState("");
  const [migrateLoading, setMigrateLoading] = useState(false);
  const navigate = useNavigate();
  const version = useAppVersion();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/");
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crossatrix-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Set the session locally
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // Check if user is banned
        const { data: ban } = await supabase
          .from("user_bans")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (ban) {
          if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
            await supabase.from("user_bans").delete().eq("id", ban.id);
          } else {
            navigate("/banned");
            return;
          }
        }

        toast.success(data.is_new ? "Welcome to Cross Chat!" : "Welcome back!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setMigrateLoading(true);

    try {
      // First, try to sign in with old credentials to get user ID
      const oldEmail = `${oldUsername.toLowerCase().trim()}@internal.crosschat.app`;
      const { data: oldSignIn, error: oldError } = await supabase.auth.signInWithPassword({
        email: oldEmail,
        password: oldPassword,
      });

      if (oldError) {
        throw new Error("Invalid old account credentials");
      }

      const userId = oldSignIn.user.id;
      setMigrateUserId(userId);

      // Sign out of the old account
      await supabase.auth.signOut();

      toast.success("Old account verified! Your User ID has been copied.");
      navigator.clipboard.writeText(userId).catch(() => {});
    } catch (error: any) {
      toast.error(error.message || "Failed to verify old account");
    } finally {
      setMigrateLoading(false);
    }
  };

  const handleMigrateLogin = async () => {
    if (!email || !password || !migrateUserId) {
      toast.error("Please enter your Crossatrix email and password, and verify your old account first");
      return;
    }
    setMigrateLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crossatrix-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email, password, migrate_user_id: migrateUserId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Migration login failed");

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Account migrated successfully! Welcome back!");
        setShowMigration(false);
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Migration failed");
    } finally {
      setMigrateLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3">
              <Brain className="h-14 w-14 text-[#00AADD]" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Cross Chat</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your Crossatrix Account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#00AADD] hover:bg-[#0099CC] text-white font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In with Crossatrix"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="https://crossatrix.lovable.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00AADD] hover:underline text-sm inline-flex items-center gap-1"
            >
              Don't have an account? Create one at Crossatrix
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <Separator className="my-4" />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowMigration(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              Had an old account? Migrate here
            </button>
          </div>
        </CardContent>
      </Card>

      {version && (
        <p className="absolute bottom-3 left-3 text-xs text-muted-foreground">v{version}</p>
      )}

      {/* Migration Dialog */}
      <Dialog open={showMigration} onOpenChange={setShowMigration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Migrate Old Account</DialogTitle>
            <DialogDescription>
              Verify your old Cross Chat account to get your User ID, then create a Crossatrix account and sign in to migrate your data.
            </DialogDescription>
          </DialogHeader>

          {!migrateUserId ? (
            <form onSubmit={handleMigration} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Step 1: Enter your old Cross Chat credentials
              </p>
              <div className="space-y-2">
                <Label htmlFor="old-username">Old Username</Label>
                <Input
                  id="old-username"
                  type="text"
                  placeholder="Your old username"
                  value={oldUsername}
                  onChange={(e) => setOldUsername(e.target.value)}
                  required
                  disabled={migrateLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="old-password">Old Password</Label>
                <Input
                  id="old-password"
                  type="password"
                  placeholder="Your old password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={migrateLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={migrateLoading}>
                {migrateLoading ? "Verifying..." : "Verify Old Account"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Your User ID:</p>
                <code className="text-xs break-all select-all">{migrateUserId}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(migrateUserId);
                    toast.success("User ID copied!");
                  }}
                >
                  Copy User ID
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>Step 2: Go to Crossatrix and create an account with this User ID.</p>
                <a
                  href="https://crossatrix.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00AADD] hover:underline inline-flex items-center gap-1"
                >
                  Open Crossatrix <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Step 3: Sign in with your new Crossatrix account to complete migration
                </p>
                <div className="space-y-2">
                  <Label htmlFor="migrate-email">Crossatrix Email</Label>
                  <Input
                    id="migrate-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={migrateLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="migrate-password">Crossatrix Password</Label>
                  <Input
                    id="migrate-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={migrateLoading}
                  />
                </div>
                <Button
                  className="w-full bg-[#00AADD] hover:bg-[#0099CC] text-white"
                  onClick={handleMigrateLogin}
                  disabled={migrateLoading}
                >
                  {migrateLoading ? "Migrating..." : "Sign In & Migrate"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
