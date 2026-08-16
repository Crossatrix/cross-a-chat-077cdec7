import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RadioPlayer from "@/components/radio/RadioPlayer";
import RadioBroadcasterPanel from "@/components/radio/RadioBroadcasterPanel";
import RadioChannelList, { RadioChannel } from "@/components/radio/RadioChannelList";

interface Props {
  currentUserId: string;
}

export default function RadioFeed({ currentUserId }: Props) {
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel | null>(null);
  const [isChannelBroadcaster, setIsChannelBroadcaster] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("radio_broadcasters")
        .select("user_id")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setIsBroadcaster(!!data);
    })();
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedChannelId) {
      setSelectedChannel(null);
      setIsChannelBroadcaster(false);
      return;
    }
    (async () => {
      const { data: channel } = await supabase
        .from("radio_channels" as any)
        .select("*")
        .eq("id", selectedChannelId)
        .maybeSingle();
      setSelectedChannel((channel as any) || null);

      const { data: membership } = await supabase
        .from("radio_channel_broadcasters" as any)
        .select("user_id")
        .eq("channel_id", selectedChannelId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      setIsChannelBroadcaster(!!membership);
    })();
  }, [selectedChannelId, currentUserId]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
      <RadioChannelList
        currentUserId={currentUserId}
        isBroadcaster={isBroadcaster}
        selectedChannelId={selectedChannelId}
        onSelect={setSelectedChannelId}
      />
      {selectedChannelId && selectedChannel ? (
        <>
          <RadioPlayer channelId={selectedChannelId} channelName={selectedChannel.name} />
          {isChannelBroadcaster && (
            <RadioBroadcasterPanel
              channelId={selectedChannelId}
              channelOwnerId={selectedChannel.created_by}
              userId={currentUserId}
            />
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Select a channel above to start listening.
        </p>
      )}
    </div>
  );
}
