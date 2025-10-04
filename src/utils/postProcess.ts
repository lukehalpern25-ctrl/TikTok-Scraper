import { dedupe } from "../filters/dedupe";
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

// Both discover and hashtags result in roughly the same data so this is just an abstracted util for both
export async function postProcess(
  config: any,
  options: CliOptions,
  dataset: HashtagResponse | DiscoverResponse,
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

  const deduped = authorProfiles.filter(dedupe);
  console.log(`After deduplication: ${deduped.length} unique profiles`);
  writeData(
    path.join(intermediaryPath, "02_deduped_profiles.json"),
    JSON.stringify(deduped, null, 2),
  );

  const qualityFiltered = deduped.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 1 }),
  );
  console.log(
    `After initial quality filter: ${qualityFiltered.length} profiles`,
  );
  writeData(
    path.join(intermediaryPath, "03_quality_filtered_pass1.json"),
    JSON.stringify(qualityFiltered, null, 2),
  );

  console.log(`Expanding profiles with additional data...`);
  const expanded = await expandProfile(
    qualityFiltered,
    qualityConfig,
  );
  console.log(
    `Profile expansion complete: ${expanded.length} enhanced profiles`,
  );
  writeData(
    path.join(intermediaryPath, "04_expanded_profiles.json"),
    JSON.stringify(expanded, null, 2),
  );

  const finalDeduping = expanded.filter(dedupe);
  console.log(
    `After final deduplication: ${finalDeduping.length} unique video rows`,
  );
  writeData(
    path.join(intermediaryPath, "05_final_deduped_video_rows.json"),
    JSON.stringify(finalDeduping, null, 2),
  );

  const secondQualityFiltered = finalDeduping.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 2 }),
  );
  console.log(
    `After second quality filter: ${secondQualityFiltered.length} video rows`,
  );
  writeData(
    path.join(intermediaryPath, "06_quality_filtered_pass2.json"),
    JSON.stringify(secondQualityFiltered, null, 2),
  );

  const aggQualityFiltered = checkQualityFromAggregatedView(
    qualityConfig,
    secondQualityFiltered,
  );
  console.log(
    `After third quality filter: ${aggQualityFiltered.length} profiles`,
  );
  writeData(
    path.join(intermediaryPath, "07_quality_filtered_pass3.json"),
    JSON.stringify(aggQualityFiltered, null, 2),
  );

  const processed = aggQualityFiltered.filter(
    (r) => hasBio(r) || hasEmailOrLink(r),
  );
  console.log(
    `After contact filter: ${processed.length} profiles with contact info`,
  );
  writeData(
    path.join(intermediaryPath, "08_final_processed.json"),
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
