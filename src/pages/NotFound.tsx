import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-destructive">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <Compass className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-destructive">
                404 — Page Not Found
              </CardTitle>
              <CardDescription>
                The page you're looking for doesn't exist or may have been moved
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Requested Path
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-foreground font-mono text-sm break-all">{location.pathname}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              What You Can Do
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm">
                  • Double-check the URL for typos
                </p>
                <p className="text-sm">
                  • Go back to the homepage and navigate from there
                </p>
                <p className="text-sm">
                  • If you followed a link to get here, it may be outdated
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              asChild
            >
              <a href="/">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
