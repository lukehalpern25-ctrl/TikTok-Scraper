import { program } from "commander";
import { discover } from "./discover";
import { readFileSync } from "fs";
import { hashtag } from "./hashtag";
import type { CliOptions } from "../interfaces/cliOptions";
import { explore } from "./explore";
import { validExploreCalues } from "../utils/explore";
import { postProcess } from "../utils/postProcess";
import { writeData } from "../utils/writeData";
import path from "path";

// This establishes the CLI and defines the args
program
  .name("Scraper")
  .description("TikTok discover feed scraper")
  .requiredOption(
    "-l, --limitPerQuery <number>",
    "number of items to scrape per query (1-500)",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 500) {
        throw new Error("limitPerQuery must be an integer between 1 and 500");
      }
      return parsed;
    },
  )
  .requiredOption(
    "-q, --query <query>",
    "search query: string, comma-separated strings, or JSON file path",
    (value) => {
      if (value.endsWith(".json")) {
        try {
          const fileContent = readFileSync(value, "utf8");
          const parsed = JSON.parse(fileContent);
          if (
            !Array.isArray(parsed) ||
            !parsed.every((item) => typeof item === "string")
          ) {
            throw new Error("JSON file must contain an array of strings");
          }
          return parsed;
        } catch (error) {
          throw new Error(`Failed to read JSON file: ${error}`);
        }
      }

      if (value.includes(",")) {
        return value
          .split(",")
          .map((s) => s.trim())
          .map((s) => s.replace(/^#/, ""))
          .filter((s) => s.length > 0);
      }

      return [value.trim().replace(/^#/, "")];
    },
  )
  .requiredOption(
    "--removeNonEnglish <boolean>",
    "remove non-English content",
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error("removeNonEnglish must be either true or false");
    },
  )
  .requiredOption(
    "--minFollowers <number>",
    "minimum number of followers",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error("minFollowers must be a non-negative integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "--minVideoViews <number>",
    "minimum video views",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error("minVideoViews must be a non-negative integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "--minAvgViews <number>",
    "minimum average views",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error("minAvgViews must be a non-negative integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "--videoLimitPerProfile <number>",
    "video limit per profile",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error("videoLimitPerProfile must be a positive integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "--includePinnedVideos <boolean>",
    "include pinned videos",
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error("includePinnedVideos must be either true or false");
    },
  )
  .requiredOption(
    "--timeWindowInDays <number>",
    "time window in days",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error("timeWindowInDays must be a positive integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "--minNoOfVideosInWindow <number>",
    "minimum number of videos in time window",
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error("minNoOfVideosInWindow must be a non-negative integer");
      }
      return parsed;
    },
  )
  .requiredOption(
    "-t, --type <type>",
    "scraper type: discover or hashtag or explore",
    (value) => {
      if (value !== "discover" && value !== "hashtag" && value !== "explore") {
        throw new Error("type must be either discover or hashtag or explore");
      }
      return value;
    },
  )
  .option(
    "-p, --provider <provider>",
    "scraper provider: clockworks or apidojo (default: clockworks)",
    (value) => {
      if (value !== "clockworks" && value !== "apidojo") {
        throw new Error("provider must be either clockworks or apidojo");
      }
      return value;
    },
    "clockworks",
  )
  .option(
    "--debugMode <boolean>",
    "enable debug mode with pause/resume functionality",
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error("debugMode must be either true or false");
    },
    false,
  )
  .option(
    "--pauseAtStage <stage>",
    "stage to pause at in debug mode (raw-data, extraction, deduplication, quality-filter-1, profile-expansion, quality-filter-2, quality-filter-3, final)",
    (value) => {
      const validStages = ["raw-data", "extraction", "deduplication", "quality-filter-1", "profile-expansion", "quality-filter-2", "quality-filter-3", "final"];
      if (!validStages.includes(value)) {
        throw new Error(`pauseAtStage must be one of: ${validStages.join(", ")}`);
      }
      return value;
    },
  )
  .option(
    "--resumeFromStage <stage>",
    "stage to resume from (raw-data, extraction, deduplication, quality-filter-1, profile-expansion, quality-filter-2, quality-filter-3, final)",
    (value) => {
      const validStages = ["raw-data", "extraction", "deduplication", "quality-filter-1", "profile-expansion", "quality-filter-2", "quality-filter-3", "final"];
      if (!validStages.includes(value)) {
        throw new Error(`resumeFromStage must be one of: ${validStages.join(", ")}`);
      }
      return value;
    },
  )
  .option(
    "--resumeTimestamp <timestamp>",
    "timestamp of the session to resume from",
  )
  .action(async (options: CliOptions) => {
    // Handle resume logic first
    if (options.resumeFromStage && options.resumeTimestamp) {
      console.log(`🔄 Resuming ${options.type} scraper from stage: ${options.resumeFromStage}`);
      console.log(`Using timestamp: ${options.resumeTimestamp}`);
      
      if (options.resumeFromStage === "raw-data") {
        // Resume from raw data - load dataset and proceed to postProcess
        const rawDataPath = `./out/intermediary/${options.resumeTimestamp}/00_raw_dataset.json`;
        console.log(`Loading raw dataset from: ${rawDataPath}`);
        
        try {
          const rawDataset = JSON.parse(readFileSync(rawDataPath, 'utf8'));
          console.log(`Loaded raw dataset with ${rawDataset.count} items`);
          
          // Proceed directly to postProcess
          const configKey = options.type === 'hashtag' ? 'hashtags' : options.type === 'discover' ? 'keywords' : 'topics';
          const { final, timestamp } = await postProcess(
            { [configKey]: options.query, resultsPerPage: options.limitPerQuery },
            options,
            rawDataset,
            undefined,
            parseInt(options.resumeTimestamp)
          );
          
          // Save final results
          const outputPath = `./out/${options.type}`;
          const fileName = `${timestamp}.json`;
          const fullPath = path.join(outputPath, fileName);
          writeData(fullPath, JSON.stringify(final, null, 2));
          
          console.log(`Resume process complete - ${final.processed.length} creators found and saved to ${fullPath}`);
          return;
        } catch (error) {
          throw new Error(`Failed to load raw dataset: ${error}`);
        }
      } else {
        // Resume from other stages - handled by postProcess
        const configKey = options.type === 'hashtag' ? 'hashtags' : options.type === 'discover' ? 'keywords' : 'topics';
        const { final, timestamp } = await postProcess(
          { [configKey]: options.query, resultsPerPage: options.limitPerQuery },
          options,
          { items: [], count: 0 }, // Empty dataset since we're resuming
          { stage: options.resumeFromStage, timestamp: options.resumeTimestamp },
          parseInt(options.resumeTimestamp)
        );
        
        // Save final results
        const outputPath = `./out/${options.type}`;
        const fileName = `${timestamp}.json`;
        const fullPath = path.join(outputPath, fileName);
        writeData(fullPath, JSON.stringify(final, null, 2));
        
        console.log(`Resume process complete - ${final.processed.length} creators found and saved to ${fullPath}`);
        return;
      }
    }

    console.log(
      `Starting ${options.type} scraper using ${options.provider} provider${options.debugMode ? ' in DEBUG mode' : ''}, scrapping ${options.limitPerQuery} items for queries:`,
      options.query,
    );

    if (options.debugMode && options.pauseAtStage) {
      console.log(`🐛 Debug mode enabled - will pause at stage: ${options.pauseAtStage}`);
    }

    if (options.type === "explore") {
      if (options.query.some((query) => !validExploreCalues.includes(query))) {
        throw new Error(
          "Invalid explore query, valid values are: " +
            validExploreCalues.join(", "),
        );
      }
    }

    // Validate provider compatibility
    if (options.provider === "apidojo" && options.type !== "hashtag") {
      throw new Error(
        "Apidojo provider only supports hashtag scraping. Please use clockworks provider for discover and explore scraping.",
      );
    }

    // Validate debug mode options
    if (options.debugMode && !options.pauseAtStage) {
      throw new Error("Debug mode requires pauseAtStage to be specified");
    }

    // check that videoLimitPerProfile is less than or equal to limitPerQuery
    if (options.videoLimitPerProfile < options.minNoOfVideosInWindow) {
      throw new Error(
        "The minNoOfVideosInWindow must be less than or equal to the videoLimitPerProfile",
      );
    }

    switch (options.type) {
      case "hashtag":
        await hashtag(options);
        break;
      case "discover":
        await discover(options);
        break;
      case "explore":
        await explore(options);
        break;
      default:
        throw new Error("Invalid scraper type");
    }
  });

// Starts the program proper
program.parse();
