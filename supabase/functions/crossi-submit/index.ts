// Submits a file (typically an uploaded video URL) to Crossi Search.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CROSSI_KEY = Deno.env.get('Crossi_Search');
const CROSSI_URL = 'https://crossisearch.lovable.app/api/public/submit';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!CROSSI_KEY) {
      return new Response(JSON.stringify({ error: 'Crossi_Search secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { videoUrl, filename, mimeType } = body ?? {};
    if (!videoUrl || typeof videoUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'videoUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the file from storage
    const fileRes = await fetch(videoUrl);
    if (!fileRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch video: ${fileRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const buf = new Uint8Array(await fileRes.arrayBuffer());

    // base64 encode in chunks to avoid call-stack overflow on large files
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as any);
    }
    const content_base64 = btoa(binary);

    const safeName = (filename && String(filename).trim()) || 'video';
    const mime = mimeType || fileRes.headers.get('content-type') || 'video/mp4';

    const submitRes = await fetch(CROSSI_URL, {
      method: 'POST',
      headers: { 'x-api-key': CROSSI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'file', filename: safeName, mime_type: mime, content_base64 }),
    });

    const text = await submitRes.text();
    return new Response(JSON.stringify({ ok: submitRes.ok, status: submitRes.status, response: text }), {
      status: submitRes.ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
