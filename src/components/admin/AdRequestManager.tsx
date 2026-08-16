import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { debitCroins, getBalance, getCrossatrixUserId, lookupCrossatrixId } from "@/utils/croins";

const AdRequestManager = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("user_ad_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSetPrice = async (id: string) => {
    const price = parseInt(prices[id] || "0");
    if (price <= 0) { toast.error("Set a valid price"); return; }

    await supabase
      .from("user_ad_requests" as any)
      .update({ price, status: "priced" })
      .eq("id", id);

    toast.success("Price set!");
    fetchRequests();
  };

  const handleApprove = async (req: any) => {
    // Debit the user
    const crossatrixId = await lookupCrossatrixId(req.user_id);
    const balance = await getBalance(crossatrixId);

    if (balance < req.price) {
      toast.error(`User doesn't have enough Croins (${balance}/${req.price})`);
      return;
    }

    const debited = await debitCroins(crossatrixId, req.price, `Custom ad: ${req.title}`);
    if (!debited) { toast.error("Failed to debit user"); return; }

    // Add to ads table
    let category = "short";
    if (req.duration > 60) category = "xl";
    else if (req.duration > 30) category = "long";
    else if (req.duration > 10) category = "medium";

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("ads").insert({
      title: req.title,
      video_url: req.video_url,
      duration: req.duration,
      category,
      created_by: user?.id,
    });

    await supabase
      .from("user_ad_requests" as any)
      .update({ status: "approved", reviewed_by: user?.id })
      .eq("id", req.id);

    toast.success("Ad approved and live!");
    fetchRequests();
  };

  const handleReject = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("user_ad_requests" as any)
      .update({ status: "rejected", reviewed_by: user?.id })
      .eq("id", id);

    toast.success("Ad rejected");
    fetchRequests();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No ad requests</p>
      ) : (
        requests.map((req: any) => (
          <Card key={req.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{req.title}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  req.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                  req.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                  req.status === 'priced' ? 'bg-blue-500/20 text-blue-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{req.duration}s</p>
              {req.video_url && (
                <video src={req.video_url} controls className="w-full rounded max-h-32" />
              )}
              {req.status === "pending" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Set price (Croins)"
                    value={prices[req.id] || ""}
                    onChange={(e) => setPrices({ ...prices, [req.id]: e.target.value })}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleSetPrice(req.id)}>Set Price</Button>
                </div>
              )}
              {(req.status === "priced" || req.status === "pending") && req.price > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Price: {req.price} Croins</span>
                  <Button size="sm" variant="default" onClick={() => handleApprove(req)}>
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdRequestManager;
