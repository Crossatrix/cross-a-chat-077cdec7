import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RadioPlayer from "@/components/radio/RadioPlayer";
import RadioBroadcasterPanel from "@/components/radio/RadioBroadcasterPanel";

interface Props {
  currentUserId: string;
}

export default function RadioFeed({ currentUserId }: Props) {
  const [isBroadcaster, setIsBroadcaster] = useState(false);

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

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
      <RadioPlayer />
      {isBroadcaster && <RadioBroadcasterPanel userId={currentUserId} />}
    </div>
  );
}
