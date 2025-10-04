import { ApifyClient } from "apify-client";
import path from "path";
import { writeData } from "../utils/writeData";
import { postProcess } from "../utils/postProcess";
import type { CliOptions } from "../interfaces/cliOptions";
import type { HashtagResponse } from "../interfaces/hashtag";

// initialize the apifyclient
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// This attempts to scrape the tiktok hashtag feed and return the email and profile URL of eligible creators
export async function hashtag(options: CliOptions) {
  console.log("Starting hashtag scraper");

  // scraper config
  const config = {
    hashtags: options.query,
    resultsPerPage: options.limitPerQuery,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  };
  console.log(
    `Scraper configured - targeting ${options.limitPerQuery} results per hashtag (${options.query.join(", ")})`,
  );

  console.log("Initiating TikTok hashtag scraper...");
  const resp = await client
    .actor("clockworks/tiktok-hashtag-scraper")
    .call(config);

  console.log("Scraping completed - retrieving dataset");

  // using limit 0 to just get everything in 1 go skips the multiple round trips
  // using fields to avoid unneccesary bandwidth usage taking just what we need.
  const dataset = (await client
    .dataset(resp.defaultDatasetId)
    .listItems({ limit: 0 })) as unknown as HashtagResponse;
  console.log(`Dataset retrieved: ${dataset.count} raw items`);

  const { final, timestamp } = await postProcess(config, options, dataset);

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
