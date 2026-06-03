import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FlaskConical, Sparkles, ShieldAlert, Share2 } from "lucide-react";
import { getBetaLinkShareEnabled, setBetaLinkShareEnabled } from "@/utils/instantLinks";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BETA_AI_KEY = "beta_feat_ai_message";
const BETA_SCAM_KEY = "beta_feat_scam_detector";

export const getBetaAIMessageEnabled = () => localStorage.getItem(BETA_AI_KEY) !== "0";
export const getBetaScamEnabled = () => localStorage.getItem(BETA_SCAM_KEY) !== "0";

const BetaDialog = ({ open, onOpenChange }: Props) => {
  const [aiOn, setAiOn] = useState(getBetaAIMessageEnabled());
  const [scamOn, setScamOn] = useState(getBetaScamEnabled());
  const [linkOn, setLinkOn] = useState(getBetaLinkShareEnabled());

  const toggleAi = (v: boolean) => {
    setAiOn(v);
    localStorage.setItem(BETA_AI_KEY, v ? "1" : "0");
  };
  const toggleScam = (v: boolean) => {
    setScamOn(v);
    localStorage.setItem(BETA_SCAM_KEY, v ? "1" : "0");
  };
  const toggleLink = (v: boolean) => {
    setLinkOn(v);
    setBetaLinkShareEnabled(v);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Cross Chat Beta
            <Badge variant="secondary" className="ml-1">BETA</Badge>
          </DialogTitle>
          <DialogDescription>
            Experimental features for beta members. Toggle anything on/off.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Message Generator
              </CardTitle>
              <CardDescription>
                Adds an <span className="font-medium">AI Message</span> button next to the chat input.
                Describe what you want to say and it drafts a message for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <Switch checked={aiOn} onCheckedChange={toggleAi} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Scam Detector
              </CardTitle>
              <CardDescription>
                When a new contact writes to you for the first time, the next 5 messages are
                analysed and you get a warning popup if a scam attempt is detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <Switch checked={scamOn} onCheckedChange={toggleScam} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Link Share
              </CardTitle>
              <CardDescription>
                Adds a Share button to your account, other user profiles, videos,
                music and subcrosses. Sharing creates an instant-open link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <Switch checked={linkOn} onCheckedChange={toggleLink} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetaDialog;
