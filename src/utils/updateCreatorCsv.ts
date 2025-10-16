import { appendFileSync, existsSync } from "fs";
import path from "path";
import type { ProfileItem } from "../interfaces/profile";

// Updates the Creator_URL_Key.csv file with new creators found during the scraping process
export function updateCreatorCsv(creators: ProfileItem[]): number {
  const creatorListPath = path.join(
    process.cwd(),
    "src",
    "data",
    "Creator_URL_Key.csv",
  );

  if (!existsSync(creatorListPath)) {
    console.warn("Creator list CSV file not found, skipping CSV update");
    return 0;
  }

  if (!creators || creators.length === 0) {
    console.log("No new creators to add to CSV");
    return 0;
  }

  try {
    // Extract profile URLs from the creators
    const profileUrls = creators
      .map((creator) => creator.authorMeta.profileUrl)
      .filter((url) => url && url.trim() !== ""); // Filter out empty/invalid URLs

    if (profileUrls.length === 0) {
      console.log("No valid profile URLs found to add to CSV");
      return 0;
    }

    // Create CSV lines with URLs (matching the existing format in the CSV file)
    const csvLines = profileUrls.join("\n");

    // Append with newline prefix to ensure proper formatting
    appendFileSync(creatorListPath, "\n" + csvLines);

    console.log(
      `✅ Added ${profileUrls.length} new creators to CSV: ${creatorListPath}`,
    );
    return profileUrls.length;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Failed to update creator CSV: ${errorMessage}`);
    return 0;
  }
}

