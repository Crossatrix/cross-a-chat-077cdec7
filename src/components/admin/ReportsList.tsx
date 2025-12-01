import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Trash2, Ban, Clock, Bot, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_user_id: string;
  reporter: {
    username: string;
  };
  reported_user: {
    username: string;
  };
  ai_reviewed: boolean;
  ai_verdict: string | null;
  ai_reason: string | null;
  ai_reviewed_at: string | null;
}

const ReportsList = () => {
  const { t } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempBanDays, setTempBanDays] = useState("7");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [tempBanDialogOpen, setTempBanDialogOpen] = useState(false);
  const [selectedReportUserId, setSelectedReportUserId] = useState<string | null>(null);
  const [aiReviewing, setAiReviewing] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("user_reports")
      .select(`
        *,
        reporter:profiles!reporter_id(username),
        reported_user:profiles!reported_user_id(username)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching reports:", error);
      }
      toast.error("Failed to load reports");
      return;
    }

    setReports(data || []);
    setLoading(false);
  };

  const handleAiReview = async (reportId: string) => {
    setAiReviewing(reportId);
    toast.info(t("ai.reviewing"));

    try {
      const { data, error } = await supabase.functions.invoke("ai-moderator", {
        body: { reportId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t("ai.reviewComplete"));
        await fetchReports();
      } else {
        throw new Error(data.error || "AI review failed");
      }
    } catch (error) {
      console.error("AI review error:", error);
      toast.error(t("ai.reviewFailed"));
    } finally {
      setAiReviewing(null);
    }
  };

  const handleResolve = async (reportId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("user_reports")
      .update({ 
        status: "resolved", 
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id 
      })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to resolve report");
      return;
    }

    toast.success("Report resolved");
    fetchReports();
  };

  const handleDelete = async (reportId: string) => {
    const { error } = await supabase
      .from("user_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to delete report");
      return;
    }

    toast.success("Report deleted");
    fetchReports();
  };

  const handleBanUser = async (userId: string, reportReason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("user_bans")
      .insert({
        user_id: userId,
        banned_by: user?.id,
        reason: `Report: ${reportReason}`
      });

    if (error) {
      toast.error("Failed to ban user");
      return;
    }

    toast.success("User banned permanently");
    setBanDialogOpen(false);
    setSelectedReportUserId(null);
  };

  const handleTempBanUser = async (userId: string, reportReason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const days = parseInt(tempBanDays) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    const { error } = await supabase
      .from("user_bans")
      .insert({
        user_id: userId,
        banned_by: user?.id,
        reason: `Report (${days} day temp ban): ${reportReason}`,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      toast.error("Failed to temporarily ban user");
      return;
    }

    toast.success(`User temporarily banned for ${days} days`);
    setTempBanDialogOpen(false);
    setSelectedReportUserId(null);
    setTempBanDays("7");
  };

  if (loading) {
    return <p className="text-muted-foreground">{t("reports.loading")}</p>;
  }

  return (
    <div className="space-y-4 mt-6">
      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{t("reports.none")}</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {t("reports.by")} @{report.reporter?.username}
                  </CardTitle>
                  <CardDescription>
                    {t("reports.against")} @{report.reported_user?.username}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {report.ai_reviewed && (
                    <Badge variant="outline" className="gap-1">
                      <Bot className="w-3 h-3" />
                      {t("ai.reviewed")}
                    </Badge>
                  )}
                  <Badge variant={report.status === "pending" ? "default" : "secondary"}>
                    {t(`reports.${report.status}`)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">{report.reason}</p>

              {report.ai_reviewed && report.ai_verdict && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4" />
                    <span className="font-semibold">{t("ai.verdict")}:</span>
                    {report.ai_verdict === 'violation' ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        {t("ai.violation")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 bg-green-500/20 text-green-300 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("ai.noViolation")}
                      </Badge>
                    )}
                  </div>
                  {report.ai_reason && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-semibold">{t("ai.reason")}:</span> {report.ai_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("ai.reviewed")}: {new Date(report.ai_reviewed_at!).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!report.ai_reviewed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiReview(report.id)}
                      disabled={aiReviewing === report.id}
                      className="gap-2"
                    >
                      <Bot className="w-4 h-4" />
                      {aiReviewing === report.id ? t("ai.reviewing") : t("ai.review")}
                    </Button>
                  )}
                  {report.status === "pending" && (
                    <Button
                      onClick={() => handleResolve(report.id)}
                      variant="secondary"
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t("reports.resolve")}
                    </Button>
                  )}
                  
                  <Dialog open={banDialogOpen && selectedReportUserId === report.reported_user.username} onOpenChange={setBanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setSelectedReportUserId(report.reported_user.username)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {t("ban.permanent")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("ban.user")} @{report.reported_user?.username}?</DialogTitle>
                        <DialogDescription>
                          {t("ban.confirmPermanent")}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                          {t("common.cancel")}
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleBanUser(report.reported_user_id, report.reason)}
                        >
                          {t("ban.permanent")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={tempBanDialogOpen && selectedReportUserId === report.reported_user.username} onOpenChange={setTempBanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedReportUserId(report.reported_user.username)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {t("ban.temp")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("ban.temporarily")} @{report.reported_user?.username}?</DialogTitle>
                        <DialogDescription>
                          {t("ban.confirmTemp")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="days">{t("ban.duration")}</Label>
                          <Input
                            id="days"
                            type="number"
                            min="1"
                            max="14"
                            value={tempBanDays}
                            onChange={(e) => setTempBanDays(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setTempBanDialogOpen(false)}>
                          {t("common.cancel")}
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleTempBanUser(report.reported_user_id, report.reason)}
                        >
                          {t("ban.temporarily")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("reports.delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("reports.delete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("reports.deleteConfirm")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(report.id)}>
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ReportsList;