import { ApifyClient } from "apify-client";
import path from "path";
import { writeData } from "../utils/writeData";
import { postProcess } from "../utils/postProcess";
import { apifyBatchRequest } from "../utils/apifyBatchRequest";
import { apiDojoBatchRequest } from "../utils/apiDojoBatchRequest";
import { mapApiDojoHashtagToClockworks } from "../utils/apiDojoMappers";
import type { CliOptions } from "../interfaces/cliOptions";
import type { HashtagResponse } from "../interfaces/hashtag";
import type { APIDojoHashTag } from "../interfaces/apidojo_hashtag";

// initialize the apifyclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// This attempts to scrape the tiktok hashtag feed and return the email and profile URL of eligible creators
export async function hashtag(options: CliOptions) {
  console.log(`Starting hashtag scraper using ${options.provider} provider`);

  let dataset: HashtagResponse;

  if (options.provider === "apidojo") {
    console.log(
      `APIDojo scraper configured - targeting ${options.limitPerQuery} results per hashtag (${options.query.join(", ")})`,
    );

    // Use APIDojo batch request
    const batchResult = await apiDojoBatchRequest(client, {
      actorId: "apidojo/tiktok-scraper",
      queries: options.query,
      maxItems: options.limitPerQuery,
      batchSize: 7,
      isProfile: false,
    });

    // Map APIDojo results to clockworks format for compatibility
    const mappedItems = (batchResult.items as APIDojoHashTag[]).map((item) => {
      // Determine which query this item belongs to based on hashtags
      const matchingQuery =
        options.query.find((query) =>
          item.hashtags.some(
            (tag) =>
              tag.toLowerCase() === query.toLowerCase() ||
              tag.toLowerCase() === query.toLowerCase().replace("#", ""),
          ),
        ) || options.query[0]!; // Fallback to first query

      return mapApiDojoHashtagToClockworks(item, matchingQuery);
    });

    dataset = {
      items: mappedItems,
      count: mappedItems.length,
    };
  } else {
    // Base scraper config (without hashtags)
    const baseConfig = {
      resultsPerPage: options.limitPerQuery,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadSubtitles: false,
      shouldDownloadVideos: false,
    };

    console.log(
      `Clockworks scraper configured - targeting ${options.limitPerQuery} results per hashtag (${options.query.join(", ")})`,
    );

    // Use clockworks batch request utility
    const batchResult = await apifyBatchRequest(client, {
      actorId: "clockworks/tiktok-hashtag-scraper",
      queries: options.query,
      baseConfig,
      queryFieldName: "hashtags",
      batchSize: 7, // Split into 7 parallel requests
    });

    // Create dataset response in expected format
    dataset = {
      items: batchResult.items,
      count: batchResult.count,
    };
  }

  console.log(
    `Dataset retrieved: ${dataset.count} raw items from ${options.provider} provider`,
  );

  // Save raw dataset and handle debug pause
  let timestamp = Date.now();
  if (options.debugMode) {
    const intermediaryPath = `./out/intermediary/${timestamp}`;
    writeData(
      path.join(intermediaryPath, "00_raw_dataset.json"),
      JSON.stringify(dataset, null, 2),
    );
    
    console.log(`🐛 DEBUG: Raw dataset saved to ${intermediaryPath}/00_raw_dataset.json`);
    
    if (options.pauseAtStage === "raw-data") {
      console.log("🔴 DEBUG: Paused after raw data collection");
      console.log(`Scraped ${dataset.count} items from ${dataset.items.length} videos`);
      console.log(`Resume with: --resumeFromStage raw-data --resumeTimestamp ${timestamp}`);
      return; // Exit early, don't proceed to postProcess
    }
  }

  const result = await postProcess(
    { hashtags: options.query, resultsPerPage: options.limitPerQuery },
    options,
    dataset,
    undefined,
    options.debugMode ? timestamp : undefined
  );
  
  // Use the timestamp from postProcess if not in debug mode
  timestamp = result.timestamp;

  // If the process was paused, don't save results
  if (result.paused) {
    console.log("🔴 DEBUG: Processing paused - no final results to save");
    return;
  }

  console.log("Saving results");

  // the names are stored in a form where they can easily be sorted
  const outputPath = `./out/hashtag`;
  const fileName = `${timestamp}.json`;
  const fullPath = path.join(outputPath, fileName);

  writeData(fullPath, JSON.stringify(result.final, null, 2));
  console.log(
    `Hashtag process complete - ${result.final.processed.length} creators found and saved to ${fullPath}`,
  );
}
