import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, FileImage, FileVideo, File as FileIcon, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CloudItem {
  id: string;
  name: string;
  is_folder: boolean;
  size: number;
  mime: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (file: File) => void;
  allowAny?: boolean;
}

const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crossi-cloud`;

async function call(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = localStorage.getItem("crossatrix_access_token");
  const uid = localStorage.getItem("crossatrix_user_id");
  if (!token || !uid) throw new Error("RELOGIN");
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ ...body, crossatrix_token: token, crossatrix_user_id: uid }),
  });
  if (res.status === 401) throw new Error("RELOGIN");
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Crossi Cloud error");
  }
  return res;
}

const isImage = (m: string | null) => !!m && ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(m);
const isVideo = (m: string | null) => !!m && m.startsWith("video/");
const fmt = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const CrossiCloudPicker = ({ open, onOpenChange, onPick, allowAny = false }: Props) => {
  const [stack, setStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Drive" }]);
  const [items, setItems] = useState<CloudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const current = stack[stack.length - 1];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setNeedLogin(false);
    call({ action: "list", folder_id: current.id })
      .then((r) => r.json())
      .then((d) => setItems(d.files || []))
      .catch((e) => (e.message === "RELOGIN" ? setNeedLogin(true) : toast.error(e.message)))
      .finally(() => setLoading(false));
  }, [open, current.id]);

  const pick = async (it: CloudItem) => {
    if (it.is_folder) return setStack((s) => [...s, { id: it.id, name: it.name }]);
    if (it.size > 50 * 1024 * 1024) return toast.error("File must be less than 50MB");
    if (!allowAny && isImage(it.mime) && it.size > 5 * 1024 * 1024) return toast.error("Image must be less than 5MB");
    setDownloading(it.id);
    try {
      const res = await call({ action: "download", file_id: it.id });
      const blob = await res.blob();
      onPick(new File([blob], it.name, { type: it.mime || blob.type || "application/octet-stream" }));
      onOpenChange(false);
    } catch (e: any) {
      e.message === "RELOGIN" ? setNeedLogin(true) : toast.error(e.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stack.length > 1 && (
              <Button size="icon" variant="ghost" onClick={() => setStack((s) => s.slice(0, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="truncate">Crossi Cloud · {current.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {needLogin ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Please sign out and sign in again with Crossatrix to use Crossi Cloud.
            </p>
          ) : loading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">This folder is empty.</p>
          ) : (
            items.map((it) => {
              const usable = allowAny || it.is_folder || isImage(it.mime) || isVideo(it.mime);
              const Icon = it.is_folder ? Folder : isImage(it.mime) ? FileImage : isVideo(it.mime) ? FileVideo : FileIcon;
              return (
                <button
                  key={it.id}
                  type="button"
                  disabled={!usable || !!downloading}
                  onClick={() => pick(it)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left disabled:opacity-40"
                  title={usable ? undefined : "Only images and videos can be sent"}
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm" data-no-translate>{it.name}</span>
                  {downloading === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    !it.is_folder && <span className="text-xs text-muted-foreground">{fmt(it.size)}</span>}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrossiCloudPicker;
