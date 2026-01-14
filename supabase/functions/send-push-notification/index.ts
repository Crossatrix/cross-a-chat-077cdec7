import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!firebaseServerKey) {
      console.error('FIREBASE_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushNotificationPayload = await req.json();
    const { recipientUserId, title, body, data } = payload;

    console.log(`Sending push notification to user: ${recipientUserId}`);
    console.log(`Title: ${title}, Body: ${body}`);

    // Get all push tokens for the recipient
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipientUserId);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user');
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} push token(s)`);

    // Send to all tokens
    const sendPromises = tokens.map(async ({ token }) => {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${firebaseServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title,
              body,
              icon: '/favicon.ico',
              click_action: data?.url || '/',
            },
            data: {
              ...data,
              title,
              body,
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channel_id: 'cross_chat_messages',
              },
            },
            webpush: {
              notification: {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                vibrate: [200, 100, 200],
              },
              fcm_options: {
                link: data?.url || '/',
              },
            },
          }),
        });

        const result = await response.json();
        console.log('FCM response:', JSON.stringify(result));

        // Handle invalid tokens
        if (result.failure > 0 && result.results) {
          for (const res of result.results) {
            if (res.error === 'NotRegistered' || res.error === 'InvalidRegistration') {
              console.log(`Removing invalid token: ${token.substring(0, 20)}...`);
              await supabase
                .from('push_tokens')
                .delete()
                .eq('token', token);
            }
          }
        }

        return { success: result.success > 0, token: token.substring(0, 20) };
      } catch (error) {
        console.error(`Error sending to token ${token.substring(0, 20)}:`, error);
        return { success: false, token: token.substring(0, 20), error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Push notifications sent: ${successCount}/${tokens.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: successCount > 0,
        sent: successCount,
        total: tokens.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
