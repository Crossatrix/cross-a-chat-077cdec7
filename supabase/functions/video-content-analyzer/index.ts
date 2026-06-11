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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Auth check
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = claims.claims.sub as string;

    const { videoId } = await req.json();
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authorization: only the video owner or staff can trigger analysis
    const { data: ownerCheck } = await supabase
      .from('videos').select('user_id').eq('id', videoId).single();
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: callerId });
    if (!ownerCheck || (ownerCheck.user_id !== callerId && !isStaff)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Video Analyzer] Analyzing video ${videoId}`);

    // Set video to pending moderation
    await supabase
      .from('videos')
      .update({ moderation_status: 'pending' })
      .eq('id', videoId);

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('title, description, category, user_id, video_url, adults_only')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error(`Failed to fetch video: ${videoError?.message}`);
    }

    // Download the video file
    let videoBase64: string | null = null;

    try {
      console.log(`[Video Analyzer] Downloading video from: ${video.video_url}`);
      const videoResponse = await fetch(video.video_url);

      if (videoResponse.ok) {
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoSizeMB = videoBuffer.byteLength / (1024 * 1024);
        console.log(`[Video Analyzer] Video size: ${videoSizeMB.toFixed(2)} MB`);

        const uint8Array = new Uint8Array(videoBuffer);
        let binary = '';
        // Process in chunks to avoid call stack issues
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
        }
        videoBase64 = btoa(binary);
        console.log(`[Video Analyzer] Video encoded for AI analysis`);
      } else {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }
    } catch (downloadErr) {
      console.error(`[Video Analyzer] Error downloading video:`, downloadErr);
      // If we can't download, approve by default and log the error
      await supabase
        .from('videos')
        .update({ moderation_status: 'approved' })
        .eq('id', videoId);
      throw downloadErr;
    }

    // Build multimodal message content
    const userContent: any[] = [];

    if (videoBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:video/mp4;base64,${videoBase64}`,
        },
      });
    }

    userContent.push({
      type: "text",
      text: `Analyze this uploaded video for content violations.

VIDEO METADATA:
- Title: "${video.title}"
- Description: "${video.description || 'No description'}"
- Category: "${video.category}"
- Marked as 18+ by creator: No

Review the ACTUAL VIDEO CONTENT and determine:
1. Does this video contain adult/sexual/18+ content?
2. Does this video contain potentially copyrighted material (music, movie clips, TV shows, etc.)?
3. Does this video contain illegal content (drug manufacturing, weapons instructions, child exploitation, terrorism, etc.)?

Respond using this EXACT format:
ADULT_CONTENT: [yes OR no]
COPYRIGHT: [yes OR no]
ILLEGAL: [yes OR no]
STRUCK: [yes OR no]
REASONS: [Detailed list of all violations found, or "No violations detected" if clean]

IMPORTANT: Set STRUCK to "yes" if ANY of ADULT_CONTENT, COPYRIGHT, or ILLEGAL is "yes".`,
    });

    // Use GPT-5 Mini as requested
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a strict video content moderator. You analyze uploaded videos for:
1. Adult/18+ content (nudity, sexual content, graphic violence)
2. Copyright violations (copyrighted music, movie/TV clips, branded content used without permission)
3. Illegal content (drug production, weapons manufacturing instructions, CSAM, terrorism promotion, fraud tutorials)

Be thorough but fair. Only flag content that genuinely violates these categories. Borderline content should be flagged for safety.`,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        // Rate limited - approve for now, don't block the upload
        await supabase
          .from('videos')
          .update({ moderation_status: 'approved' })
          .eq('id', videoId);
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, video approved by default.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        await supabase
          .from('videos')
          .update({ moderation_status: 'approved' })
          .eq('id', videoId);
        return new Response(JSON.stringify({ error: 'Payment required, video approved by default.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0]?.message?.content || '';

    console.log(`[Video Analyzer] AI Analysis:\n${aiAnalysis}`);

    // Parse results
    const struckMatch = aiAnalysis.match(/STRUCK:\s*(yes|no)/i);
    const reasonsMatch = aiAnalysis.match(/REASONS:\s*(.+?)$/is);
    const adultMatch = aiAnalysis.match(/ADULT_CONTENT:\s*(yes|no)/i);
    const copyrightMatch = aiAnalysis.match(/COPYRIGHT:\s*(yes|no)/i);
    const illegalMatch = aiAnalysis.match(/ILLEGAL:\s*(yes|no)/i);

    const isStruck = struckMatch?.[1]?.toLowerCase() === 'yes';
    const reasons = reasonsMatch?.[1]?.trim() || 'AI analysis completed';

    // Build detailed reason
    const violationTypes: string[] = [];
    if (adultMatch?.[1]?.toLowerCase() === 'yes') violationTypes.push('Adult/18+ content');
    if (copyrightMatch?.[1]?.toLowerCase() === 'yes') violationTypes.push('Copyright violation');
    if (illegalMatch?.[1]?.toLowerCase() === 'yes') violationTypes.push('Illegal content');

    const moderationReason = isStruck
      ? `Violations: ${violationTypes.join(', ')}\n\n${reasons}`
      : null;

    // Update video status
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        moderation_status: isStruck ? 'struck' : 'approved',
        moderation_reason: moderationReason,
        // If adult content detected but not other violations, auto-mark as 18+
        ...(adultMatch?.[1]?.toLowerCase() === 'yes' && !copyrightMatch?.[1]?.toLowerCase().includes('yes') && !illegalMatch?.[1]?.toLowerCase().includes('yes')
          ? { adults_only: true, moderation_status: 'approved', moderation_reason: 'Auto-marked as 18+ by AI content analysis' }
          : {}),
      })
      .eq('id', videoId);

    if (updateError) {
      throw new Error(`Failed to update video: ${updateError.message}`);
    }

    // Determine final status more cleanly
    let finalStatus = 'approved';
    if (isStruck) {
      // If ONLY adult content, auto-mark as 18+ and approve
      if (violationTypes.length === 1 && violationTypes[0] === 'Adult/18+ content') {
        finalStatus = 'approved_18plus';
        await supabase
          .from('videos')
          .update({
            moderation_status: 'approved',
            moderation_reason: 'Auto-marked as 18+ by AI content analysis: ' + reasons,
            adults_only: true,
          })
          .eq('id', videoId);
      } else {
        finalStatus = 'struck';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        struck: finalStatus === 'struck',
        autoMarked18Plus: finalStatus === 'approved_18plus',
        violations: violationTypes,
        reasons,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Video Analyzer] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
