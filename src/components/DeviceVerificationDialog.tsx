import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeviceVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  maskedEmail: string;
  deviceFingerprint: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const DeviceVerificationDialog = ({
  open,
  onOpenChange,
  userId,
  maskedEmail,
  deviceFingerprint,
  onSuccess,
  onCancel,
}: DeviceVerificationDialogProps) => {
  const [code, setCode] = useState<string[]>(Array(10).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [open]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    
    if (value.length > 1) {
      // Paste handling
      const digits = value.slice(0, 10 - index).split("");
      digits.forEach((digit, i) => {
        if (index + i < 10) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 9);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 9) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 10) {
      toast.error("Please enter the complete 10-digit code");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-device-verification/verify", {
        body: {
          user_id: userId,
          code: fullCode,
          device_fingerprint: deviceFingerprint,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Device verified successfully!");
        onSuccess();
      } else {
        toast.error(data.error || "Invalid code");
        setCode(Array(10).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke("send-device-verification/send", {
        body: {
          user_id: userId,
          device_fingerprint: deviceFingerprint,
        },
      });

      if (error) throw error;
      toast.success("New code sent!");
      setCode(Array(10).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Device Verification
          </DialogTitle>
          <DialogDescription>
            A 10-digit code has been sent to <strong>{maskedEmail}</strong>. Enter it below to verify this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-1 justify-center flex-wrap">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-9 h-12 text-center text-lg font-mono"
                disabled={verifying}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleVerify} disabled={verifying || code.join("").length !== 10}>
              {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verify Device
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResend} disabled={resending} className="flex-1">
                {resending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Resend Code
              </Button>
              <Button variant="ghost" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The code expires in 10 minutes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
