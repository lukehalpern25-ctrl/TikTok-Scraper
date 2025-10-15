type ScraperType = "discover" | "hashtag" | "explore";
type ScraperProvider = "clockworks" | "apidojo";
type DebugStage = "raw-data" | "extraction" | "deduplication" | "quality-filter-1" | "profile-expansion" | "quality-filter-2" | "quality-filter-3" | "final";

export interface CliOptions {
  limitPerQuery: number;
  query: string[];
  type: ScraperType;
  provider: ScraperProvider;

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

  // debug mode options
  debugMode: boolean;
  pauseAtStage?: DebugStage;
  resumeFromStage?: DebugStage;
  resumeTimestamp?: string;
}
