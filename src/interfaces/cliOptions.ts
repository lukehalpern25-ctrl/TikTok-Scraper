type ScraperType = "discover" | "hashtag" | "explore";
type ScraperProvider = "clockworks" | "apidojo";

export interface CliOptions {
  limitPerQuery: number;
  query: string[];
  type: ScraperType;
  provider: ScraperProvider;

  // first pass filters
  minFollowers: number;
  maxFollowers: number;

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
