import type { AuthorMeta } from "./author";

export interface CommerceUserInfo {
  commerceUser: boolean;
}

export type AuthorMetaInProfile = AuthorMeta & {
  roomId: string;
  ttSeller: boolean;
  commerceUserInfo?: CommerceUserInfo;
}

export interface MusicMeta {
  musicName: string;
  musicAuthor: string;
  musicOriginal: boolean;
  musicAlbum?: string;
  playUrl: string;
  coverMediumUrl: string;
  originalCoverMediumUrl: string;
  musicId: string;
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
  definition?: string;
  format?: string;
  subtitleLinks?: SubtitleLink[];
}

export interface DetailedMention {
  id: string;
  name: string;
  nickName: string;
  profileUrl: string;
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

export interface SlideshowImageLink {
  tiktokLink: string;
  downloadLink: string;
}

export interface ProfileItem {
  id: string;
  text: string;
  textLanguage: string;
  createTime: number;
  createTimeISO: string;
  isAd: boolean;
  authorMeta: AuthorMeta;
  musicMeta: MusicMeta;
  webVideoUrl: string;
  mediaUrls: string[];
  videoMeta: VideoMeta;
  diggCount: number;
  shareCount: number;
  playCount: number;
  collectCount: number;
  commentCount: number;
  mentions: string[];
  detailedMentions: DetailedMention[];
  hashtags: Hashtag[];
  effectStickers: EffectSticker[];
  isSlideshow: boolean;
  slideshowImageLinks?: SlideshowImageLink[];
  isPinned: boolean;
  isSponsored: boolean;
  input: string;
  fromProfileSection: string;
}

export interface ProfileResponse {
  items: ProfileItem[];
  count: number;
}

