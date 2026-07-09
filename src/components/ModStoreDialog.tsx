import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Trash2, Package, Loader2, Search, RefreshCw } from "lucide-react";
import {
  getInstalledMods,
  onModsUpdated,
  uninstallMod,
  downloadAndInstallMod,
  uploadModFile,
  updateModFile,
  isModEnabled,
  setModEnabled,
} from "@/utils/mods";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ModRow {
  id: string;
  name: string;
  description: string | null;
  author_id: string;
  file_url: string;
  downloads: number;
  created_at: string;
  updated_at: string;
  author_username?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId?: string;
}

type SortKey = "downloads" | "newest" | "name";

const ModStoreDialog = ({ open, onOpenChange, currentUserId }: Props) => {
  const [mods, setMods] = useState<ModRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingMod, setUpdatingMod] = useState<string | null>(null);
  const [installed, setInstalled] = useState(getInstalledMods() || []);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("downloads");
  const fileRef = useRef<HTMLInputElement>(null);
  const updateFileRef = useRef<HTMLInputElement>(null);
  const [updateTargetMod, setUpdateTargetMod] = useState<ModRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("mods")
      .select("*")
      .order("downloads", { ascending: false });
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
        m.author_username = (usernameMap.get(m.author_id) as string) || "Unknown";
      });
    }
    setMods(modRows);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);
  useEffect(() => onModsUpdated(() => setInstalled(getInstalledMods() || [])), []);

  const visibleMods = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = mods;
    if (q) arr = arr.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q) ||
      (m.author_username || "").toLowerCase().includes(q));
    arr = [...arr];
    if (sort === "downloads") arr.sort((a, b) => b.downloads - a.downloads);
    else if (sort === "newest") arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [mods, search, sort]);

  const installedById = useMemo(() => {
    const m = new Map<string, typeof installed[number]>();
    installed.forEach((i) => m.set(i.id, i));
    return m;
  }, [installed]);

  const hasUpdate = (mod: ModRow) => {
    const local = installedById.get(mod.id);
    if (!local?.installed_at) return false;
    return +new Date(mod.updated_at) > +new Date(local.installed_at);
  };

  const handleInstall = async (mod: ModRow) => {
    setInstalling(mod.id);
    try {
      await downloadAndInstallMod(mod);
      await (supabase as any).from("mods").update({ downloads: mod.downloads + 1 }).eq("id", mod.id);
      toast.success(`Installed ${mod.name}`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Install failed");
    } finally { setInstalling(null); }
  };

  const handleUninstall = async (id: string, name: string) => {
    await uninstallMod(id);
    toast.success(`Uninstalled ${name}`);
  };

  const handleDelete = async (mod: ModRow) => {
    if (!confirm(`Delete "${mod.name}"? This cannot be undone.`)) return;
    setDeleting(mod.id);
    try {
      const { error } = await (supabase as any).from("mods").delete().eq("id", mod.id);
      if (error) throw error;
      toast.success(`Deleted ${mod.name}`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally { setDeleting(null); }
  };

  const openUpdatePicker = (mod: ModRow) => {
    setUpdateTargetMod(mod);
    updateFileRef.current?.click();
  };

  const onUpdateFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !updateTargetMod || !currentUserId) return;
    const mod = updateTargetMod;
    setUpdateTargetMod(null);
    setUpdatingMod(mod.id);
    try {
      await updateModFile(mod.id, currentUserId, file);
      toast.success(`Updated ${mod.name}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally { setUpdatingMod(null); }
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
      setUploadName(""); setUploadDesc(""); setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Mod Store
          </DialogTitle>
          <DialogDescription>
            Install community mods (.ccmod files). Mods can add emojis, textures, UI, scripts and event hooks.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={updateFileRef}
          type="file"
          accept=".ccmod,.zip,application/zip"
          className="hidden"
          onChange={onUpdateFileChosen}
        />

        <Tabs defaultValue="browse">
          <TabsList className="w-full">
            <TabsTrigger value="browse" className="flex-1">Browse</TabsTrigger>
            <TabsTrigger value="installed" className="flex-1">
              Installed ({installed.length})
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search mods…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="downloads">Most downloads</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : visibleMods.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {search ? "No mods match your search." : "No mods yet — be the first!"}
              </p>
            ) : (
              visibleMods.map((m) => {
                const isInstalled = installedById.has(m.id);
                const updateAvailable = isInstalled && hasUpdate(m);
                const isAuthor = currentUserId && m.author_id === currentUserId;
                return (
                  <Card key={m.id}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {m.name}
                          {updateAvailable && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              Update available
                            </span>
                          )}
                        </p>
                        {m.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          by {m.author_username || "Unknown"} · {m.downloads} downloads
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleInstall(m)}
                          disabled={installing === m.id}
                          variant={updateAvailable ? "default" : isInstalled ? "secondary" : "default"}
                        >
                          {installing === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              {updateAvailable ? "Update" : isInstalled ? "Reinstall" : "Install"}
                            </>
                          )}
                        </Button>
                        {isAuthor && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openUpdatePicker(m)}
                            disabled={updatingMod === m.id}
                            title="Upload a new version"
                          >
                            {updatingMod === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {isAuthor && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(m)}
                            disabled={deleting === m.id}
                          >
                            {deleting === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
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
                          {m.emojis?.length ?? 0} emoji · {m.textures?.length ?? 0} texture · {m.ui?.length ?? 0} UI · {m.scripts?.length ?? 0} script · {m.triggers ?? 0} trigger · {m.tabs?.length ?? 0} tab
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
              a root <code>event.cctrigger</code> file). To update an existing mod, click the refresh icon next to it in Browse.
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
