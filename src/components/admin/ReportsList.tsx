import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
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
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ReportsList;