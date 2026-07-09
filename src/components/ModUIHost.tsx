import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { onModUIOpen, injectModUIBridge, type ModUIOpenDetail } from "@/utils/modEvents";

const ModUIHost = () => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ModUIOpenDetail | null>(null);

  useEffect(() => onModUIOpen((d) => { setDetail(d); setOpen(true); }), []);

  const srcDoc = useMemo(() => {
    if (!detail) return "";
    return injectModUIBridge(detail.html || "", detail.modId || "ui");
  }, [detail]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl h-[70vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm truncate">{detail?.title || "Mod UI"}</DialogTitle>
        </DialogHeader>
        <iframe
          key={(detail?.modId || "") + (detail?.title || "")}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="flex-1 w-full border-0"
          title="Mod UI"
        />
      </DialogContent>
    </Dialog>
  );
};

export default ModUIHost;
