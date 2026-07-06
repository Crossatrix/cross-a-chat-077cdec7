import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Trash2, Package, Loader2 } from "lucide-react";
import {
  getInstalledMods,
  onModsUpdated,
  uninstallMod,
  downloadAndInstallMod,
  uploadModFile,
  isModEnabled,
  setModEnabled,
} from "@/utils/mods";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ModRow {
  id: string;
  name: string;
  description: string | null;
  author_id: string;
  file_url: string;
  downloads: number;
  created_at: string;
  author_username?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId?: string;
}

const ModStoreDialog = ({ open, onOpenChange, currentUserId }: Props) => {
  const [mods, setMods] = useState<ModRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState(getInstalledMods() || []);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("mods")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load mods");
      setLoading(false);
      return;
    }
    const modRows: ModRow[] = data || [];
    const authorIds = Array.from(new Set(modRows.map((m) => m.author_id).filter(Boolean)));
    if (authorIds.length > 0) {
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, username")
        .in("id", authorIds);
      const usernameMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));
      modRows.forEach((m) => {
        m.author_username = usernameMap.get(m.author_id) || "Unknown";
      });
    }
    setMods(modRows);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => onModsUpdated(() => setInstalled(getInstalledMods() || [])), []);

  const handleInstall = async (mod: ModRow) => {
    setInstalling(mod.id);
    try {
      await downloadAndInstallMod(mod);
      await (supabase as any).from("mods").update({ downloads: mod.downloads + 1 }).eq("id", mod.id);
      toast.success(`Installed ${mod.name}`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Install failed");
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (id: string, name: string) => {
    await uninstallMod(id);
    toast.success(`Uninstalled ${name}`);
  };

  const handleUpload = async () => {
    if (!currentUserId) return toast.error("Sign in required");
    if (!uploadFile) return toast.error("Select a .ccmod file");
    if (!uploadName.trim()) return toast.error("Name required");
    setUploading(true);
    try {
      const { path } = await uploadModFile(currentUserId, uploadFile);
      const { error } = await (supabase as any).from("mods").insert({
        name: uploadName.trim(),
        description: uploadDesc.trim() || null,
        author_id: currentUserId,
        file_url: path,
      });
      if (error) throw error;
      toast.success("Mod uploaded");
      setUploadName("");
      setUploadDesc("");
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Mod Store
          </DialogTitle>
          <DialogDescription>
            Install community mods (.ccmod files). Mods can add emojis and override textures.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse">
          <TabsList className="w-full">
            <TabsTrigger value="browse" className="flex-1">Browse</TabsTrigger>
            <TabsTrigger value="installed" className="flex-1">
              Installed ({installed.length})
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : mods.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No mods yet — be the first!</p>
            ) : (
              mods.map((m) => {
                const isInstalled = installed.some((i) => i.id === m.id);
                return (
                  <Card key={m.id}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{m.name}</p>
                        {m.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          by {m.author_username || "Unknown"} · {m.downloads} downloads
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleInstall(m)}
                        disabled={installing === m.id}
                        variant={isInstalled ? "secondary" : "default"}
                      >
                        {installing === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Download className="h-4 w-4 mr-1" /> {isInstalled ? "Reinstall" : "Install"}</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="installed" className="space-y-2">
            {installed.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No mods installed</p>
            ) : (
              installed.map((m) => {
                const enabled = isModEnabled(m.id);
                return (
                  <Card key={m.id} className={enabled ? "" : "opacity-60"}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{m.name}</p>
                        {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.emojis?.length ?? 0} emoji · {m.textures?.length ?? 0} texture · {m.ui?.length ?? 0} UI · {m.scripts?.length ?? 0} script · {m.triggers ?? 0} trigger
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`mod-${m.id}`} className="text-xs">
                            {enabled ? "Enabled" : "Disabled"}
                          </Label>
                          <Switch
                            id={`mod-${m.id}`}
                            checked={enabled}
                            onCheckedChange={(v) => setModEnabled(m.id, v)}
                          />
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleUninstall(m.id, m.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a <code>.ccmod</code> file (a zip with <code>mod.json</code> and optional
              <code> emojis/</code>, <code>textures/</code>, <code>UI/</code>, <code>scripts/</code> folders and
              a root <code>event.cctrigger</code> file).
            </p>
            <Input
              placeholder="Mod name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              maxLength={80}
            />
            <Textarea
              placeholder="Short description (optional)"
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              maxLength={500}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".ccmod,.zip,application/zip"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {uploadFile ? uploadFile.name.slice(0, 24) : "Select .ccmod"}
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ModStoreDialog;
