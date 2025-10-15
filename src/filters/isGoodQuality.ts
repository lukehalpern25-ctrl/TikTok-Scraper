import type { AuthorMeta } from "../interfaces/author";
import type { ProfileItem } from "../interfaces/profile";
import type { GoodQuality, rowAndPass } from "../interfaces/qualityDeterminant";

function pass1IsGood(row: AuthorMeta, config: GoodQuality) {
  // check followers count
  if (row.fans < config.minFollowers) {
    console.log(
      `Quality check pass 1 failed: ${row.fans} followers < ${config.minFollowers} required`,
    );
    return false;
  }

  console.log("Quality check 1 passed");
  return true;
}

function pass2IsGood(row: ProfileItem, config: GoodQuality) {
  if (config.removeNonEnglish && (row.textLanguage !== "en" && row.textLanguage !== "un")) {
    console.log(
      `Quality check pass 2 failed: expected languages 'en' received ${row.textLanguage}`,
    );
    return false;
  }

  console.log("Quality check 2 passed");
  return true;
}

// This checks if a video has good quality
export function isGoodQuality(config: GoodQuality, rowAndPass: rowAndPass) {
  switch (rowAndPass.pass) {
    case 1:
      return pass1IsGood(rowAndPass.row, config);
    case 2:
      return pass2IsGood(rowAndPass.row, config);
    default:
      throw new Error("Undefined pass");
  }
}

// This serves both as a filter for quqlity and a deduper
export function checkQualityFromAggregatedView(
  config: GoodQuality,
  rows: ProfileItem[],
): ProfileItem[] {
  // Group profiles by author ID
  const videoRowsByAuthorId = new Map<string, ProfileItem[]>();

  for (const videoRow of rows) {
    const authorId = videoRow.authorMeta.id;
    if (!videoRowsByAuthorId.has(authorId)) {
      videoRowsByAuthorId.set(authorId, []);
    }
    videoRowsByAuthorId.get(authorId)!.push(videoRow);
  }

  const passingProfiles: ProfileItem[] = [];

  // Check each author's aggregated metrics
  for (const [authorId, authorVideoRows] of videoRowsByAuthorId) {
    // Filter videos within the time window (technically apify already limts the window but just incase)
    const timeWindowMs = config.timeWindowInDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindowMs;

    const videosInWindow = authorVideoRows.filter(
      (videoRow) => videoRow.createTime * 1000 >= cutoffTime,
    );

    // Check minimum number of videos in window (use to determine if a creator is very active in window)
    if (videosInWindow.length < config.minNoOfVideosInWindow) {
      console.log(
        `Quality check aggregation failed for ${authorId}: ${videosInWindow.length} videos < ${config.minNoOfVideosInWindow} required in window`,
      );
      continue;
    }

    // The values below use the actual total videos retrieved not the filtered ones in window

    // Check minimum video views for each video
    const hasVideosBelowMinViews = authorVideoRows.some(
      (profile) => profile.playCount < config.minVideoViews,
    );

    if (hasVideosBelowMinViews) {
      console.log(
        `Quality check aggregation failed for ${authorId}: some videos below ${config.minVideoViews} minimum views`,
      );
      continue;
    }

    // Calculate average views
    const totalViews = authorVideoRows.reduce(
      (sum, profile) => sum + profile.playCount,
      0,
    );
    const avgViews = totalViews / authorVideoRows.length;

    // Check minimum average views
    if (avgViews < config.minAvgViews) {
      console.log(
        `Quality check aggregation failed for ${authorId}: ${avgViews} avg views < ${config.minAvgViews} required`,
      );
      continue;
    }

    console.log(`Quality check aggregation passed for ${authorId}`);

    // Return just one profile per author (the most recent one)
    const mostRecentProfile = authorVideoRows.reduce((latest, current) =>
      current.createTime > latest.createTime ? current : latest,
    );

    passingProfiles.push(mostRecentProfile);
  }

  return passingProfiles;
}
