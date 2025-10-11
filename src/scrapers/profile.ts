import { ApifyClient } from "apify-client";
import type { ProfileItem, ProfileResponse } from "../interfaces/profile";
import type { GoodQuality } from "../interfaces/qualityDeterminant";

// initialize the apiclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

export async function scrapeProfile(
  profiles: string[],
  qualityConfig: GoodQuality,
): Promise<ProfileItem[]> {
  console.log(`Starting profile scraper`);

  // scraper config
  const config = {
    profiles,
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
  console.log(`Initiating TikTok profile scraper...`);
  const resp = await client
    .actor("clockworks/tiktok-profile-scraper")
    .call(config);

  console.log(`Profile scraping completed - retrieving dataset`);

  // using limit 0 to just get everything in 1 go skips the multiple round trips
  const dataset = (await client
    .dataset(resp.defaultDatasetId)
    .listItems({ limit: 0 })) as unknown as ProfileResponse;
  console.log(`Profile dataset retrieved: ${dataset.count} items`);

  return dataset.items;
}
