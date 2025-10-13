import type { AuthorMeta } from "./author";

export interface MusicMeta {
  musicName: string;
  musicAuthor: string;
  musicOriginal: boolean;
  playUrl: string;
  coverMediumUrl: string;
  originalCoverMediumUrl: string;
  musicId: string;
}

export interface LocationMeta {
  address: string;
  city: string;
  cityCode: string;
  countryCode: string;
  locationName: string;
  locationId: string;
}

export interface SubtitleLink {
  language: string;
  downloadLink: string;
  tiktokLink: string;
  source: string;
  sourceUnabbreviated: string;
  version: string;
}

export interface VideoMeta {
  height: number;
  width: number;
  duration: number;
  coverUrl: string;
  originalCoverUrl: string;
  definition: string;
  format: string;
  subtitleLinks: SubtitleLink[];
}

export interface Hashtag {
  name: string;
}

export interface StickerStats {
  useCount: number;
}

export interface EffectSticker {
  ID: string;
  name: string;
  stickerStats: StickerStats;
}

export interface SearchHashtag {
  views: number;
  name: string;
}

export interface HashtagItem {
  id: string;
  text: string;
  textLanguage: string;
  createTime: number;
  createTimeISO: string;
  isAd: boolean;
  authorMeta: AuthorMeta;
  musicMeta: MusicMeta;
  locationMeta?: LocationMeta;
  webVideoUrl: string;
  mediaUrls: string[];
  videoMeta: VideoMeta;
  diggCount: number;
  shareCount: number;
  playCount: number;
  collectCount: number;
  commentCount: number;
  mentions: string[];
  detailedMentions: any[];
  hashtags: Hashtag[];
  effectStickers: EffectSticker[];
  isSlideshow: boolean;
  isPinned: boolean;
  isSponsored: boolean;
  input: string;
  searchHashtag: SearchHashtag;
}

export interface HashtagResponse {
  items: HashtagItem[];
  count: number;
}

