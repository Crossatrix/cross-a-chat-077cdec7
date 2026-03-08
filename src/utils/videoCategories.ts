export const VIDEO_CATEGORIES = [
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
] as const;

export type VideoCategory = typeof VIDEO_CATEGORIES[number]["value"];

export const getCategoryLabel = (value: string) => {
  const cat = VIDEO_CATEGORIES.find(c => c.value === value);
  return cat ? `${cat.icon} ${cat.label}` : value;
};

export const getCategoryIcon = (value: string) => {
  const cat = VIDEO_CATEGORIES.find(c => c.value === value);
  return cat?.icon || "📦";
};
