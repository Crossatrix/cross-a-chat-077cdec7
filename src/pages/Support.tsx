import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { FeedbackDialog } from "@/components/FeedbackDialog";

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Support</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need help?</CardTitle>
          <CardDescription>We're here to help — submit a request or contact support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            If you're experiencing issues with Cross Chat (account, billing, or technical), please open a support request using the feedback button below. For urgent matters, email us at support@crossatrix.ai.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <FeedbackDialog />
            <Button onClick={() => window.open("mailto:support@crossatrix.ai")} variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;