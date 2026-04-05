import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CROSSATRIX_AUTH_URL = "https://digjxtmzafzcgytgcwmb.supabase.co/functions/v1/crossatrix-auth";
const DEFAULT_ROLE = "user";

type CrossatrixUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type UserActivity = {
  videos: number;
  posts: number;
  messages: number;
  chats: number;
  total: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const migrateUserId =
      typeof body.migrate_user_id === "string" && body.migrate_user_id.trim().length > 0
        ? body.migrate_user_id.trim()
        : null;

    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;

    const crossatrixUser = await verifyCrossatrixCredentials(email, password);
    const { username: crossatrixUsername, isExplicit: isExplicitUsername } = extractCrossatrixUsername(crossatrixUser, email);
    const localPassword = await deriveLocalPassword(email, password, serviceRoleKey);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuth = createClient(supabaseUrl, anonKey);

    const existingLocalUser = await findUserByEmail(supabaseAdmin, email);
    const migrationSourceId = await resolveMigrationSourceId(supabaseAdmin, {
      desiredUsername: crossatrixUsername,
      explicitUserId: migrateUserId,
      existingLocalUserId: existingLocalUser?.id ?? null,
    });

    let targetUserId = existingLocalUser?.id ?? null;
    let isNew = false;

    if (existingLocalUser) {
      await syncAuthCredentials(supabaseAdmin, existingLocalUser.id, email, localPassword, crossatrixUsername);

      if (migrationSourceId && migrationSourceId !== existingLocalUser.id) {
        await migrateLegacyAccount(supabaseAdmin, migrationSourceId, existingLocalUser.id, crossatrixUsername);
      } else if (isExplicitUsername) {
        // Only sync profile username if Crossatrix has an explicit username/display_name set
        await syncProfileUsername(supabaseAdmin, existingLocalUser.id, crossatrixUsername);
      }
      // If not explicit, keep existing profile username as-is
    } else if (migrationSourceId) {
      await repurposeLegacyAccount(supabaseAdmin, migrationSourceId, email, localPassword, crossatrixUsername);
      targetUserId = migrationSourceId;
    } else {
      const finalUsername = await makeAvailableUsername(supabaseAdmin, crossatrixUsername, []);
      const newUser = await createLocalUser(supabaseAdmin, email, localPassword, finalUsername);
      targetUserId = newUser.id;
      isNew = true;
    }

    const signInData = await signInLocalUser(supabaseAuth, email, localPassword);

    return jsonResponse(
      {
        session: signInData.session,
        user: signInData.user,
        is_new: isNew,
        migrated: Boolean(migrationSourceId && migrationSourceId !== targetUserId),
      },
      200,
    );
  } catch (error) {
    console.error("Crossatrix login error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function verifyCrossatrixCredentials(email: string, password: string): Promise<CrossatrixUser> {
  const response = await fetch(CROSSATRIX_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Invalid Crossatrix credentials");
  }

  if (!data.user) {
    throw new Error("Invalid response from Crossatrix");
  }

  return data.user;
}

function extractCrossatrixUsername(user: CrossatrixUser, email: string): { username: string; isExplicit: boolean } {
  const metadata = user.user_metadata || {};
  // Only username or display_name count as "explicit" – email prefix is just a fallback
  if (typeof metadata.username === "string" && metadata.username.trim().length > 0) {
    return { username: metadata.username.trim(), isExplicit: true };
  }
  if (typeof metadata.display_name === "string" && metadata.display_name.trim().length > 0) {
    return { username: metadata.display_name.trim(), isExplicit: true };
  }
  // Fallback to email prefix – NOT explicit
  const fallback = (user.email?.split("@")[0] || email.split("@")[0] || `user_${Date.now().toString(36)}`).trim();
  return { username: fallback, isExplicit: false };
}

async function findUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to load local accounts: ${error.message}`);
    }

    const users = data?.users || [];
    const match = users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function resolveMigrationSourceId(
  supabaseAdmin: any,
  options: { desiredUsername: string; explicitUserId: string | null; existingLocalUserId: string | null },
) {
  if (options.explicitUserId) {
    return options.explicitUserId;
  }

  const legacyProfile = await findProfileByUsername(supabaseAdmin, options.desiredUsername);

  if (!legacyProfile || legacyProfile.id === options.existingLocalUserId) {
    return null;
  }

  if (!options.existingLocalUserId) {
    return legacyProfile.id;
  }

  const [legacyActivity, currentActivity] = await Promise.all([
    getUserActivity(supabaseAdmin, legacyProfile.id),
    getUserActivity(supabaseAdmin, options.existingLocalUserId),
  ]);

  if (legacyActivity.total === 0 && currentActivity.total > 0) {
    return null;
  }

  return legacyActivity.total > currentActivity.total ? legacyProfile.id : null;
}

async function findProfileByUsername(supabaseAdmin: any, username: string) {
  const { data: exactMatch } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (exactMatch) {
    return exactMatch;
  }

  const { data: caseInsensitiveMatch } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  return caseInsensitiveMatch;
}

async function getUserActivity(supabaseAdmin: any, userId: string): Promise<UserActivity> {
  const [videos, posts, messages, chats] = await Promise.all([
    countRows(supabaseAdmin, "videos", "user_id", userId),
    countRows(supabaseAdmin, "posts", "user_id", userId),
    countRows(supabaseAdmin, "messages", "user_id", userId),
    countRows(supabaseAdmin, "conversation_participants", "user_id", userId),
  ]);

  return {
    videos,
    posts,
    messages,
    chats,
    total: videos + posts + messages + chats,
  };
}

async function countRows(supabaseAdmin: any, table: string, column: string, userId: string) {
  const { count } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq(column, userId);
  return count || 0;
}

async function syncAuthCredentials(
  supabaseAdmin: any,
  userId: string,
  email: string,
  localPassword: string,
  username: string,
) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email,
    password: localPassword,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    throw new Error(`Failed to sync local account: ${error.message}`);
  }
}

async function createLocalUser(supabaseAdmin: any, email: string, password: string, username: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Failed to create local account");
  }

  return data.user;
}

async function signInLocalUser(supabaseAuth: any, email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    throw new Error(error?.message || "Account synced but sign-in failed");
  }

  return data;
}

async function repurposeLegacyAccount(
  supabaseAdmin: any,
  legacyUserId: string,
  email: string,
  localPassword: string,
  username: string,
) {
  await syncAuthCredentials(supabaseAdmin, legacyUserId, email, localPassword, username);
  await syncProfileUsername(supabaseAdmin, legacyUserId, username);
}

async function deriveLocalPassword(email: string, password: string, salt: string) {
  const payload = new TextEncoder().encode(`${salt}::${email}::${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", payload);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `CxA1!${hash}`;
}

async function syncProfileUsername(supabaseAdmin: any, userId: string, desiredUsername: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();

  if (!profile) {
    return;
  }

  const nextUsername = await makeAvailableUsername(supabaseAdmin, desiredUsername, [userId]);

  if (nextUsername !== profile.username) {
    await supabaseAdmin.from("profiles").update({ username: nextUsername }).eq("id", userId);
  }
}

async function makeAvailableUsername(supabaseAdmin: any, preferredUsername: string, allowedUserIds: string[]) {
  const baseUsername = preferredUsername.trim() || `user_${Date.now().toString(36)}`;
  const normalizedAllowed = new Set(allowedUserIds.filter(Boolean));

  const isAvailable = async (username: string) => {
    const { data } = await supabaseAdmin.from("profiles").select("id").eq("username", username).maybeSingle();
    return !data || normalizedAllowed.has(data.id);
  };

  if (await isAvailable(baseUsername)) {
    return baseUsername;
  }

  const safeBase = baseUsername.replace(/\s+/g, "_");

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const candidate = `${safeBase}_${attempt}`;

    if (await isAvailable(candidate)) {
      return candidate;
    }
  }

  return `${safeBase}_${Date.now().toString(36)}`;
}

async function migrateLegacyAccount(
  supabaseAdmin: any,
  oldUserId: string,
  newUserId: string,
  desiredUsername: string,
) {
  if (oldUserId === newUserId) {
    return;
  }

  const { data: oldProfile } = await supabaseAdmin.from("profiles").select("*").eq("id", oldUserId).maybeSingle();
  const { data: newProfile } = await supabaseAdmin.from("profiles").select("*").eq("id", newUserId).maybeSingle();

  if (!oldProfile || !newProfile) {
    return;
  }

  const migratedUsername = await prepareMigratedUsername(
    supabaseAdmin,
    desiredUsername || oldProfile.username || newProfile.username,
    oldUserId,
    newUserId,
  );

  await supabaseAdmin
    .from("profiles")
    .update({
      username: migratedUsername,
      avatar_url: oldProfile.avatar_url,
      bio: oldProfile.bio,
      text_hue: oldProfile.text_hue,
      text_saturation: oldProfile.text_saturation,
      text_lightness: oldProfile.text_lightness,
      age_verified: oldProfile.age_verified,
      show_online_status: oldProfile.show_online_status,
      allow_group_invites_from_strangers: oldProfile.allow_group_invites_from_strangers,
    })
    .eq("id", newUserId);

  await copyRoles(supabaseAdmin, oldUserId, newUserId);
  await migrateConversationParticipants(supabaseAdmin, oldUserId, newUserId);
  await migrateDirectReferences(supabaseAdmin, oldUserId, newUserId);
  await retireLegacyAccount(supabaseAdmin, oldUserId, oldProfile.username, newUserId);
}

async function prepareMigratedUsername(
  supabaseAdmin: any,
  desiredUsername: string,
  oldUserId: string,
  newUserId: string,
) {
  const { data: owner } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", desiredUsername)
    .maybeSingle();

  if (owner?.id === oldUserId) {
    const archivedUsername = await makeAvailableUsername(
      supabaseAdmin,
      `${desiredUsername}_legacy`,
      [oldUserId],
    );

    await supabaseAdmin.from("profiles").update({ username: archivedUsername }).eq("id", oldUserId);
    return desiredUsername;
  }

  return makeAvailableUsername(supabaseAdmin, desiredUsername, [newUserId]);
}

async function copyRoles(supabaseAdmin: any, oldUserId: string, newUserId: string) {
  const { data: oldRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", oldUserId);

  if (!oldRoles?.length) {
    return;
  }

  for (const roleRow of oldRoles) {
    if (roleRow.role === DEFAULT_ROLE) {
      continue;
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: newUserId, role: roleRow.role },
      { onConflict: "user_id,role" },
    );
  }
}

async function migrateConversationParticipants(supabaseAdmin: any, oldUserId: string, newUserId: string) {
  const { data: oldRows } = await supabaseAdmin
    .from("conversation_participants")
    .select("id, conversation_id")
    .eq("user_id", oldUserId);

  if (!oldRows?.length) {
    return;
  }

  for (const row of oldRows) {
    const { data: alreadyExists } = await supabaseAdmin
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", row.conversation_id)
      .eq("user_id", newUserId)
      .maybeSingle();

    if (alreadyExists) {
      await supabaseAdmin.from("conversation_participants").delete().eq("id", row.id);
    } else {
      await supabaseAdmin.from("conversation_participants").update({ user_id: newUserId }).eq("id", row.id);
    }
  }
}

async function migrateDirectReferences(supabaseAdmin: any, oldUserId: string, newUserId: string) {
  const referenceMap: Array<{ table: string; columns: string[] }> = [
    { table: "videos", columns: ["user_id", "staff_rated_by"] },
    { table: "posts", columns: ["user_id"] },
    { table: "messages", columns: ["user_id"] },
    { table: "conversations", columns: ["created_by"] },
    { table: "video_follows", columns: ["follower_id", "following_id"] },
    { table: "video_likes", columns: ["user_id"] },
    { table: "video_comments", columns: ["user_id"] },
    { table: "video_ratings", columns: ["user_id"] },
    { table: "video_not_interested", columns: ["user_id", "creator_id"] },
    { table: "post_likes", columns: ["user_id"] },
    { table: "post_comments", columns: ["user_id"] },
    { table: "post_poll_votes", columns: ["user_id"] },
    { table: "message_reactions", columns: ["user_id"] },
    { table: "message_reads", columns: ["user_id"] },
    { table: "creator_verifications", columns: ["user_id", "verified_by"] },
    { table: "feedback", columns: ["user_id", "admin_response_by"] },
    { table: "push_tokens", columns: ["user_id"] },
    { table: "device_verification", columns: ["user_id"] },
    { table: "device_verification_codes", columns: ["user_id"] },
    { table: "trusted_devices", columns: ["user_id"] },
    { table: "user_blocks", columns: ["blocker_id", "blocked_user_id"] },
    { table: "group_blocks", columns: ["blocker_id", "blocked_user_id"] },
    { table: "blocked_categories", columns: ["user_id"] },
    { table: "video_category_views", columns: ["user_id"] },
    { table: "group_invites", columns: ["invited_by", "invited_user_id"] },
    { table: "user_bans", columns: ["user_id", "banned_by"] },
    { table: "user_reports", columns: ["reporter_id", "reported_user_id", "resolved_by"] },
    { table: "video_reports", columns: ["reporter_id", "resolved_by"] },
    { table: "user_warnings", columns: ["user_id"] },
    { table: "errors", columns: ["user_id"] },
    { table: "call_signals", columns: ["from_user_id", "to_user_id"] },
    { table: "featured_creators", columns: ["user_id", "granted_by"] },
    { table: "official_accounts", columns: ["user_id", "granted_by"] },
    { table: "changelog", columns: ["created_by"] },
    { table: "emoji_categories", columns: ["created_by"] },
    { table: "custom_emojis", columns: ["created_by"] },
    { table: "app_settings", columns: ["updated_by"] },
  ];

  for (const { table, columns } of referenceMap) {
    for (const column of columns) {
      const { error } = await supabaseAdmin.from(table).update({ [column]: newUserId }).eq(column, oldUserId);

      if (error) {
        console.error(`Migration warning for ${table}.${column}:`, error.message);
      }
    }
  }
}

async function retireLegacyAccount(
  supabaseAdmin: any,
  oldUserId: string,
  oldUsername: string,
  newUserId: string,
) {
  const archivedUsername = await makeAvailableUsername(
    supabaseAdmin,
    `${oldUsername || "user"}_archived`,
    [oldUserId],
  );

  await supabaseAdmin.from("profiles").update({ username: archivedUsername }).eq("id", oldUserId);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(oldUserId, {
    email: `migrated+${oldUserId}@crosschat.invalid`,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    user_metadata: { migrated_to: newUserId },
  });

  if (error) {
    console.error("Failed to retire legacy auth account:", error.message);
  }
}
