import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, migrate_user_id } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Verify credentials with Crossatrix API
    const crossatrixRes = await fetch(
      "https://digjxtmzafzcgytgcwmb.supabase.co/functions/v1/crossatrix-auth",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!crossatrixRes.ok) {
      const errData = await crossatrixRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: errData.error || "Invalid Crossatrix credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const crossatrixData = await crossatrixRes.json();
    const crossatrixUser = crossatrixData.user;

    if (!crossatrixUser) {
      return new Response(JSON.stringify({ error: "Invalid response from Crossatrix" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Sign in or create user locally
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Try to sign in with the same credentials locally
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInData?.session) {
      // User exists locally, handle migration if requested
      if (migrate_user_id) {
        await handleMigration(supabaseAdmin, migrate_user_id, signInData.user.id);
      }
      return new Response(
        JSON.stringify({
          session: signInData.session,
          user: signInData.user,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User doesn't exist locally — create them
    const username =
      crossatrixUser.user_metadata?.username ||
      crossatrixUser.user_metadata?.display_name ||
      email.split("@")[0];

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (createError) {
      console.error("Failed to create local user:", createError);
      return new Response(JSON.stringify({ error: "Failed to create local account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle migration if requested
    if (migrate_user_id && newUser.user) {
      await handleMigration(supabaseAdmin, migrate_user_id, newUser.user.id);
    }

    // Sign in the newly created user to get a session
    const { data: newSignIn, error: newSignInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (newSignInError || !newSignIn.session) {
      return new Response(JSON.stringify({ error: "Account created but sign-in failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        session: newSignIn.session,
        user: newSignIn.user,
        is_new: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Crossatrix login error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleMigration(
  supabaseAdmin: any,
  oldUserId: string,
  newUserId: string
) {
  try {
    // Update profile data: copy avatar, bio, etc. from old to new
    const { data: oldProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", oldUserId)
      .maybeSingle();

    if (oldProfile) {
      await supabaseAdmin
        .from("profiles")
        .update({
          avatar_url: oldProfile.avatar_url,
          bio: oldProfile.bio,
          text_hue: oldProfile.text_hue,
          text_saturation: oldProfile.text_saturation,
          text_lightness: oldProfile.text_lightness,
          age_verified: oldProfile.age_verified,
        })
        .eq("id", newUserId);

      // Migrate roles
      const { data: oldRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", oldUserId);

      if (oldRoles) {
        for (const r of oldRoles) {
          if (r.role !== "user") {
            await supabaseAdmin
              .from("user_roles")
              .upsert({ user_id: newUserId, role: r.role }, { onConflict: "user_id,role" });
          }
        }
      }

      // Migrate video follows
      await supabaseAdmin
        .from("video_follows")
        .update({ follower_id: newUserId })
        .eq("follower_id", oldUserId);

      await supabaseAdmin
        .from("video_follows")
        .update({ following_id: newUserId })
        .eq("following_id", oldUserId);
    }
  } catch (err) {
    console.error("Migration error (non-fatal):", err);
  }
}
