import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Crown, Sparkles, MessageCircle, Film, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getBalance, getCrossatrixUserId } from "@/utils/croins";
import { checkProStatus, purchasePro } from "@/utils/proSubscription";
import { checkCreatorProStatus, purchaseCreatorPro, purchaseExtraAICredits, purchaseExtraAIChat } from "@/utils/storeItems";
import ModImg from "@/components/ModImg";
import { emitModEvent } from "@/utils/modEvents";
import proBadgeIcon from "@/assets/pro-badge.png";
import croinIcon from "@/assets/croin.png";

const Store = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isCreatorPro, setIsCreatorPro] = useState(false);
  const [proExpiry, setProExpiry] = useState<string | null>(null);
  const [creatorProExpiry, setCreatorProExpiry] = useState<string | null>(null);
  const [creditPacks, setCreditPacks] = useState(1);
  
  // Ad request
  const [adTitle, setAdTitle] = useState("");
  const [adFile, setAdFile] = useState<File | null>(null);
  const [submittingAd, setSubmittingAd] = useState(false);
  const [myAdRequests, setMyAdRequests] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      emitModEvent("openedstore");

      const crossatrixId = getCrossatrixUserId(user.id);
      const [bal, pro, creatorPro] = await Promise.all([
        getBalance(crossatrixId),
        checkProStatus(user.id),
        checkCreatorProStatus(user.id),
      ]);
      setBalance(bal);
      setIsPro(pro);
      setIsCreatorPro(creatorPro);

      // Get expiry dates
      const { data: proSub } = await supabase
        .from("pro_subscriptions" as any)
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (proSub) setProExpiry((proSub as any).expires_at);

      const { data: cpSub } = await supabase
        .from("creator_pro_subscriptions" as any)
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cpSub) setCreatorProExpiry((cpSub as any).expires_at);

      // Get ad requests
      const { data: ads } = await supabase
        .from("user_ad_requests" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (ads) setMyAdRequests(ads);

      setLoading(false);
    };
    init();
  }, [navigate]);

  const refreshBalance = async () => {
    const crossatrixId = getCrossatrixUserId(userId);
    setBalance(await getBalance(crossatrixId));
  };

  const handlePurchasePro = async () => {
    setPurchasing("pro");
    const result = await purchasePro(userId);
    toast(result.message);
    if (result.success) { setIsPro(true); await refreshBalance(); emitModEvent("buy", { item: "pro" }); }
    setPurchasing(null);
  };

  const handlePurchaseCreatorPro = async () => {
    setPurchasing("creator-pro");
    const result = await purchaseCreatorPro(userId);
    toast(result.message);
    if (result.success) { setIsCreatorPro(true); await refreshBalance(); emitModEvent("buy", { item: "creator-pro" }); }
    setPurchasing(null);
  };

  const handlePurchaseCredits = async () => {
    setPurchasing("credits");
    const result = await purchaseExtraAICredits(userId, creditPacks);
    toast(result.message);
    if (result.success) { await refreshBalance(); emitModEvent("buy", { item: "ai-credits", packs: creditPacks }); }
    setPurchasing(null);
  };

  const handlePurchaseChat = async () => {
    setPurchasing("chat");
    const result = await purchaseExtraAIChat(userId);
    toast(result.message);
    if (result.success) { await refreshBalance(); emitModEvent("buy", { item: "ai-chat" }); }
    setPurchasing(null);
  };

  const handleSubmitAd = async () => {
    if (!adTitle.trim() || !adFile) {
      toast.error("Please provide a title and video file.");
      return;
    }
    setSubmittingAd(true);
    try {
      const fileName = `${userId}/${Date.now()}-${adFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ad-videos")
        .upload(fileName, adFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ad-videos")
        .getPublicUrl(fileName);

      // Get duration
      const video = document.createElement("video");
      video.preload = "metadata";
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => resolve(Math.round(video.duration));
        video.src = URL.createObjectURL(adFile);
      });

      await supabase.from("user_ad_requests" as any).insert({
        user_id: userId,
        title: adTitle,
        video_url: publicUrl,
        duration,
      });

      toast.success("Ad submitted for review!");
      setAdTitle("");
      setAdFile(null);

      // Refresh list
      const { data: ads } = await supabase
        .from("user_ad_requests" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (ads) setMyAdRequests(ads);
    } catch (e: any) {
      toast.error("Failed to submit ad: " + e.message);
    }
    setSubmittingAd(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Croins Store</h1>
        <div className="ml-auto flex items-center gap-1 bg-accent/50 px-3 py-1.5 rounded-full">
          <ModImg src={croinIcon} alt="Croins" className="w-5 h-5" />
          <span className="font-bold text-sm">{balance}</span>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="space-y-4 pb-8">

          {/* Cross Chat Pro */}
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ModImg src={proBadgeIcon} alt="Pro" className="w-6 h-6" />
                <CardTitle className="text-lg">Cross Chat Pro</CardTitle>
              </div>
              <CardDescription>Ad-free experience + Pro badge</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ModImg src={croinIcon} alt="" className="w-4 h-4" />
                  <span className="font-bold">50</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                {isPro ? (
                  <div className="text-sm text-green-500 font-medium">
                    Active {proExpiry && `until ${new Date(proExpiry).toLocaleDateString()}`}
                  </div>
                ) : (
                  <Button size="sm" onClick={handlePurchasePro} disabled={purchasing === "pro"}>
                    {purchasing === "pro" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Creator Pro */}
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Creator Pro</CardTitle>
              </div>
              <CardDescription>Pro badge + Studio with video editor + your own ad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ModImg src={croinIcon} alt="" className="w-4 h-4" />
                  <span className="font-bold">80</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                {isCreatorPro ? (
                  <div className="text-sm text-green-500 font-medium">
                    Active {creatorProExpiry && `until ${new Date(creatorProExpiry).toLocaleDateString()}`}
                  </div>
                ) : (
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={handlePurchaseCreatorPro} disabled={purchasing === "creator-pro"}>
                    {purchasing === "creator-pro" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                  </Button>
                )}
              </div>
              {isCreatorPro && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate("/studio")}>
                  <Film className="h-4 w-4 mr-2" /> Open Studio
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Your Own Ad */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Your Own Ad</CardTitle>
              </div>
              <CardDescription>Submit your ad for staff approval. Price is set by staff.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Ad Title</Label>
                <Input value={adTitle} onChange={(e) => setAdTitle(e.target.value)} placeholder="My awesome ad" />
              </div>
              <div>
                <Label>Video (.mp4)</Label>
                <Input type="file" accept="video/mp4" onChange={(e) => setAdFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleSubmitAd} disabled={submittingAd} className="w-full">
                {submittingAd ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit for Review
              </Button>

              {myAdRequests.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Your Submissions</p>
                  {myAdRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-accent/30 rounded text-sm">
                      <span>{req.title}</span>
                      <div className="flex items-center gap-2">
                        {req.price > 0 && (
                          <span className="flex items-center gap-1">
                            <ModImg src={croinIcon} alt="" className="w-3 h-3" />{req.price}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          req.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          req.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Credits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">Extra AI Credits</CardTitle>
              </div>
              <CardDescription>10 credits per pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCreditPacks(Math.max(1, creditPacks - 1))}>-</Button>
                  <span className="font-bold w-8 text-center">{creditPacks}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCreditPacks(creditPacks + 1)}>+</Button>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ModImg src={croinIcon} alt="" className="w-4 h-4" />
                  <span className="font-bold">{creditPacks * 10}</span>
                  <span className="text-muted-foreground">for {creditPacks * 10} credits</span>
                </div>
                <Button size="sm" className="ml-auto" onClick={handlePurchaseCredits} disabled={purchasing === "credits"}>
                  {purchasing === "credits" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extra AI Chat */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Extra AI Chat</CardTitle>
              </div>
              <CardDescription>Unlock 1 additional AI conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ModImg src={croinIcon} alt="" className="w-4 h-4" />
                  <span className="font-bold">10</span>
                  <span className="text-sm text-muted-foreground">per chat</span>
                </div>
                <Button size="sm" onClick={handlePurchaseChat} disabled={purchasing === "chat"}>
                  {purchasing === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
};

export default Store;
