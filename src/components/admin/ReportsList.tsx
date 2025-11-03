import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Trash2, Ban, Clock } from "lucide-react";
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
}

const ReportsList = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempBanDays, setTempBanDays] = useState("7");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [tempBanDialogOpen, setTempBanDialogOpen] = useState(false);
  const [selectedReportUserId, setSelectedReportUserId] = useState<string | null>(null);

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
    return <p className="text-muted-foreground">Loading reports...</p>;
  }

  return (
    <div className="space-y-4 mt-6">
      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Report by @{report.reporter?.username}
                  </CardTitle>
                  <CardDescription>
                    Against @{report.reported_user?.username}
                  </CardDescription>
                </div>
                <Badge variant={report.status === "pending" ? "default" : "secondary"}>
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">{report.reason}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.status === "pending" && (
                    <Button
                      onClick={() => handleResolve(report.id)}
                      variant="secondary"
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Resolve
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
                        Ban User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ban @{report.reported_user?.username}?</DialogTitle>
                        <DialogDescription>
                          This will permanently ban the user from accessing the chat.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleBanUser(report.reported_user_id, report.reason)}
                        >
                          Permanently Ban
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
                        Temp Ban
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Temporarily Ban @{report.reported_user?.username}?</DialogTitle>
                        <DialogDescription>
                          This will temporarily prevent the user from accessing the chat.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="days">Ban Duration (days)</Label>
                          <Input
                            id="days"
                            type="number"
                            min="1"
                            max="365"
                            value={tempBanDays}
                            onChange={(e) => setTempBanDays(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setTempBanDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleTempBanUser(report.reported_user_id, report.reason)}
                        >
                          Temporarily Ban
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Report
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Report</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this report? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(report.id)}>
                          Delete
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