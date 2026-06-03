export type InstantAction = "chat" | "video" | "music" | "subcross";

const BETA_LINK_SHARE_KEY = "beta_feat_link_share";
export const getBetaLinkShareEnabled = () => localStorage.getItem(BETA_LINK_SHARE_KEY) === "1";
export const setBetaLinkShareEnabled = (v: boolean) =>
  localStorage.setItem(BETA_LINK_SHARE_KEY, v ? "1" : "0");

const BASE_URL = "https://cross-a-chat.lovable.app";

export const buildInstantLink = (action: InstantAction, id: string): string =>
  `${BASE_URL}/instant-link?action=${action}&id=${encodeURIComponent(id)}`;

export const INSTANT_LS_KEY = "instant_link_pending";

export interface PendingInstantLink {
  action: InstantAction;
  id: string;
  ts: number;
}

export const storePendingInstantLink = (action: InstantAction, id: string) => {
  sessionStorage.setItem(
    INSTANT_LS_KEY,
    JSON.stringify({ action, id, ts: Date.now() } as PendingInstantLink),
  );
};

export const consumePendingInstantLink = (): PendingInstantLink | null => {
  const raw = sessionStorage.getItem(INSTANT_LS_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(INSTANT_LS_KEY);
  try {
    return JSON.parse(raw) as PendingInstantLink;
  } catch {
    return null;
  }
};
