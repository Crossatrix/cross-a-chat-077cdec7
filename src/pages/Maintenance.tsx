import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Wrench, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Maintenance = () => {
  const [maintenanceUntil, setMaintenanceUntil] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      // Get maintenance end time
      const { data: untilData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_until")
        .single();
      setMaintenanceUntil(untilData?.value || null);

      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc("is_app_admin", { _user_id: user.id });
        setIsAdmin(!!data);
      }
      setChecking(false);
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const timeLeft = maintenanceUntil
    ? new Date(maintenanceUntil).getTime() - Date.now()
    : null;
  const hoursLeft = timeLeft ? Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60))) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-flex">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>
        <p className="text-muted-foreground text-lg">
          We're currently performing maintenance to improve your experience. Please check back soon!
        </p>

        {hoursLeft !== null && hoursLeft > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Estimated time remaining</p>
            <p className="text-2xl font-bold text-primary">
              ~{hoursLeft} {hoursLeft === 1 ? "hour" : "hours"}
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-2 pt-4">
            <Button onClick={() => navigate("/admin")} className="w-full gap-2">
              <Shield className="h-4 w-4" />
              Go to Admin Panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Maintenance;
