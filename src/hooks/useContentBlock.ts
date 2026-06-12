import { useEffect, useState } from "react";
import { getContentBlock, type ContentBlockInfo } from "@/utils/contentBlock";

export function useContentBlock(userId: string | undefined) {
  const [info, setInfo] = useState<ContentBlockInfo>({ blocked: false, reason: null, expires_at: null });
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getContentBlock(userId).then((i) => { if (!cancelled) setInfo(i); });
    const t = setInterval(() => getContentBlock(userId).then((i) => { if (!cancelled) setInfo(i); }), 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [userId]);
  return info;
}
