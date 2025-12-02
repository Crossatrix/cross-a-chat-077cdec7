import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      throw new Error('Report ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[AI Moderator] Processing report ${reportId}`);

    // Fetch the report details including conversation context
    const { data: report, error: reportError } = await supabase
      .from('user_reports')
      .select(`
        id,
        reporter_id,
        reported_user_id,
        conversation_id,
        reason,
        status,
        profiles!user_reports_reported_user_id_fkey(username)
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }

    console.log(`[AI Moderator] Processing report against user ID: ${report.reported_user_id} in conversation: ${report.conversation_id}`);

    // Fetch messages ONLY from the specific conversation where the report was made
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('user_id', report.reported_user_id)
      .eq('conversation_id', report.conversation_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    console.log(`[AI Moderator] Retrieved ${messages?.length || 0} messages for analysis`);

    // Prepare messages for AI analysis
    const messageHistory = messages?.map(m => m.content).join('\n---\n') || 'No messages found';

    // Call Lovable AI for moderation analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a STRICT AI content moderator. Your job is to protect users from harmful behavior.

CRITICAL: The reporter has explicitly complained about this user's behavior. Take their report seriously and evaluate the messages in that context.

ZERO TOLERANCE for:
1. Harassment, bullying, intimidation, or personal attacks
2. Hate speech, discrimination, slurs, or derogatory language
3. Threats of violence or harm (direct or implied)
4. Sexual harassment or explicit content
5. Spam, scams, phishing, or malicious content
6. Doxxing or sharing private information

BE STRICT: If you see ANY patterns matching the reported behavior, issue a violation verdict. Even subtle violations should be taken seriously.

Respond using this exact format:
VERDICT: [violation OR no_violation]
SEVERITY: [low OR medium OR high OR severe]
REASON: [Detailed explanation referencing the report reason and specific message content]
BAN_DAYS: [1-14, where violations should result in meaningful bans]

Ban duration guidelines (BE STRICT):
- low: Minor infractions, first-time issues (2-4 days)
- medium: Clear violations, repeated issues (5-7 days)
- high: Serious violations, aggressive behavior (8-11 days)
- severe: Extreme violations, dangerous content (12-14 days)

IMPORTANT: If the reported behavior is evident in the messages, issue a violation verdict. Err on the side of protecting the community.`
          },
          {
            role: 'user',
            content: `REPORT SUBMITTED BY USER: "${report.reason}"

This is what the reporter is complaining about. Analyze the following messages from the reported user in this specific conversation and determine if they match or support the reported behavior:

User's messages in this conversation:
${messageHistory}

Remember: The reporter felt strongly enough to file this complaint. Evaluate whether the messages contain or show patterns of the reported behavior.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0]?.message?.content || '';

    console.log(`[AI Moderator] AI Analysis:\n${aiAnalysis}`);

    // Parse AI response
    const verdictMatch = aiAnalysis.match(/VERDICT:\s*(violation|no_violation)/i);
    const severityMatch = aiAnalysis.match(/SEVERITY:\s*(low|medium|high|severe)/i);
    const reasonMatch = aiAnalysis.match(/REASON:\s*(.+?)(?:\n|$)/i);
    const banDaysMatch = aiAnalysis.match(/BAN_DAYS:\s*(\d+)/i);

    const verdict = verdictMatch?.[1]?.toLowerCase() || 'no_violation';
    const severity = severityMatch?.[1]?.toLowerCase() || 'low';
    const reason = reasonMatch?.[1]?.trim() || 'AI analysis completed';
    const banDays = parseInt(banDaysMatch?.[1] || '0', 10);

    console.log(`[AI Moderator] Verdict: ${verdict}, Severity: ${severity}, Ban Days: ${banDays}`);

    // Update the report with AI review results
    const { error: updateError } = await supabase
      .from('user_reports')
      .update({
        ai_reviewed: true,
        ai_verdict: verdict,
        ai_reason: reason,
        ai_reviewed_at: new Date().toISOString(),
        status: verdict === 'violation' ? 'resolved' : 'pending',
      })
      .eq('id', reportId);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // If violation found and ban days > 0, create a temporary ban
    let banCreated = false;
    if (verdict === 'violation' && banDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + banDays);

      const { error: banError } = await supabase
        .from('user_bans')
        .insert({
          user_id: report.reported_user_id,
          banned_by: report.reporter_id,
          reason: `[AI Auto-Ban] ${reason}`,
          expires_at: expiresAt.toISOString(),
        });

      if (banError) {
        console.error(`[AI Moderator] Failed to create ban: ${banError.message}`);
      } else {
        banCreated = true;
        console.log(`[AI Moderator] User banned for ${banDays} days until ${expiresAt.toISOString()}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verdict,
        severity,
        reason,
        banDays,
        banCreated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[AI Moderator] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});