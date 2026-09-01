import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServerCrash, Home, RefreshCw } from "lucide-react";
import { getStoredServerErrorDetails, clearStoredServerErrorDetails, type ServerErrorDetails } from "@/utils/serverErrorMonitor";

const ServerError = () => {
  const [details, setDetails] = useState<ServerErrorDetails | null>(null);

  useEffect(() => {
    setDetails(getStoredServerErrorDetails());
    // Don't clear on mount: a refresh of this page should still show the
    // same error. It's cleared when the user navigates away deliberately.
  }, []);

  const handleGoHome = () => {
    clearStoredServerErrorDetails();
    window.location.assign("/");
  };

  const handleRetry = () => {
    clearStoredServerErrorDetails();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <ServerCrash className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-destructive">
                {details ? `Server Error — ${details.status} ${details.statusText}` : "Server Error"}
              </CardTitle>
              <CardDescription>
                The database server returned an error while handling your request
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {details ? (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Endpoint
                </h3>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-foreground font-mono text-sm break-all">
                      {details.method} {details.url}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Status
                </h3>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-foreground font-mono text-sm">
                      {details.status} {details.statusText}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Server Response
                </h3>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <pre className="text-foreground font-mono text-xs whitespace-pre-wrap break-all">
                      {details.body || "(empty response body)"}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground">
                Occurred at {new Date(details.timestamp).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No error details were found for this session. If you were redirected here, try going back and
              retrying the action.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="default" className="flex-1" onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerError;
