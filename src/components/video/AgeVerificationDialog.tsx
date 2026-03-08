import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AgeVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const AgeVerificationDialog = ({ open, onOpenChange, onVerified }: AgeVerificationDialogProps) => {
  const [step, setStep] = useState<"intro" | "camera" | "verifying" | "failed">("intro");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      setStream(mediaStream);
      setStep("camera");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      toast.error("Camera access denied. Please allow camera access to verify your age.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

    stopCamera();
    setStep("verifying");

    try {
      const { data, error } = await supabase.functions.invoke("verify-age", {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (data.verified) {
        toast.success(`Age verified! Estimated age: ${data.estimated_age}`);
        onVerified();
        onOpenChange(false);
        setStep("intro");
      } else {
        const msg = data.error || 
          (data.confidence === "low" ? "Could not clearly detect your face. Please try again with better lighting." :
           "You must be 18 or older to view this content.");
        toast.error(msg);
        setStep("failed");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Verification failed. Please try again.");
      setStep("failed");
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      stopCamera();
      setStep("intro");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription>
            This content is marked as Adults Only. You need to verify your age once to access it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "intro" && (
            <div className="text-center space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>We'll use your camera to verify you're 18+. This is a one-time scan — your photo is not stored.</p>
              </div>
              <Button onClick={startCamera} className="w-full gap-2">
                <Camera className="h-4 w-4" />
                Open Camera
              </Button>
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  Position your face in the frame
                </div>
              </div>
              <Button onClick={captureAndVerify} className="w-full gap-2">
                <Camera className="h-4 w-4" />
                Scan My Face
              </Button>
            </div>
          )}

          {step === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your face...</p>
            </div>
          )}

          {step === "failed" && (
            <div className="text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">Verification failed. You can try again.</p>
              <Button onClick={startCamera} variant="outline" className="w-full gap-2">
                <Camera className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default AgeVerificationDialog;
