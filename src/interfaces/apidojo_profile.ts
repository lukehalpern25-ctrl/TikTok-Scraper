export interface APIDojoProfile {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  hashtags: string[];
  channel: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    url: string;
    followers: number;
    following: number;
    videos: number;
  };
  collabInfo: any | null;
  uploadedAt: number;
  uploadedAtFormatted: string;
  video: {
    width: number | null;
    height: number | null;
    ratio: string;
    duration: number | null;
    url: string;
    cover: string;
    thumbnail: string;
  };
  song: {
    id: number;
    title: string;
    artist: string;
    album: string | null;
    duration: number;
    cover: string;
  };
  postPage: string;
}

export interface APIDojoProfileResponse {
  items: APIDojoProfile[];
  count: number;
}
