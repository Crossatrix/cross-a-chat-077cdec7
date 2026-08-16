import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Radio, Trash2 } from "lucide-react";

interface Row {
  user_id: string;
  username?: string;
}

export default function RadioBroadcasterManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("radio_broadcasters").select("user_id");
    const ids = (data || []).map((r: any) => r.user_id);
    if (ids.length === 0) return setRows([]);
    const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
    const map = new Map((profs || []).map((p: any) => [p.id, p.username]));
    setRows(ids.map((id) => ({ user_id: id, username: map.get(id) })));
  };

  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!q.trim()) return;
    const { data: prof } = await supabase.from("profiles").select("id").eq("username", q.trim()).maybeSingle();
    if (!prof) return toast.error("User not found");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("radio_broadcasters").insert({ user_id: (prof as any).id, granted_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Granted");
    setQ("");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("radio_broadcasters").delete().eq("user_id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Radio className="h-4 w-4" /> Radio Broadcasters</h3>
      <div className="flex gap-2">
        <Input placeholder="Username" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" onClick={grant}>Grant</Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
            <div className="flex-1 text-sm">{r.username || r.user_id}</div>
            <Button size="icon" variant="ghost" onClick={() => revoke(r.user_id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No broadcasters</p>}
      </div>
    </div>
  );
}
