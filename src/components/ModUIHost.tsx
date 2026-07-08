import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { onModUIOpen, type ModUIOpenDetail } from "@/utils/modEvents";

/** Injected into every mod UI iframe so HTML can call `mod.readMessages(...)` etc. via postMessage. */
const BRIDGE = (modId: string) => `<script>
(function(){
  var _id = 0, _pending = {};
  window.addEventListener('message', function(ev){
    var d = ev.data; if (!d || !d.__mod || typeof d.id !== 'number') return;
    var p = _pending[d.id]; if (!p) return;
    delete _pending[d.id];
    if ('error' in d) p.reject(new Error(d.error)); else p.resolve(d.result);
  });
  function call(method){
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function(resolve, reject){
      var id = ++_id; _pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ __mod: true, id: id, method: method, args: args, modId: ${JSON.stringify(modId)} }, '*');
    });
  }
  var methods = ['toast','log','alert','currentUser','currentProfile','readMessages',
    'listConversations','sendMessage','emit'];
  var mod = { modId: ${JSON.stringify(modId)} };
  methods.forEach(function(m){ mod[m] = function(){ return call.apply(null, [m].concat([].slice.call(arguments))); }; });
  window.mod = mod;
})();
</script>`;

const ModUIHost = () => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ModUIOpenDetail | null>(null);

  useEffect(() => onModUIOpen((d) => { setDetail(d); setOpen(true); }), []);

  const srcDoc = useMemo(() => {
    if (!detail) return "";
    const bridge = BRIDGE(detail.modId || "ui");
    const html = detail.html || "";
    // Inject bridge before </head> or at the top of the document.
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, bridge + "</head>");
    return bridge + html;
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
