const CROINS_API = "https://digjxtmzafzcgytgcwmb.supabase.co/functions/v1/croins";

export const getBalance = async (userId: string): Promise<number> => {
  try {
    const res = await fetch(CROINS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "balance", user_id: userId }),
    });
    const data = await res.json();
    return data?.balance ?? 0;
  } catch {
    return 0;
  }
};

export const creditCroins = async (userId: string, amount: number, description: string): Promise<boolean> => {
  try {
    const res = await fetch(CROINS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "credit", user_id: userId, amount, description }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const debitCroins = async (userId: string, amount: number, description: string): Promise<boolean> => {
  try {
    const res = await fetch(CROINS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "debit", user_id: userId, amount, description }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Award croins for a video view milestone.
 * Longform (>= 3 min): 1 croin per 10 views
 * Short (< 3 min): 1 croin per 50 views
 */
export const checkViewMilestone = (newViewCount: number, isShort: boolean): boolean => {
  const threshold = isShort ? 50 : 10;
  return newViewCount > 0 && newViewCount % threshold === 0;
};
