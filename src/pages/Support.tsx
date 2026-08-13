import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, BookOpen, MessageSquare, Bug, ShieldAlert } from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";

const SUPPORT_EMAIL = "cross.a.trix.chat@hotmail.com";

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-6">
      <Button variant="ghost" onClick={() => navigate("/settings")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Button>

      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-muted-foreground mb-6">
        Need help with Cross Chat? Find answers below or reach out to our team.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Email us
            </CardTitle>
            <CardDescription>We usually reply within a few days.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full break-all">
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Send feedback
            </CardTitle>
            <CardDescription>Report an issue or suggest a feature in-app.</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackDialog />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Documentation
            </CardTitle>
            <CardDescription>Guides for mods, badges and scripting.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/docs")}>
              Open docs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Report content or a user
            </CardTitle>
            <CardDescription>
              Use the report button on any message, post or video — reports go straight to our staff team.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="h-5 w-5 text-primary" />
            Common questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">I can't post videos, posts or comments.</p>
            <p className="text-muted-foreground">
              Your account may be temporarily blocked by staff. Blocks expire automatically; permanent blocks can be appealed by email.
            </p>
          </div>
          <div>
            <p className="font-medium">My Croins or Pro/Beta purchase didn't apply.</p>
            <p className="text-muted-foreground">
              Reload the app first. If it still doesn't show up in Settings → Pro, contact us with your username.
            </p>
          </div>
          <div>
            <p className="font-medium">A mod broke my app.</p>
            <p className="text-muted-foreground">
              Open the Mods menu and disable or uninstall the mod. Mods rated Risky or High Risk can affect stability.
            </p>
          </div>
          <div>
            <p className="font-medium">I forgot my password.</p>
            <p className="text-muted-foreground">
              Cross Chat uses your Crossatrix account — reset your password there and sign in again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
