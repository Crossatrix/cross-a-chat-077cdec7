import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { storePendingInstantLink, InstantAction } from "@/utils/instantLinks";

const InstantLink = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Opening...");

  useEffect(() => {
    const run = async () => {
      const action = params.get("action") as InstantAction | null;
      const id = params.get("id");
      if (!action || !id) {
        setMsg("Invalid link");
        setTimeout(() => navigate("/", { replace: true }), 1500);
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        storePendingInstantLink(action, id);
        navigate("/auth", { replace: true });
        return;
      }

      storePendingInstantLink(action, id);
      navigate("/", { replace: true });
    };
    run();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
};

export default InstantLink;
