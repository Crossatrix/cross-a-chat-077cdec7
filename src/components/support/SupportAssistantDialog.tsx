import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SupportAssistantDialog = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setAnswer("");
    const { data, error } = await supabase.functions.invoke("support-assistant", { body: { question: q } });
    setLoading(false);
    if (error || data?.error) {
      toast.error("The assistant is unavailable right now.");
      return;
    }
    setAnswer(data?.answer || "No answer returned.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          Ask the assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Support Assistant</DialogTitle>
          <DialogDescription>Answers come only from the support pages.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How do I change my creator username?"
          rows={3}
          maxLength={1000}
          className="resize-none"
        />
        <Button onClick={ask} disabled={loading || !question.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Ask
        </Button>
        {answer && (
          <ScrollArea className="max-h-64 rounded-lg border p-3">
            <p className="text-sm whitespace-pre-wrap">{answer}</p>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportAssistantDialog;
