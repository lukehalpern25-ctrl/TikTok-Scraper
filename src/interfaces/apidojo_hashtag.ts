export interface APIDojoHashTag {
  id: string;
  title: string;
  textLanguage: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  hashtags: string[];
  channel: {
    name: string;
    username: string;
    id: string;
    url: string;
    avatar: string;
    verified: boolean;
    followers: number;
    following: number;
  };
  uploadedAt: number;
  uploadedAtFormatted: string;
  video: {
    width: number;
    height: number;
    ratio: string;
    duration: number;
    url: string;
    cover: string;
    thumbnail: string;
  };
  song: {
    id: string;
    title: string;
    artist: string;
    duration: number;
    cover: string;
  };
  postPage: string;
  subtitleInformation?: SubtitleInfo[]; // optional because not all have it
}

export interface SubtitleInfo {
  caption_format: string;
  caption_length: number;
  cla_subtitle_id: number;
  complaint_id: number;
  expire: number;
  is_auto_generated: boolean;
  is_original_caption: boolean;
  lang: string;
  language_code: string;
  language_id: number;
  source_tag: string;
  sub_id: number;
  sub_version: string;
  subtitle_type: number;
  translation_type: number;
  translator_id: number;
  url: string;
  url_list: string[];
  variant: string;
}

export interface APIDojoHashTagResponse {
  items: APIDojoHashTag[];
  count: number;
}
