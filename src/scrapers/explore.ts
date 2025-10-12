import { ApifyClient } from "apify-client";
import path from "path";
import { writeData } from "../utils/writeData";
import { postProcess } from "../utils/postProcess";
import { apifyBatchRequest } from "../utils/apifyBatchRequest";
import type { CliOptions } from "../interfaces/cliOptions";
import type { ExploreResponse } from "../interfaces/explore";

// initialize the apifyclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// This attempts to scrape the tiktok explore feed and return the email and profile URL of eligible creators
export async function explore(options: CliOptions) {
  console.log("Starting explore scraper");

  // Base scraper config (without exploreCategoryTypes)
  const baseConfig = {
    resultsPerPage: options.limitPerQuery,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  };

  console.log(
    `Scraper configured - targeting ${options.limitPerQuery} results per query (${options.query.join(", ")})`,
  );

  // Use batch request utility
  const batchResult = await apifyBatchRequest(client, {
    actorId: "clockworks/tiktok-explore-scraper",
    queries: options.query,
    baseConfig,
    queryFieldName: "exploreCategoryTypes",
    batchSize: 7, // Split into 7 parallel requests
  });

  // Create dataset response in expected format
  const dataset: ExploreResponse = {
    items: batchResult.items,
    count: batchResult.count,
  };

  console.log(
    `Dataset retrieved: ${dataset.count} raw items (${batchResult.successfulRequests}/${options.query.length} successful requests)`,
  );

  const { final, timestamp } = await postProcess(
    { exploreCategoryTypes: options.query, ...baseConfig },
    options,
    dataset,
  );

  console.log("Saving results");

  // the names are stored in a form where they can easily be sorted
  const outputPath = `./out/explore`;
  const fileName = `${timestamp}.json`;
  const fullPath = path.join(outputPath, fileName);

  writeData(fullPath, JSON.stringify(final));
  console.log(
    `explore process complete - ${final.processed.length} creators found and saved to ${fullPath}`,
  );
}
