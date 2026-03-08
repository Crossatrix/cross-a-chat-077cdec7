import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Wrench, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Maintenance = () => {
  const [maintenanceUntil, setMaintenanceUntil] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: untilData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_until")
        .single();
      setMaintenanceUntil(untilData?.value || null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc("is_app_admin", { _user_id: user.id });
        setIsAdmin(!!data);
      }
      setChecking(false);
    };
    check();
  }, []);

  useEffect(() => {
    if (!maintenanceUntil) return;

    const update = () => {
      const diff = Math.max(0, new Date(maintenanceUntil).getTime() - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [maintenanceUntil]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

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

        {maintenanceUntil && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Time remaining</p>
            <div className="flex items-center justify-center gap-3">
              {[
                { value: pad(timeLeft.hours), label: "Hours" },
                { value: pad(timeLeft.minutes), label: "Min" },
                { value: pad(timeLeft.seconds), label: "Sec" },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-mono font-bold text-primary tabular-nums">
                      {unit.value}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                      {unit.label}
                    </span>
                  </div>
                  {i < 2 && <span className="text-2xl font-bold text-muted-foreground/50 -mt-4">:</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="pt-4">
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
