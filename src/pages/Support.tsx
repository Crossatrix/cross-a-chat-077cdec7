import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, BookOpen, MessageSquare, Sparkles, Pencil, Eye } from "lucide-react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import SupportAssistantDialog from "@/components/support/SupportAssistantDialog";
import SupportBook from "@/components/support/SupportBook";
import useStaffRole from "@/hooks/useStaffRole";

const SUPPORT_EMAIL = "cross.a.trix.chat@hotmail.com";

const Support = () => {
  const navigate = useNavigate();
  const role = useStaffRole();
  const canEdit = role === "admin";
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-6">
      <Button variant="ghost" onClick={() => navigate("/settings")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-muted-foreground">
            Browse the support book, ask the assistant or contact our team.
          </p>
        </div>
        {canEdit && (
          <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode(v => !v)}>
            {editMode ? <Eye className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
            {editMode ? "Done editing" : "Edit"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Feedback
            </CardTitle>
            <CardDescription>Report an issue or suggest a feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackDialog />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Assistant
            </CardTitle>
            <CardDescription>Answers based on the support pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <SupportAssistantDialog />
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">Support book</h2>
      <SupportBook canEdit={canEdit} editMode={canEdit && editMode} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Still stuck?
          </CardTitle>
          <CardDescription>We usually reply within a few days.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full break-all">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
