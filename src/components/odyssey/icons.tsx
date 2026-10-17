import { Compass, Crown, Flame, Gem, HeartHandshake, Megaphone, MessageCircle, Music2, Scroll, Sparkles, Sunrise, Target, Users, Vote, Waypoints, type LucideIcon } from "lucide-react";
import type { IconKey, Tier } from "@/lib/achievements";

export const BADGE_ICON: Record<IconKey, LucideIcon> = {
  spark: Sparkles,
  megaphone: Megaphone,
  heart: HeartHandshake,
  flame: Flame,
  vote: Vote,
  crystal: Gem,
  target: Target,
  music: Music2,
  chat: MessageCircle,
  compass: Compass,
  bridge: Waypoints,
  crown: Crown,
  scroll: Scroll,
  users: Users,
  sunrise: Sunrise,
};

/** Metallic gradients per tier (light, mid, dark). */
export const TIER_METAL: Record<Tier, [string, string, string]> = {
  bronze: ["#f3c08f", "#c77f45", "#6e3d1a"],
  silver: ["#f4f6fa", "#b8c0cc", "#5d6573"],
  gold: ["#fff1c2", "#ffbf5c", "#9c6510"],
};
