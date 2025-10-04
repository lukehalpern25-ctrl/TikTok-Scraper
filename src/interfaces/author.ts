export interface AuthorMeta {
  id: string;
  name: string;
  profileUrl: string;
  nickName: string;
  verified: boolean;
  signature: string;
  bioLink: string | null;
  originalAvatarUrl: string;
  avatar: string;
  privateAccount: boolean;
  following: number;
  friends: number;
  fans: number;
  heart: number;
  video: number;
  digg: number;
}