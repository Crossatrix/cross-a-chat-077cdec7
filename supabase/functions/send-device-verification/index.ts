import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  user_id: string;
  device_fingerprint: string;
}

interface VerifyCodeRequest {
  user_id: string;
  code: string;
  device_fingerprint: string;
}

// Generate a 10-digit numeric code
function generateVerificationCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "send") {
      // Send verification code
      const { user_id, device_fingerprint }: VerificationRequest = await req.json();

      // Get user's device verification settings
      const { data: settings, error: settingsError } = await supabase
        .from("device_verification")
        .select("enabled, verification_email")
        .eq("user_id", user_id)
        .single();

      if (settingsError || !settings?.enabled || !settings?.verification_email) {
        return new Response(
          JSON.stringify({ required: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if device is already trusted
      const { data: trustedDevice } = await supabase
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user_id)
        .eq("device_fingerprint", device_fingerprint)
        .single();

      if (trustedDevice) {
        // Update last used
        await supabase
          .from("trusted_devices")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", trustedDevice.id);

        return new Response(
          JSON.stringify({ required: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate and store verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing unused codes for this user/device
      await supabase
        .from("device_verification_codes")
        .delete()
        .eq("user_id", user_id)
        .eq("device_fingerprint", device_fingerprint)
        .eq("used", false);

      // Insert new code
      const { error: insertError } = await supabase
        .from("device_verification_codes")
        .insert({
          user_id,
          code,
          device_fingerprint,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing verification code:", insertError);
        throw new Error("Failed to store verification code");
      }

      // Get username for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user_id)
        .single();

      // Send verification email
      const emailResponse = await resend.emails.send({
        from: "Cross Chat <noreply@resend.dev>",
        to: [settings.verification_email],
        subject: "Cross Chat - New Device Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">New Device Verification</h1>
            <p>Hi ${profile?.username || "there"},</p>
            <p>A login attempt was detected from a new device. Use the following code to verify it's you:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <code style="font-size: 32px; letter-spacing: 4px; font-weight: bold; color: #333;">${code}</code>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't try to log in, someone may be trying to access your account. We recommend changing your password.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Cross Chat Security Team</p>
          </div>
        `,
      });

      console.log("Verification email sent:", emailResponse);

      return new Response(
        JSON.stringify({ required: true, email: settings.verification_email.replace(/(.{2}).*(@.*)/, "$1***$2") }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "verify") {
      // Verify code
      const { user_id, code, device_fingerprint }: VerifyCodeRequest = await req.json();

      // Find the verification code
      const { data: verificationCode, error: codeError } = await supabase
        .from("device_verification_codes")
        .select("*")
        .eq("user_id", user_id)
        .eq("code", code)
        .eq("device_fingerprint", device_fingerprint)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (codeError || !verificationCode) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark code as used
      await supabase
        .from("device_verification_codes")
        .update({ used: true })
        .eq("id", verificationCode.id);

      // Add device to trusted devices
      const userAgent = req.headers.get("user-agent") || "Unknown device";
      await supabase
        .from("trusted_devices")
        .insert({
          user_id,
          device_fingerprint,
          device_name: userAgent.substring(0, 100),
        });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "check") {
      // Check if device verification is required for user
      const { user_id, device_fingerprint }: VerificationRequest = await req.json();

      // Get user's device verification settings
      const { data: settings } = await supabase
        .from("device_verification")
        .select("enabled, verification_email")
        .eq("user_id", user_id)
        .single();

      if (!settings?.enabled || !settings?.verification_email) {
        return new Response(
          JSON.stringify({ required: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if device is trusted
      const { data: trustedDevice } = await supabase
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user_id)
        .eq("device_fingerprint", device_fingerprint)
        .single();

      return new Response(
        JSON.stringify({ required: !trustedDevice }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in device verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
