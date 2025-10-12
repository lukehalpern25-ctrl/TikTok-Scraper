import { ApifyClient } from "apify-client";
import path from "path";
import { writeData } from "../utils/writeData";
import { postProcess } from "../utils/postProcess";
import { apifyBatchRequest } from "../utils/apifyBatchRequest";
import type { CliOptions } from "../interfaces/cliOptions";
import type { HashtagResponse } from "../interfaces/hashtag";

// initialize the apifyclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// This attempts to scrape the tiktok hashtag feed and return the email and profile URL of eligible creators
export async function hashtag(options: CliOptions) {
  console.log("Starting hashtag scraper");

  // Base scraper config (without hashtags)
  const baseConfig = {
    resultsPerPage: options.limitPerQuery,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  };
  
  console.log(
    `Scraper configured - targeting ${options.limitPerQuery} results per hashtag (${options.query.join(", ")})`,
  );

  // Use batch request utility
  // Note: Provider option exists but always uses clockworks for now
  const batchResult = await apifyBatchRequest(client, {
    actorId: "clockworks/tiktok-hashtag-scraper",
    queries: options.query,
    baseConfig,
    queryFieldName: "hashtags",
    batchSize: 7, // Split into 7 parallel requests
  });

  // Create dataset response in expected format
  const dataset: HashtagResponse = {
    items: batchResult.items,
    count: batchResult.count,
  };
  
  console.log(`Dataset retrieved: ${dataset.count} raw items (${batchResult.successfulRequests}/${options.query.length} successful requests)`);

  const { final, timestamp } = await postProcess({ hashtags: options.query, ...baseConfig }, options, dataset);

  console.log("Saving results");

  // the names are stored in a form where they can easily be sorted
  const outputPath = `./out/hashtag`;
  const fileName = `${timestamp}.json`;
  const fullPath = path.join(outputPath, fileName);

  writeData(fullPath, JSON.stringify(final, null, 2));
  console.log(
    `Hashtag process complete - ${final.processed.length} creators found and saved to ${fullPath}`,
  );
}
