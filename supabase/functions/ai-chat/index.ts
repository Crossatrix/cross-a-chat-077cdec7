import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

const { conversationId, userMessage, model = "google/gemini-2.5-flash", generateImage = false } = await req.json();
    console.log('AI Chat request:', { conversationId, userMessage, model, generateImage });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    // Calculate credit cost based on model/action
    let creditCost = 1; // Default for normal (gpt-5-mini)
    if (generateImage) {
      creditCost = 5;
    } else if (model === "openai/gpt-5-nano") {
      creditCost = 0.5;
    } else if (model === "openai/gpt-5-mini") {
      creditCost = 1;
    } else if (model === "openai/gpt-5") {
      creditCost = 1.5;
    }
    console.log('Credit cost:', creditCost);

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create client with anon key to verify user auth
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated and is a conversation participant
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to bypass RLS for bot operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check and deduct AI credits
    const { data: creditResult, error: creditError } = await supabase.rpc('deduct_ai_credits', {
      p_user_id: user.id,
      p_amount: creditCost
    });

    if (creditError) {
      console.error('Credit check error:', creditError);
      return new Response(
        JSON.stringify({ error: "Failed to check credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creditResult) {
      // Get current credits to show in error
      const { data: credits } = await supabase.rpc('get_or_reset_ai_credits', { p_user_id: user.id });
      return new Response(
        JSON.stringify({ error: `Not enough credits. You have ${credits ?? 0} credits, but this action costs ${creditCost}.` }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is a participant in this conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participant) {
      return new Response(
        JSON.stringify({ error: "Not a conversation participant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch conversation history for context
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, user_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    // Build conversation history for AI
    const conversationHistory = messages.map(msg => ({
      role: msg.user_id === AI_BOT_ID ? 'assistant' : 'user',
      content: msg.content
    }));

    // Call Lovable AI
    const requestBody: any = {
      messages: [
        { 
          role: "system", 
          content: "You are a friendly AI assistant in a chat application called Cross Chat. Be helpful, conversational, and concise. Keep responses engaging and natural." 
        },
        ...conversationHistory,
      ],
    };

    // Use image generation model if requested, otherwise use specified model
    if (generateImage) {
      requestBody.model = "google/gemini-2.5-flash-image-preview";
      requestBody.modalities = ["image", "text"];
    } else {
      requestBody.model = model;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    let imageUrl = null;

    // Check if response includes an image
    if (data.choices[0].message.images && data.choices[0].message.images.length > 0) {
      imageUrl = data.choices[0].message.images[0].image_url.url;
      console.log('AI generated image');
    }

    console.log('AI response generated:', aiResponse);

    // Insert AI's response as a message
    const messageData: any = {
      conversation_id: conversationId,
      user_id: AI_BOT_ID,
      content: aiResponse || "Generated an image",
    };

    // If there's an image, upload it to storage
    if (imageUrl) {
      // Convert base64 to blob
      const base64Data = imageUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const fileName = `ai-generated-${Date.now()}.png`;
      const filePath = `${conversationId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, binaryData, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);
        messageData.image_url = publicUrl;
      }
    }

    const { error: insertError } = await supabase
      .from('messages')
      .insert(messageData);

    if (insertError) {
      console.error('Error inserting AI message:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, response: aiResponse }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});