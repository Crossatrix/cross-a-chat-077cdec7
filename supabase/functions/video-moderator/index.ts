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

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Video Moderator] Processing report ${reportId}`);

    // Fetch the report with video details
    const { data: report, error: reportError } = await supabase
      .from('video_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('title, description, category, user_id, video_url')
      .eq('id', report.video_id)
      .single();

    if (videoError || !video) {
      throw new Error(`Failed to fetch video: ${videoError?.message}`);
    }

    // Fetch creator profile
    const { data: creator } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', video.user_id)
      .single();

    // Fetch comments on the video for additional context
    const { data: comments } = await supabase
      .from('video_comments')
      .select('content, user_id')
      .eq('video_id', report.video_id)
      .order('created_at', { ascending: false })
      .limit(50);

    const commentText = comments?.map(c => c.content).join('\n') || 'No comments';

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: `You are an AI video content moderator. You review reported videos based on their metadata, description, and comments. You cannot watch the video itself, but you analyze all available text context.

Evaluate the report and determine if the video likely violates community guidelines based on:
1. Video title and description
2. Video category
3. Comments on the video
4. The reporter's stated reason

VIOLATIONS include:
- Inappropriate/explicit content
- Hate speech or discrimination
- Harassment or bullying
- Misleading/dangerous content
- Spam or scams
- Copyright concerns
- Violence or graphic content

Respond using this exact format:
VERDICT: [likely_violation OR no_violation OR needs_review]
SEVERITY: [low OR medium OR high OR severe]
REASON: [Detailed explanation of your analysis]
RECOMMENDATION: [What action admins should consider taking]

Note: Since you cannot watch the video, if the title/description/comments seem normal but the report suggests visual content issues, use "needs_review" verdict to flag for human review.`
          },
          {
            role: 'user',
            content: `REPORT REASON: "${report.reason}"

VIDEO DETAILS:
- Title: "${video.title}"
- Description: "${video.description || 'No description'}"
- Category: "${video.category}"
- Creator: "${creator?.username || 'Unknown'}"

RECENT COMMENTS ON VIDEO:
${commentText}

Analyze this report and provide your assessment.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0]?.message?.content || '';

    console.log(`[Video Moderator] AI Analysis:\n${aiAnalysis}`);

    // Parse AI response
    const verdictMatch = aiAnalysis.match(/VERDICT:\s*(likely_violation|no_violation|needs_review)/i);
    const severityMatch = aiAnalysis.match(/SEVERITY:\s*(low|medium|high|severe)/i);
    const reasonMatch = aiAnalysis.match(/REASON:\s*(.+?)(?:\nRECOMMENDATION|\n|$)/is);
    const recommendationMatch = aiAnalysis.match(/RECOMMENDATION:\s*(.+?)$/is);

    const verdict = verdictMatch?.[1]?.toLowerCase() || 'needs_review';
    const reason = reasonMatch?.[1]?.trim() || 'AI analysis completed';
    const recommendation = recommendationMatch?.[1]?.trim() || '';

    // Update report with AI results
    const { error: updateError } = await supabase
      .from('video_reports')
      .update({
        ai_reviewed: true,
        ai_verdict: verdict,
        ai_reason: `${reason}${recommendation ? `\n\nRecommendation: ${recommendation}` : ''}`,
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verdict,
        reason,
        recommendation,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Video Moderator] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
