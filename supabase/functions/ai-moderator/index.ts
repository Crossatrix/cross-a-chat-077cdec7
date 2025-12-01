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

    // Fetch the report details
    const { data: report, error: reportError } = await supabase
      .from('user_reports')
      .select(`
        id,
        reporter_id,
        reported_user_id,
        reason,
        status,
        profiles!user_reports_reported_user_id_fkey(username)
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }

    console.log(`[AI Moderator] Processing report against user ID: ${report.reported_user_id}`);

    // Fetch recent messages from the reported user (last 100 messages)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('user_id', report.reported_user_id)
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
            content: `You are an AI content moderator. Analyze the user's messages for violations of community guidelines.

Guidelines to check for violations:
1. Harassment, bullying, or personal attacks
2. Hate speech, discrimination, or threats
3. Spam, scams, or malicious content
4. Inappropriate or explicit content
5. Violence or threats of harm

Respond using this exact format:
VERDICT: [violation OR no_violation]
SEVERITY: [low OR medium OR high OR severe]
REASON: [Brief explanation in 1-2 sentences]
BAN_DAYS: [0-14, where 0 means no ban]

Severity guidelines:
- low: Minor infractions (1-3 days)
- medium: Repeated or moderate violations (3-7 days)
- high: Serious violations (7-10 days)
- severe: Extreme violations (10-14 days)`
          },
          {
            role: 'user',
            content: `Report reason: ${report.reason}

User's recent messages:
${messageHistory}`
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