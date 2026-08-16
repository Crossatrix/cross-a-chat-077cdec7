import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { storePendingInstantLink, InstantAction } from "@/utils/instantLinks";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

const VALID_ACTIONS: InstantAction[] = ["chat", "video", "music", "subcross"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Subcross may also be referenced by name (a-z, 0-9, _, 3-30 chars)
const NAME_RE = /^[a-z0-9_]{3,30}$/;

const InstantLink = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const action = params.get("action") as string | null;
    const id = params.get("id");

    if (!action && !id) {
      setError("This link is missing both an action and an ID. Please check the link and try again.");
      return;
    }
    if (!action) {
      setError("This link is missing the required action parameter (chat, video, music, or subcross).");
      return;
    }
    if (!VALID_ACTIONS.includes(action as InstantAction)) {
      setError(`Unknown action: "${action}". Allowed actions are: ${VALID_ACTIONS.join(", ")}.`);
      return;
    }
    if (!id || !id.trim()) {
      setError("This link is missing the required ID parameter.");
      return;
    }

    // Validate id shape per action
    const trimmedId = id.trim();
    const isUuid = UUID_RE.test(trimmedId);
    if (action === "subcross") {
      if (!isUuid && !NAME_RE.test(trimmedId)) {
        setError("Invalid subcross identifier. Expected a name (a-z, 0-9, _) or a valid ID.");
        return;
      }
    } else if (!isUuid) {
      setError(`Invalid ID for "${action}". Expected a valid identifier.`);
      return;
    }

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      storePendingInstantLink(action as InstantAction, trimmedId);
      if (!sess.session) {
        navigate("/auth", { replace: true });
        return;
      }
      navigate("/", { replace: true });
    })();
  }, [params, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">Invalid instant link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2 justify-center pt-2">
            <Button onClick={() => navigate("/", { replace: true })}>Go home</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Opening…</p>
      </div>
    </div>
  );
};

export default InstantLink;
