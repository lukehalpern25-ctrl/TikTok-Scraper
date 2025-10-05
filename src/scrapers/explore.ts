import { ApifyClient } from "apify-client";
import path from "path";
import { writeData } from "../utils/writeData";
import { postProcess } from "../utils/postProcess";
import type { CliOptions } from "../interfaces/cliOptions";
import type { ExploreResponse } from "../interfaces/explore";

// initialize the apifyclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// This attempts to scrape the tiktok explore feed and return the email and profile URL of eligible creators
export async function explore(options: CliOptions) {
  console.log("Starting explore scraper");

  // scraper config
  const config = {
    exploreCategoryTypes: options.query,
    resultsPerPage: options.limitPerQuery,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  };
  console.log(
    `Scraper configured - targeting ${options.limitPerQuery} results per query (${options.query.join(", ")})`,
  );

  console.log("Initiating TikTok explore scraper...");
  const resp = await client
    .actor("clockworks/tiktok-explore-scraper")
    .call(config);

  console.log("Scraping completed - retrieving dataset");

  // using limit 0 to just get everything in 1 go skips the multiple round trips
  const dataset = (await client
    .dataset(resp.defaultDatasetId)
    .listItems({ limit: 0 })) as unknown as ExploreResponse;
  console.log(`Dataset retrieved: ${dataset.count} raw items`);

  const { final, timestamp } = await postProcess(config, options, dataset);

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
