import { ApifyClient } from "apify-client";
import { apifyBatchRequest } from "../utils/apifyBatchRequest";
import { apiDojoBatchRequest } from "../utils/apiDojoBatchRequest";
import { mapApiDojoProfileToClockworks } from "../utils/apiDojoMappers";
import type { ProfileItem, ProfileResponse } from "../interfaces/profile";
import type { GoodQuality } from "../interfaces/qualityDeterminant";
import type { APIDojoProfile } from "../interfaces/apidojo_profile";

// initialize the apiclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

export async function scrapeProfile(
  profiles: string[],
  qualityConfig: GoodQuality,
): Promise<ProfileItem[]> {
  console.log(`Starting profile scraper using ${qualityConfig.provider} provider`);

  if (qualityConfig.provider === "apidojo") {
    console.log(
      `APIDojo profile scraper configured - ${profiles.length} profiles, ${qualityConfig.videoLimitPerProfile} videos per profile`,
    );

    // Use APIDojo batch request
    const batchResult = await apiDojoBatchRequest(client, {
      actorId: "apidojo/tiktok-profile-scraper",
      queries: profiles,
      maxItems: qualityConfig.videoLimitPerProfile,
      batchSize: 7,
      isProfile: true,
    });

    // Map APIDojo results to clockworks format for compatibility
    const mappedItems = (batchResult.items as APIDojoProfile[]).map((item) => {
      return mapApiDojoProfileToClockworks(item, item.channel.username);
    });

    console.log(
      `APIDojo profile dataset retrieved: ${mappedItems.length} items`,
    );

    return mappedItems;
  } else {
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
      `Clockworks profile scraper configured - ${profiles.length} profiles, ${qualityConfig.videoLimitPerProfile} videos per profile`,
    );

    // Use clockworks batch request utility
    const batchResult = await apifyBatchRequest(client, {
      actorId: "clockworks/tiktok-profile-scraper",
      queries: profiles,
      baseConfig,
      queryFieldName: "profiles",
      batchSize: 7, // Split into 7 parallel requests
    });

    console.log(
      `Clockworks profile dataset retrieved: ${batchResult.count} items (${batchResult.successfulRequests}/${profiles.length} successful requests)`,
    );

    return batchResult.items;
  }
}
