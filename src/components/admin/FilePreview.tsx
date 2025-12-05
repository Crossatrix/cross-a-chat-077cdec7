import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, Ban, Clock, Bot, XCircle } from "lucide-react";
import { FileItem } from "./FileExplorer";
import { useLanguage } from "@/contexts/LanguageContext";
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

interface FilePreviewProps {
  file: FileItem | null;
  onDelete: (file: FileItem) => void;
  onAction?: (action: string, file: FileItem, extra?: any) => void;
}

const FilePreview = ({ file, onDelete, onAction }: FilePreviewProps) => {
  const { t } = useLanguage();

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-card border border-border rounded-lg">
        <p>Select a file to preview</p>
      </div>
    );
  }

  const data = file.data;

  // Emoji file preview
  if (file.extension === "png" || file.extension === "gif" || file.extension === "webp") {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-4 overflow-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center">
            <img
              src={data?.image_url}
              alt={data?.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-bold text-lg text-foreground">:{data?.name}:</h3>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(data?.created_at).toLocaleString()}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Emoji
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete emoji?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the emoji :{data?.name}:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(file)}>
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // Report file preview
  if (file.data?.type === "report") {
    const report = data;
    return (
      <div className="h-full bg-card border border-border rounded-lg p-4 overflow-auto">
        <div className="font-mono text-sm whitespace-pre-wrap text-foreground space-y-4">
          <div className="border-b border-border pb-2">
            <p className="text-muted-foreground text-xs">REPORT FILE</p>
            <h3 className="font-bold">{file.name}.txt</h3>
          </div>
          
          <div className="space-y-2">
            <p><span className="text-muted-foreground">Reporter:</span> @{report.reporter?.username}</p>
            <p><span className="text-muted-foreground">Reported User:</span> @{report.reported_user?.username}</p>
            <p><span className="text-muted-foreground">Status:</span> <Badge variant={report.status === "pending" ? "default" : "secondary"}>{report.status}</Badge></p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(report.created_at).toLocaleString()}</p>
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-muted-foreground mb-1">Reason:</p>
            <p className="bg-secondary p-2 rounded">{report.reason}</p>
          </div>

          {report.ai_reviewed && (
            <div className="border-t border-border pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" />
                <span className="text-muted-foreground">AI Review:</span>
                {report.ai_verdict === 'violation' ? (
                  <Badge variant="destructive">Violation</Badge>
                ) : report.ai_verdict === 'false_report' ? (
                  <Badge className="bg-yellow-500/20 text-yellow-300">False Report</Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-300">No Violation</Badge>
                )}
              </div>
              {report.ai_reason && <p className="text-sm">{report.ai_reason}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {!report.ai_reviewed && (
              <Button variant="outline" size="sm" onClick={() => onAction?.("ai_review", file)}>
                <Bot className="h-4 w-4 mr-2" />
                AI Review
              </Button>
            )}
            {report.status === "pending" && (
              <Button variant="secondary" size="sm" onClick={() => onAction?.("resolve", file)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Resolve
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => onAction?.("ban", file)}>
              <Ban className="h-4 w-4 mr-2" />
              Ban User
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction?.("temp_ban", file)}>
              <Clock className="h-4 w-4 mr-2" />
              Temp Ban
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(file)}>
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  // User file preview
  if (file.data?.type === "user") {
    const user = data;
    return (
      <div className="h-full bg-card border border-border rounded-lg p-4 overflow-auto">
        <div className="font-mono text-sm whitespace-pre-wrap text-foreground space-y-4">
          <div className="border-b border-border pb-2">
            <p className="text-muted-foreground text-xs">USER FILE</p>
            <h3 className="font-bold">{file.name}.txt</h3>
          </div>
          
          <div className="space-y-2">
            <p><span className="text-muted-foreground">Username:</span> @{user.username}</p>
            <p><span className="text-muted-foreground">User ID:</span> {user.id}</p>
            <p><span className="text-muted-foreground">Created:</span> {new Date(user.created_at).toLocaleString()}</p>
            <div className="flex gap-2">
              {user.banned && <Badge variant="destructive">Banned</Badge>}
              {user.isAdmin && <Badge className="bg-purple-500/20 text-purple-300">Admin</Badge>}
              {!user.banned && !user.isAdmin && <Badge variant="secondary">Active</Badge>}
            </div>
            {user.banExpiresAt && (
              <p><span className="text-muted-foreground">Ban Expires:</span> {new Date(user.banExpiresAt).toLocaleString()}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {user.banned ? (
              <Button variant="secondary" size="sm" onClick={() => onAction?.("unban", file)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Unban
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => onAction?.("ban_user", file)}>
                <Ban className="h-4 w-4 mr-2" />
                Ban
              </Button>
            )}
            {user.isAdmin ? (
              <Button variant="outline" size="sm" onClick={() => onAction?.("demote", file)}>
                <XCircle className="h-4 w-4 mr-2" />
                Remove Admin
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onAction?.("promote", file)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Make Admin
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Feedback file preview
  if (file.data?.type === "feedback") {
    const feedback = data;
    return (
      <div className="h-full bg-card border border-border rounded-lg p-4 overflow-auto">
        <div className="font-mono text-sm whitespace-pre-wrap text-foreground space-y-4">
          <div className="border-b border-border pb-2">
            <p className="text-muted-foreground text-xs">FEEDBACK FILE</p>
            <h3 className="font-bold">{file.name}.txt</h3>
          </div>
          
          <div className="space-y-2">
            <p><span className="text-muted-foreground">From:</span> @{feedback.username || "Unknown"}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(feedback.created_at).toLocaleString()}</p>
            <p><span className="text-muted-foreground">Status:</span> <Badge variant={feedback.status === "pending" ? "default" : "secondary"}>{feedback.status}</Badge></p>
            {feedback.rating && <p><span className="text-muted-foreground">Rating:</span> {"⭐".repeat(feedback.rating)}</p>}
            {feedback.important && <Badge className="bg-yellow-500/20 text-yellow-300">Important</Badge>}
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-muted-foreground mb-1">Message:</p>
            <p className="bg-secondary p-2 rounded">{feedback.message}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button 
              variant={feedback.status === "resolved" ? "outline" : "secondary"} 
              size="sm" 
              onClick={() => onAction?.(feedback.status === "resolved" ? "reopen" : "resolve_feedback", file)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {feedback.status === "resolved" ? "Reopen" : "Mark Resolved"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAction?.("toggle_important", file)}
            >
              {feedback.important ? "Unmark Important" : "Mark Important"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(file)}>
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-muted-foreground bg-card border border-border rounded-lg">
      <p>Unknown file type</p>
    </div>
  );
};

export default FilePreview;
