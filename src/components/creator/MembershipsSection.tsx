import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Crown, Plus, Trash2, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { type ChannelMembership, type CreatorEmoji, purchaseMembership, getActiveMembership } from "@/utils/memberships";

interface Props {
  creatorId: string;
  currentUserId: string;
}

const MembershipsSection = ({ creatorId, currentUserId }: Props) => {
  const isOwner = creatorId === currentUserId;
  const [tiers, setTiers] = useState<ChannelMembership[]>([]);
  const [emojis, setEmojis] = useState<CreatorEmoji[]>([]);
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(20);
  const [perks, setPerks] = useState("");
  const [emojiName, setEmojiName] = useState("");
  const [emojiTier, setEmojiTier] = useState<string>("");

  const load = async () => {
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("channel_memberships" as any).select("*").eq("creator_id", creatorId).order("price_croins"),
      supabase.from("creator_emojis" as any).select("*").eq("creator_id", creatorId),
    ]);
    setTiers((t || []) as any);
    setEmojis((e || []) as any);
    if (!isOwner) setActiveMembershipId(await getActiveMembership(currentUserId, creatorId));
  };

  useEffect(() => { load(); }, [creatorId, currentUserId]);

  const createTier = async () => {
    if (!name.trim() || price < 1) { toast.error("Name and price required"); return; }
    const { error } = await supabase.from("channel_memberships" as any).insert({
      creator_id: creatorId, name: name.trim(), description: desc.trim() || null,
      price_croins: price, perks: perks.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Membership created!");
    setName(""); setDesc(""); setPrice(20); setPerks(""); setCreateOpen(false);
    load();
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Delete this membership tier?")) return;
    await supabase.from("channel_memberships" as any).delete().eq("id", id);
    load();
  };

  const subscribe = async (tier: ChannelMembership) => {
    const res = await purchaseMembership(currentUserId, tier);
    res.success ? toast.success(res.message) : toast.error(res.message);
    if (res.success) load();
  };

  const uploadEmoji = async (file: File) => {
    const cleanName = emojiName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanName) { toast.error("Enter an emoji name (letters/numbers/_)"); return; }
    const path = `${currentUserId}/${cleanName}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("creator-emojis").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("creator-emojis").getPublicUrl(path);
    const { error } = await supabase.from("creator_emojis" as any).insert({
      creator_id: creatorId, name: cleanName, image_url: pub.publicUrl,
      membership_id: emojiTier || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`:${cleanName}: added!`);
    setEmojiName(""); setEmojiTier("");
    load();
  };

  const deleteEmoji = async (id: string) => {
    await supabase.from("creator_emojis" as any).delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500" /> Memberships</h3>
        {isOwner && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New tier</Button></DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Create membership tier</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Input placeholder="Tier name (e.g. Supporter)" value={name} onChange={e => setName(e.target.value)} maxLength={50} />
                <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} maxLength={300} />
                <Input type="number" min={1} placeholder="Croins / month" value={price} onChange={e => setPrice(parseInt(e.target.value) || 0)} />
                <Textarea placeholder="Perks (one per line)" value={perks} onChange={e => setPerks(e.target.value)} maxLength={500} />
                <Button className="w-full" onClick={createTier}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tiers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No memberships {isOwner ? "yet — create one!" : "available."}</p>
      ) : (
        <div className="grid gap-2">
          {tiers.map(t => {
            const isActive = activeMembershipId === t.id;
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{t.name}</span>
                      <span className="text-xs text-yellow-500 font-semibold">{t.price_croins} Croins/mo</span>
                      {isActive && <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    {t.perks && <pre className="text-xs mt-1 whitespace-pre-wrap font-sans">{t.perks}</pre>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!isOwner && !isActive && <Button size="sm" onClick={() => subscribe(t)}>Subscribe</Button>}
                    {isOwner && <Button size="icon" variant="ghost" onClick={() => deleteTier(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="text-sm font-semibold">Channel emojis</h4>
        {emojis.length === 0 ? (
          <p className="text-xs text-muted-foreground">No custom emojis.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emojis.map(e => (
              <div key={e.id} className="relative flex flex-col items-center text-[10px] bg-muted/50 rounded p-1.5 w-16">
                <img src={e.image_url} alt={e.name} className="w-8 h-8" />
                <span className="truncate max-w-full">:{e.name}:</span>
                {e.membership_id && <Crown className="absolute top-0 right-0 h-3 w-3 text-yellow-500" />}
                {isOwner && (
                  <button onClick={() => deleteEmoji(e.id)} className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground rounded-full p-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex gap-1.5">
              <Input placeholder="emoji_name" value={emojiName} onChange={e => setEmojiName(e.target.value)} className="h-9 text-sm" />
              <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={emojiTier} onChange={e => setEmojiTier(e.target.value)}>
                <option value="">Free</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}+</option>)}
              </select>
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer text-xs hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> Upload emoji image
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadEmoji(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipsSection;
