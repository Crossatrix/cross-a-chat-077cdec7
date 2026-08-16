import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/utils/localCache";

export interface VideoCategoryItem {
  value: string;
  label: string;
  icon: string;
}

const DEFAULT_CATEGORIES: VideoCategoryItem[] = [
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "comedy", label: "Comedy", icon: "😂" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "sports", label: "Sports", icon: "⚽" },
  { value: "news", label: "News", icon: "📰" },
  { value: "tech", label: "Tech", icon: "💻" },
  { value: "cooking", label: "Cooking", icon: "🍳" },
  { value: "travel", label: "Travel", icon: "✈️" },
  { value: "art", label: "Art & Design", icon: "🎨" },
  { value: "fitness", label: "Fitness", icon: "💪" },
  { value: "vlog", label: "Vlog", icon: "📹" },
  { value: "other", label: "Other", icon: "📦" },
];

/** Live list. Mutated in place so existing static imports stay valid. */
export const VIDEO_CATEGORIES: VideoCategoryItem[] = [...DEFAULT_CATEGORIES];

export type VideoCategory = string;

const listeners = new Set<() => void>();
let loaded = false;
let loadingPromise: Promise<void> | null = null;

const notify = () => listeners.forEach((l) => l());

export const loadVideoCategories = async (force = false) => {
  if (loaded && !force) return;
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise = (async () => {
    const { data, error } = await supabase
      .from("video_categories" as any)
      .select("value, label, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (!error && data && data.length) {
      VIDEO_CATEGORIES.length = 0;
      (data as any[]).forEach((c) =>
        VIDEO_CATEGORIES.push({ value: c.value, label: c.label, icon: c.icon || "📦" })
      );
      notify();
    }
    loaded = true;
  })();
  await loadingPromise;
  loadingPromise = null;
};

/** Reactive access to the category list. */
export const useVideoCategories = (): VideoCategoryItem[] => {
  const [items, setItems] = useState<VideoCategoryItem[]>([...VIDEO_CATEGORIES]);
  useEffect(() => {
    const update = () => setItems([...VIDEO_CATEGORIES]);
    listeners.add(update);
    loadVideoCategories().then(update);
    return () => { listeners.delete(update); };
  }, []);
  return items;
};

export const getCategoryLabel = (value: string) => {
  const cat = VIDEO_CATEGORIES.find(c => c.value === value);
  return cat ? `${cat.icon} ${cat.label}` : value;
};

export const getCategoryIcon = (value: string) => {
  const cat = VIDEO_CATEGORIES.find(c => c.value === value);
  return cat?.icon || "📦";
};
