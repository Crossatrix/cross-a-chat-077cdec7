import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { DeviceVerificationDialog } from "@/components/DeviceVerificationDialog";
import { getDeviceId } from "@/utils/deviceFingerprint";

const usernameSchema = z.string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationUserId, setVerificationUserId] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const navigate = useNavigate();

  // Set device fingerprint on mount
  useEffect(() => {
    setDeviceFingerprint(getDeviceId());
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const checkDeviceVerification = async (userId: string): Promise<{ required: boolean; email?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("send-device-verification/send", {
        body: {
          user_id: userId,
          device_fingerprint: deviceFingerprint,
        },
      });

      if (error) throw error;
      return { required: data.required, email: data.email };
    } catch (error) {
      console.error("Error checking device verification:", error);
      return { required: false };
    }
  };

  const proceedAfterLogin = async (userId: string) => {
    // Check if user is banned
    const { data: ban } = await supabase
      .from("user_bans")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (ban) {
      if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
        await supabase.from("user_bans").delete().eq("id", ban.id);
      } else {
        navigate("/banned");
        return;
      }
    }

    toast.success("Welcome back!");
    navigate("/");
  };

  const handleVerificationSuccess = async () => {
    setShowVerification(false);
    await proceedAfterLogin(verificationUserId);
  };

  const handleVerificationCancel = async () => {
    // Sign out since verification was cancelled
    await supabase.auth.signOut();
    setShowVerification(false);
    toast.error("Login cancelled - device verification required");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate username
      const usernameValidation = usernameSchema.safeParse(username);
      if (!usernameValidation.success) {
        toast.error(usernameValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Validate password only for signup
      if (!isLogin) {
        const passwordValidation = passwordSchema.safeParse(password);
        if (!passwordValidation.success) {
          toast.error(passwordValidation.error.errors[0].message);
          setLoading(false);
          return;
        }
      }

      // Generate valid internal email from username
      const email = `${usernameValidation.data.toLowerCase()}@internal.crosschat.app`;

      if (isLogin) {
        // Login
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        const userId = signInData.user?.id;
        if (!userId) throw new Error("No user ID returned");

        // Check if device verification is required
        const verificationResult = await checkDeviceVerification(userId);
        
        if (verificationResult.required) {
          setVerificationUserId(userId);
          setVerificationEmail(verificationResult.email || "");
          setShowVerification(true);
          setLoading(false);
          return;
        }
        
        await proceedAfterLogin(userId);
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: usernameValidation.data,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        
        // Check if user is banned (shouldn't happen for new signups, but just in case)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ban } = await supabase
            .from("user_bans")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (ban) {
            // Check if ban has expired
            if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
              // Ban has expired, remove it
              await supabase.from("user_bans").delete().eq("id", ban.id);
            } else {
              // Ban is still active, redirect to banned page
              setLoading(false);
              navigate("/banned");
              return;
            }
          }
        }
        
        toast.success("Account created! Welcome to Cross Chat!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-primary">
            Cross Chat
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isLogin ? "Welcome back!" : "Create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </CardContent>
      </Card>

      <DeviceVerificationDialog
        open={showVerification}
        onOpenChange={setShowVerification}
        userId={verificationUserId}
        maskedEmail={verificationEmail}
        deviceFingerprint={deviceFingerprint}
        onSuccess={handleVerificationSuccess}
        onCancel={handleVerificationCancel}
      />
    </div>
  );
};

export default Auth;