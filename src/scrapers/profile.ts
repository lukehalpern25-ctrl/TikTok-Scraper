import { ApifyClient } from "apify-client";
import { apifyBatchRequest } from "../utils/apifyBatchRequest";
import type { ProfileItem, ProfileResponse } from "../interfaces/profile";
import type { GoodQuality } from "../interfaces/qualityDeterminant";

// initialize the apiclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

export async function scrapeProfile(
  profiles: string[],
  qualityConfig: GoodQuality,
): Promise<ProfileItem[]> {
  console.log(`Starting profile scraper`);

  // Base scraper config (without profiles)
  const baseConfig = {
    resultsPerPage: qualityConfig.videoLimitPerProfile,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
    excludePinnedPosts: !qualityConfig.includePinnedVideos,
  };

  console.log(
    `Scraper configured - ${profiles.length} profiles, ${qualityConfig.videoLimitPerProfile} videos per profile`,
  );

  // Use batch request utility
  // Note: apidojo/tiktok-profile-scraper is used for profile expansion when initial scraping used apidojo
  const actorId = qualityConfig.provider === "apidojo"
    ? "apidojo/tiktok-profile-scraper" 
    : "clockworks/tiktok-profile-scraper";
    
  const batchResult = await apifyBatchRequest(client, {
    actorId,
    queries: profiles,
    baseConfig,
    queryFieldName: "profiles",
    batchSize: 7, // Split into 7 parallel requests
  });

  console.log(`Profile dataset retrieved: ${batchResult.count} items (${batchResult.successfulRequests}/${profiles.length} successful requests)`);

  return batchResult.items;
}
