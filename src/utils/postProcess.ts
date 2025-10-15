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
import { readFileSync } from "fs";
import type { CliOptions } from "../interfaces/cliOptions";
import type { DiscoverResponse } from "../interfaces/discover";
import type { HashtagResponse } from "../interfaces/hashtag";
import type { GoodQuality } from "../interfaces/qualityDeterminant";
import type { ExploreResponse } from "../interfaces/explore";

interface ResumeData {
  stage: string;
  timestamp: string;
}

// Helper function to check if we should pause at a stage
function checkForPause(stageName: string, options: CliOptions, timestamp: number): boolean {
  if (options.debugMode && options.pauseAtStage === stageName) {
    console.log(`🔴 DEBUG: Paused at stage: ${stageName}`);
    console.log(`Resume with: --resumeFromStage ${stageName} --resumeTimestamp ${timestamp}`);
    return true;
  }
  return false;
}

// Helper function to load data from a specific stage
function loadStageData(timestamp: string, stage: string): any {
  const stageFiles: { [key: string]: string } = {
    'extraction': '01_extracted_profiles.json',
    'deduplication': '03_deduped_profiles.json',
    'quality-filter-1': '04_min_followers_filtered.json',
    'profile-expansion': '05_expanded_profiles.json',
    'quality-filter-2': '06_english_creators_only.json',
    'quality-filter-3': '07_video_metrics_filtered.json',
    'final': '08_final_with_contact.json'
  };
  
  const filePath = `./out/intermediary/${timestamp}/${stageFiles[stage]}`;
  console.log(`Loading data from stage: ${stage} (${filePath})`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// Both discover and hashtags result in roughly the same data so this is just an abstracted util for both
interface PostProcessResult {
  final: {
    processed: any[];
    metadata: any;
  };
  timestamp: number;
  paused?: boolean;
}

export async function postProcess(
  config: any,
  options: CliOptions,
  dataset: HashtagResponse | DiscoverResponse | ExploreResponse,
  resumeData?: ResumeData,
  existingTimestamp?: number
): Promise<PostProcessResult> {
  // build the quality config
  const qualityConfig: GoodQuality = {
    ...options,
  };

  const timestamp = existingTimestamp || Date.now();
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  // If resuming from a specific stage
  if (resumeData) {
    console.log(`🔄 Resuming from stage: ${resumeData.stage}`);
    
    switch (resumeData.stage) {
      case 'extraction':
        const extractedProfiles = loadStageData(resumeData.timestamp, 'extraction');
        return processFromDeduplication(extractedProfiles, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      case 'deduplication':
        const dedupedProfiles = loadStageData(resumeData.timestamp, 'deduplication');
        return processFromQualityFilter1(dedupedProfiles, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      case 'quality-filter-1':
        const qualityFiltered1 = loadStageData(resumeData.timestamp, 'quality-filter-1');
        return processFromProfileExpansion(qualityFiltered1, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      case 'profile-expansion':
        const expanded = loadStageData(resumeData.timestamp, 'profile-expansion');
        return processFromQualityFilter2(expanded, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      case 'quality-filter-2':
        const qualityFiltered2 = loadStageData(resumeData.timestamp, 'quality-filter-2');
        return processFromQualityFilter3(qualityFiltered2, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      case 'quality-filter-3':
        const qualityFiltered3 = loadStageData(resumeData.timestamp, 'quality-filter-3');
        return processFromFinal(qualityFiltered3, config, options, qualityConfig, parseInt(resumeData.timestamp));
        
      default:
        throw new Error(`Unknown resume stage: ${resumeData.stage}`);
    }
  }

  console.log(`Starting data processing pipeline...`);

  // Stage 1: Extract profiles
  const authorProfiles = dataset.items
    .map((r) => r.authorMeta)
    .filter((r) => !!r); // remove any falsey values
  console.log(`Extracted ${authorProfiles.length} author profiles`);
  writeData(
    path.join(intermediaryPath, "01_extracted_profiles.json"),
    JSON.stringify(authorProfiles, null, 2),
  );
  
  if (checkForPause('extraction', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromDeduplication(authorProfiles, config, options, qualityConfig, timestamp);
}

// Continue processing from deduplication stage
async function processFromDeduplication(authorProfiles: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

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

  if (checkForPause('deduplication', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromQualityFilter1(deduped, config, options, qualityConfig, timestamp);
}

// Continue processing from quality filter 1 stage
async function processFromQualityFilter1(deduped: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

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

  if (checkForPause('quality-filter-1', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromProfileExpansion(qualityFiltered, config, options, qualityConfig, timestamp);
}

// Continue processing from profile expansion stage
async function processFromProfileExpansion(qualityFiltered: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  console.log(`Expanding profiles with additional data...`);
  const expanded = await expandProfile(qualityFiltered, qualityConfig);
  console.log(
    `Profile expansion complete: ${expanded.length} enhanced profiles`,
  );
  writeData(
    path.join(intermediaryPath, "05_expanded_profiles.json"),
    JSON.stringify(expanded, null, 2),
  );

  if (checkForPause('profile-expansion', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromQualityFilter2(expanded, config, options, qualityConfig, timestamp);
}

// Continue processing from quality filter 2 stage
async function processFromQualityFilter2(expanded: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  const secondQualityFiltered = expanded.filter((r) =>
    isGoodQuality(qualityConfig, { row: r, pass: 2 }),
  );
  console.log(
    `After non-English removal: ${secondQualityFiltered.length} English creators`,
  );
  writeData(
    path.join(intermediaryPath, "06_english_creators_only.json"),
    JSON.stringify(secondQualityFiltered, null, 2),
  );

  if (checkForPause('quality-filter-2', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromQualityFilter3(secondQualityFiltered, config, options, qualityConfig, timestamp);
}

// Continue processing from quality filter 3 stage
async function processFromQualityFilter3(secondQualityFiltered: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  const aggQualityFiltered = checkQualityFromAggregatedView(
    qualityConfig,
    secondQualityFiltered,
  );
  console.log(
    `After video metrics filter: ${aggQualityFiltered.length} high-quality creators`,
  );
  writeData(
    path.join(intermediaryPath, "07_video_metrics_filtered.json"),
    JSON.stringify(aggQualityFiltered, null, 2),
  );

  if (checkForPause('quality-filter-3', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  return processFromFinal(aggQualityFiltered, config, options, qualityConfig, timestamp);
}

// Continue processing from final stage
async function processFromFinal(aggQualityFiltered: any[], config: any, options: CliOptions, qualityConfig: GoodQuality, timestamp: number) {
  const intermediaryPath = `./out/intermediary/${timestamp}`;

  const processed = aggQualityFiltered.filter(
    (r) => hasBio(r) || hasEmailOrLink(r),
  );
  console.log(
    `After contact filter: ${processed.length} creators with contact info`,
  );
  writeData(
    path.join(intermediaryPath, "08_final_with_contact.json"),
    JSON.stringify(processed, null, 2),
  );

  if (checkForPause('final', options, timestamp)) {
    return { 
      final: { processed: [], metadata: { afterProcessing: 0 } }, 
      timestamp,
      paused: true 
    };
  }

  // store the configuration that resulted in this as well to provide context
  const metadata = {
    config,
    options,
    rawResult: {
      items: undefined, // removes the items to avoid storing it
      count: 0
    },
    afterProcessing: processed.length,
  };

  const final = {
    processed,
    metadata,
  };

  return { final, timestamp };
}
