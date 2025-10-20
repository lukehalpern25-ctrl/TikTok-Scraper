import { dedupe, dedupeAgaisntCreatorList } from "../filters/dedupe";
import { writeData } from "./writeData";
import {
  checkQualityFromAggregatedView,
  isGoodQuality,
} from "../filters/isGoodQuality";
import { expandProfile } from "../map/expandProfile";
import { hasBio } from "../filters/hasBioLink";
import { hasEmailOrLink } from "../filters/hasEmailorLink";
import path from "path";
import type { CliOptions } from "../interfaces/cliOptions";
import type { DiscoverResponse } from "../interfaces/discover";
import type { HashtagResponse } from "../interfaces/hashtag";
import type { GoodQuality } from "../interfaces/qualityDeterminant";
import type { ExploreResponse } from "../interfaces/explore";

// Both discover and hashtags result in roughly the same data so this is just an abstracted util for both
export async function postProcess(
  config: any,
  options: CliOptions,
  dataset: HashtagResponse | DiscoverResponse | ExploreResponse,
) {
  // build the quality config
  const qualityConfig: GoodQuality = {
    ...options,
  };

  console.log(`Starting data processing pipeline...`);
  const timestamp = Date.now();
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  // the steps below are just data cleaning
  const authorProfiles = dataset.items
    .map((r) => r.authorMeta)
    .filter((r) => !!r); // remove any falsey values
  console.log(`Extracted ${authorProfiles.length} author profiles`);
  writeData(
    path.join(intermediaryPath, "01_extracted_profiles.json"),
    JSON.stringify(authorProfiles, null, 2),
  );

  // First dedupe against existing creator list to remove already known creators
  const newCreatorsOnly = authorProfiles.filter(dedupeAgaisntCreatorList);
  console.log(
    `After creator list deduplication: ${newCreatorsOnly.length} new creators (removed ${authorProfiles.length - newCreatorsOnly.length} existing)`,
  );
  writeData(
    path.join(intermediaryPath, "02_new_creators_only.json"),
    JSON.stringify(newCreatorsOnly, null, 2),
  );

  const deduped = newCreatorsOnly.filter(dedupe);
  console.log(`After profile deduplication: ${deduped.length} unique profiles`);
  writeData(
    path.join(intermediaryPath, "03_deduped_profiles.json"),
    JSON.stringify(deduped, null, 2),
  );

  const qualityFiltered = deduped.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 1 }),
  );
  console.log(
    `After minimum followers filter: ${qualityFiltered.length} profiles`,
  );
  writeData(
    path.join(intermediaryPath, "04_min_followers_filtered.json"),
    JSON.stringify(qualityFiltered, null, 2),
  );

  const maxFollowersFiltered = qualityFiltered.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 2 }),
  );
  console.log(
    `After maximum followers filter: ${maxFollowersFiltered.length} profiles`,
  );
  writeData(
    path.join(intermediaryPath, "05_max_followers_filtered.json"),
    JSON.stringify(maxFollowersFiltered, null, 2),
  );

  console.log(`Expanding profiles with additional data...`);
  const expanded = await expandProfile(maxFollowersFiltered, qualityConfig);
  console.log(
    `Profile expansion complete: ${expanded.length} enhanced profiles`,
  );
  writeData(
    path.join(intermediaryPath, "06_expanded_profiles.json"),
    JSON.stringify(expanded, null, 2),
  );

  const secondQualityFiltered = expanded.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 3 }),
  );
  console.log(
    `After non-English removal: ${secondQualityFiltered.length} English creators`,
  );
  writeData(
    path.join(intermediaryPath, "07_english_creators_only.json"),
    JSON.stringify(secondQualityFiltered, null, 2),
  );

  const aggQualityFiltered = checkQualityFromAggregatedView(
    qualityConfig,
    secondQualityFiltered,
  );
  console.log(
    `After video metrics filter: ${aggQualityFiltered.length} high-quality creators`,
  );
  writeData(
    path.join(intermediaryPath, "08_video_metrics_filtered.json"),
    JSON.stringify(aggQualityFiltered, null, 2),
  );

  const processed = aggQualityFiltered.filter(
    (r) => hasBio(r) || hasEmailOrLink(r),
  );
  console.log(
    `After contact filter: ${processed.length} creators with contact info`,
  );
  writeData(
    path.join(intermediaryPath, "09_final_with_contact.json"),
    JSON.stringify(processed, null, 2),
  );

  // store the configuration that resulted in this as well to provide context
  const metadata = {
    config,
    options,
    rawResult: {
      ...dataset,
      items: undefined, // removes the items to avoid storing it
    },
    afterProcessing: processed.length,
  };

  const final = {
    processed,
    metadata,
  };

  return { final, timestamp };
}
