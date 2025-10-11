import type { AuthorMeta } from "../interfaces/author";
import type { ProfileItem } from "../interfaces/profile";
import type { GoodQuality } from "../interfaces/qualityDeterminant";
import { scrapeProfile } from "../scrapers/profile";

// This takes a user profile and attempts to expand it to include more info
export async function expandProfile(
  rows: AuthorMeta[],
  config: GoodQuality,
): Promise<ProfileItem[]> {
  // sanity check parse array to set and back to ensure only unique names make it through
  const creatorNames = Array.from(new Set(rows.map((r) => r.name)));
  console.log(`Expanding ${creatorNames.length} creator profiles`);

  if (creatorNames.length == 0) {
    console.log(`No creator names to expand`);
    return [];
  }

  return scrapeProfile(creatorNames, config);
}
