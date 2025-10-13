import type { APIDojoHashTag } from "../interfaces/apidojo_hashtag";
import type { APIDojoProfile } from "../interfaces/apidojo_profile";
import type { HashtagItem } from "../interfaces/hashtag";
import type { ProfileItem } from "../interfaces/profile";

/**
 * Maps APIDojoHashTag to HashtagItem to maintain compatibility with clockworks interface
 */
export function mapApiDojoHashtagToClockworks(
  apiDojoItem: APIDojoHashTag,
  originalQuery: string
): HashtagItem {
  return {
    id: apiDojoItem.id,
    text: apiDojoItem.title,
    textLanguage: apiDojoItem.textLanguage,
    createTime: apiDojoItem.uploadedAt,
    createTimeISO: apiDojoItem.uploadedAtFormatted,
    isAd: false, // APIDojo doesn't provide this info, default to false
    authorMeta: {
      id: apiDojoItem.channel.id,
      name: apiDojoItem.channel.username,
      nickName: apiDojoItem.channel.username, // Use name as nickname
      verified: apiDojoItem.channel.verified,
      signature: "", // APIDojo doesn't provide bio/signature
      avatar: apiDojoItem.channel.avatar,
      following: apiDojoItem.channel.following,
      fans: apiDojoItem.channel.followers,
      heart: 0, // APIDojo doesn't provide total hearts
      video: 0, // APIDojo doesn't provide total videos
      digg: 0, // APIDojo doesn't provide total diggs
      bioLink: "", // APIDojo doesn't provide bio link
      privateAccount: false, // APIDojo doesn't provide private account info
      friends: 0, // APIDojo doesn't provide friends count
      originalAvatarUrl: apiDojoItem.channel.avatar,
      profileUrl: apiDojoItem.channel.url,
    },
    musicMeta: {
      musicName: apiDojoItem.song.title,
      musicAuthor: apiDojoItem.song.artist,
      musicOriginal: apiDojoItem.song.artist === apiDojoItem.channel.name, // Assume original if same artist as channel
      playUrl: "", // APIDojo doesn't provide play URL
      coverMediumUrl: apiDojoItem.song.cover,
      originalCoverMediumUrl: apiDojoItem.song.cover,
      musicId: apiDojoItem.song.id,
    },
    locationMeta: undefined, // APIDojo doesn't provide location data
    webVideoUrl: apiDojoItem.postPage,
    mediaUrls: [apiDojoItem.video.url],
    videoMeta: {
      height: apiDojoItem.video.height,
      width: apiDojoItem.video.width,
      duration: apiDojoItem.video.duration,
      coverUrl: apiDojoItem.video.cover,
      originalCoverUrl: apiDojoItem.video.cover,
      definition: apiDojoItem.video.ratio,
      format: "mp4", // Default format
      subtitleLinks: apiDojoItem.subtitleInformation?.map(subtitle => ({
        language: subtitle.language_code,
        downloadLink: subtitle.url,
        tiktokLink: subtitle.url,
        source: subtitle.source_tag,
        sourceUnabbreviated: subtitle.lang,
        version: subtitle.sub_version,
      })) || [],
    },
    diggCount: apiDojoItem.likes,
    shareCount: apiDojoItem.shares,
    playCount: apiDojoItem.views,
    collectCount: apiDojoItem.bookmarks,
    commentCount: apiDojoItem.comments,
    mentions: [], // APIDojo doesn't provide mentions separately
    detailedMentions: [], // APIDojo doesn't provide detailed mentions
    hashtags: apiDojoItem.hashtags.map(tag => ({ name: tag })),
    effectStickers: [], // APIDojo doesn't provide effect stickers
    isSlideshow: false, // APIDojo doesn't provide slideshow info
    isPinned: false, // APIDojo doesn't provide pinned status
    isSponsored: false, // APIDojo doesn't provide sponsored status
    input: originalQuery,
    searchHashtag: {
      views: apiDojoItem.views,
      name: originalQuery,
    },
  };
}

/**
 * Maps APIDojoProfile to ProfileItem to maintain compatibility with clockworks interface
 */
export function mapApiDojoProfileToClockworks(
  apiDojoItem: APIDojoProfile,
  originalUsername: string
): ProfileItem {
  return {
    id: apiDojoItem.id,
    text: apiDojoItem.title,
    textLanguage: "un", // APIDojo doesn't provide text language for profiles
    createTime: apiDojoItem.uploadedAt,
    createTimeISO: apiDojoItem.uploadedAtFormatted,
    isAd: false, // APIDojo doesn't provide this info
    authorMeta: {
      id: apiDojoItem.channel.id,
      name: apiDojoItem.channel.name,
      nickName: apiDojoItem.channel.name,
      verified: apiDojoItem.channel.verified,
      signature: "", // APIDojo doesn't provide bio
      avatar: apiDojoItem.channel.avatar,
      following: apiDojoItem.channel.following,
      fans: apiDojoItem.channel.followers,
      heart: 0, // APIDojo doesn't provide total hearts
      video: apiDojoItem.channel.videos,
      digg: 0, // APIDojo doesn't provide total diggs
      bioLink: "", // APIDojo doesn't provide bio link
      privateAccount: false, // APIDojo doesn't provide private account info
      friends: 0, // APIDojo doesn't provide friends count
      originalAvatarUrl: apiDojoItem.channel.avatar,
      profileUrl: apiDojoItem.channel.url,
    },
    musicMeta: {
      musicName: apiDojoItem.song.title,
      musicAuthor: apiDojoItem.song.artist,
      musicOriginal: apiDojoItem.song.artist === apiDojoItem.channel.name,
      musicAlbum: apiDojoItem.song.album ?? undefined,
      playUrl: "", // APIDojo doesn't provide play URL
      coverMediumUrl: apiDojoItem.song.cover,
      originalCoverMediumUrl: apiDojoItem.song.cover,
      musicId: apiDojoItem.song.id.toString(),
    },
    webVideoUrl: apiDojoItem.postPage,
    mediaUrls: [apiDojoItem.video.url],
    videoMeta: {
      height: apiDojoItem.video.height || 0,
      width: apiDojoItem.video.width || 0,
      duration: apiDojoItem.video.duration || 0,
      coverUrl: apiDojoItem.video.cover,
      originalCoverUrl: apiDojoItem.video.cover,
      definition: apiDojoItem.video.ratio,
      format: "mp4",
      subtitleLinks: [], // APIDojo profile scraper doesn't provide subtitles
    },
    diggCount: apiDojoItem.likes,
    shareCount: apiDojoItem.shares,
    playCount: apiDojoItem.views,
    collectCount: apiDojoItem.bookmarks,
    commentCount: apiDojoItem.comments,
    mentions: [], // APIDojo doesn't provide mentions
    detailedMentions: [], // APIDojo doesn't provide detailed mentions
    hashtags: apiDojoItem.hashtags.map(tag => ({ name: tag })),
    effectStickers: [], // APIDojo doesn't provide effect stickers
    isSlideshow: false, // APIDojo doesn't provide slideshow info
    slideshowImageLinks: [], // APIDojo doesn't provide slideshow images
    isPinned: false, // APIDojo doesn't provide pinned status
    isSponsored: false, // APIDojo doesn't provide sponsored status
    input: originalUsername,
    fromProfileSection: "posts", // Default section
  };
}