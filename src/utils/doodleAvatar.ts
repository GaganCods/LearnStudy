// Utility for Auto-Assigned & Customizable Doodle Art Profile Pictures

export interface DoodlePreset {
  id: string;
  name: string;
  style: string;
  seed: string;
  bgColor: string;
  tag: string;
}

export const DOODLE_STYLES = [
  { id: "fun-emoji", name: "Doodle Emoji", desc: "Vibrant hand-drawn doodle expressions" },
  { id: "bottts-neutral", name: "Doodle Bots", desc: "Cute tech & robot doodle avatars" },
  { id: "open-peeps", name: "Doodle Peeps", desc: "Hand-drawn doodle characters" },
  { id: "croodles", name: "Line Doodle", desc: "Clean minimalist doodle line-art" },
  { id: "big-smile", name: "Big Smile", desc: "Cheerful smiling doodle characters" },
  { id: "thumbs", name: "Thumb Peeps", desc: "Expressive thumb doodle avatars" },
  { id: "adventurer", name: "Doodle Adventurer", desc: "Playful character portraits" },
  { id: "micah", name: "Modern Line Art", desc: "Stylish modern doodle portraits" },
  { id: "lorelei", name: "Artistic Doodle", desc: "Creative hand-crafted illustrations" },
];

export const PRESET_DOODLE_AVATARS: DoodlePreset[] = [
  { id: "doodle-1", name: "Cosmic Bot", style: "bottts-neutral", seed: "CosmicBot99", bgColor: "#6366F1", tag: "Popular" },
  { id: "doodle-2", name: "Zen Peep", style: "open-peeps", seed: "ZenScholar42", bgColor: "#10B981", tag: "Trending" },
  { id: "doodle-3", name: "Happy Spark", style: "fun-emoji", seed: "HappySpark12", bgColor: "#F59E0B", tag: "Cheerful" },
  { id: "doodle-4", name: "Doodle Scholar", style: "croodles", seed: "SmartDoodle", bgColor: "#8B5CF6", tag: "Academic" },
  { id: "doodle-5", name: "Cheery Smile", style: "big-smile", seed: "SunnySmiles", bgColor: "#EF4444", tag: "Bright" },
  { id: "doodle-6", name: "Pixel Ninja", style: "thumbs", seed: "NinjaCode", bgColor: "#3B82F6", tag: "Tech" },
  { id: "doodle-7", name: "Artistic Micah", style: "micah", seed: "ArtistVibe", bgColor: "#14B8A6", tag: "Creative" },
  { id: "doodle-8", name: "Astro Peep", style: "adventurer", seed: "AstroExplorer", bgColor: "#EC4899", tag: "Explorer" },
  { id: "doodle-9", name: "Coffee Coder", style: "open-peeps", seed: "CoffeeCoderPro", bgColor: "#06B6D4", tag: "Focus" },
  { id: "doodle-10", name: "Cyber Bunny", style: "bottts-neutral", seed: "CyberBunny88", bgColor: "#D946EF", tag: "Cute" },
  { id: "doodle-11", name: "Mindful Owl", style: "fun-emoji", seed: "MindfulOwl", bgColor: "#84CC16", tag: "Zen" },
  { id: "doodle-12", name: "Starry Smile", style: "big-smile", seed: "StarryNight", bgColor: "#8B5CF6", tag: "Magic" },
  { id: "doodle-13", name: "Lofi Scholar", style: "croodles", seed: "LofiBeatsStudy", bgColor: "#64748B", tag: "Calm" },
  { id: "doodle-14", name: "Electric Wink", style: "fun-emoji", seed: "ElectricWink", bgColor: "#EAB308", tag: "Energetic" },
  { id: "doodle-15", name: "Playful Peep", style: "open-peeps", seed: "PlayfulStudy", bgColor: "#F97316", tag: "Fun" },
  { id: "doodle-16", name: "Quantum Bot", style: "bottts-neutral", seed: "QuantumBot", bgColor: "#2563EB", tag: "Sci-Fi" },
  { id: "doodle-17", name: "Sunny Lorelei", style: "lorelei", seed: "SunnyLorelei", bgColor: "#F59E0B", tag: "Artistic" },
  { id: "doodle-18", name: "Zen Master", style: "croodles", seed: "MasterZen99", bgColor: "#059669", tag: "Focus" },
  { id: "doodle-19", name: "Gamer Spark", style: "fun-emoji", seed: "GamerSpark", bgColor: "#A855F7", tag: "Gaming" },
  { id: "doodle-20", name: "Turbo Thumb", style: "thumbs", seed: "TurboThumb", bgColor: "#EF4444", tag: "Fast" },
  { id: "doodle-21", name: "Cosmic Explorer", style: "adventurer", seed: "CosmicExp", bgColor: "#3B82F6", tag: "Space" },
  { id: "doodle-22", name: "Chilly Penguin", style: "bottts-neutral", seed: "ChillyPenguin", bgColor: "#0284C7", tag: "Cool" },
  { id: "doodle-23", name: "Vibrant Peep", style: "open-peeps", seed: "VibrantPeep", bgColor: "#EC4899", tag: "Vivid" },
  { id: "doodle-24", name: "Golden Smile", style: "big-smile", seed: "GoldenSmile", bgColor: "#D97706", tag: "Premium" },
];

/**
 * Builds a DiceBear SVG avatar URL for doodle art
 */
export function buildDoodleAvatarUrl(style: string = "fun-emoji", seed: string = "Scholar"): string {
  const cleanSeed = encodeURIComponent(seed.trim() || "Scholar");
  const cleanStyle = style || "fun-emoji";
  return `https://api.dicebear.com/7.x/${cleanStyle}/svg?seed=${cleanSeed}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Deterministically generates an auto-assigned doodle art avatar URL based on user's name or email
 */
export function getAutoAssignedDoodleAvatar(identifier: string = "Scholar"): { url: string; preset: DoodlePreset } {
  const clean = (identifier || "Scholar").trim();
  
  // Calculate deterministic simple hash from string
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % PRESET_DOODLE_AVATARS.length;
  const preset = PRESET_DOODLE_AVATARS[index];
  
  // Use preset style and seed directly so preview and assigned avatar are 100% identical
  const url = buildDoodleAvatarUrl(preset.style, preset.seed);
  
  return { url, preset };
}

/**
 * Get effective user avatar URL (custom or auto-assigned doodle)
 */
export function getEffectiveAvatarUrl(userName?: string, customAvatarUrl?: string, customSeed?: string, customStyle?: string): string {
  if (customAvatarUrl && customAvatarUrl.trim().length > 0) {
    return customAvatarUrl;
  }
  if (customSeed && customSeed.trim().length > 0) {
    let style = customStyle;
    if (!style) {
      const matched = PRESET_DOODLE_AVATARS.find((p) => p.seed === customSeed);
      if (matched) {
        style = matched.style;
      }
    }
    return buildDoodleAvatarUrl(style || "fun-emoji", customSeed);
  }
  return getAutoAssignedDoodleAvatar(userName || "Scholar").url;
}
