type ScraperType = "discover" | "hashtag" | "explore";

export interface CliOptions {
  limitPerQuery: number;
  query: string[];
  type: ScraperType;

  // first pass filters
  minFollowers: number;

  // second pass filters
  removeNonEnglish: boolean;

  // aggregation pass
  minVideoViews: number;
  minAvgViews: number;
  minNoOfVideosInWindow: number;

  // direct to apify
  videoLimitPerProfile: number;
  includePinnedVideos: boolean;
  timeWindowInDays: number;
}
