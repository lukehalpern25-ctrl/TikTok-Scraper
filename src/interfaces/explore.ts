import type { AuthorMeta } from "./author";
import type { DetailedMention, Hashtag, MusicMeta, VideoMeta } from "./discover";

// Extra types for stickers & optional location
export interface StickerStats {
  useCount: number;
}

export interface EffectSticker {
  ID: string;
  name: string;
  stickerStats: StickerStats;
}

export interface LocationMeta {
  address: string;
  city: string;
  cityCode: string;
  countryCode: string;
  locationName: string;
  locationId: string;
}

// Explore page item & response
export interface ExploreItem {
  id: string;
  text: string;
  textLanguage: string;
  createTime: number;
  createTimeISO: string;
  isAd: boolean;

  authorMeta: AuthorMeta;      // from your existing type
  musicMeta: MusicMeta;        // from your existing type
  webVideoUrl: string;
  mediaUrls: string[];
  videoMeta: VideoMeta;        // from your existing type

  diggCount: number;
  shareCount: number;
  playCount: number;
  collectCount: number;
  commentCount: number;

  mentions: string[];
  detailedMentions: DetailedMention[]; // from your existing type
  hashtags: Hashtag[];                 // from your existing type
  effectStickers: EffectSticker[];

  isSlideshow: boolean;
  isPinned: boolean;
  isSponsored: boolean;
  input: string;

  // present only on some items
  locationMeta?: LocationMeta;
}

export interface ExploreResponse {
  items: ExploreItem[];
  total: number;
  offset: number;
  count: number;
  limit: number;
  desc: boolean;
}
