import type { AuthorMeta } from "./author";

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

export interface VideoMeta {
  height: number;
  width: number;
  duration: number;
  coverUrl: string;
  originalCoverUrl: string;
  definition: string;
  format: string;
  subtitleLinks?: SubtitleLink[];
}

export interface SubtitleLink {
  language: string;
  downloadLink: string;
  tiktokLink: string;
  source: string;
  sourceUnabbreviated: string;
  version: string;
}

export interface DetailedMention {
  id: string;
  name: string;
  nickName: string;
  profileUrl: string;
}

export interface Hashtag {
  id?: string;
  name: string;
  title?: string;
  cover?: string;
}

export interface DiscoveryInfo {
  breadcrumbs: any[];
  relatedTags: any[];
  url: string;
  tag: string;
  type: string;
}

export interface DiscoverItem {
  id: string;
  text: string;
  createTime: number;
  createTimeISO: string;
  isMuted: boolean;
  authorMeta: AuthorMeta;
  musicMeta: MusicMeta;
  webVideoUrl: string;
  mediaUrls: any[];
  videoMeta: VideoMeta;
  diggCount: number;
  shareCount: number;
  playCount: number;
  collectCount: number;
  commentCount: number;
  mentions: string[];
  detailedMentions: DetailedMention[];
  hashtags: Hashtag[];
  effectStickers: any[];
  isSlideshow: boolean;
  isPinned: boolean;
  isSponsored: boolean;
  input: string;
  discoveryInfo: DiscoveryInfo;
}

export interface DiscoverResponse {
  items: DiscoverItem[];
  count: number;
}