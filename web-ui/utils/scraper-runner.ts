import { spawn } from "child_process";
import path from "path";

type ScraperType = "discover" | "hashtag";

interface ScraperConfig {
  // Basic config
  limitPerQuery: number;
  query: string[];
  type: ScraperType;

  // First pass filters
  minFollowers: number;

  // Second pass filters
  removeNonEnglish: boolean;

  // Aggregation pass
  minVideoViews: number;
  minAvgViews: number;
  minNoOfVideosInWindow: number;

  // Direct to apify
  videoLimitPerProfile: number;
  includePinnedVideos: boolean;
  timeWindowInDays: number;
}

interface ScraperCallbacks {
  onProgress?: (progress: number, step: string) => void;
  onLog?: (log: string) => void;
  onComplete?: (success: boolean, error?: string) => void;
}

let currentProcess: any = null;

export class ScraperRunner {
  private callbacks: ScraperCallbacks = {};

  setCallbacks(callbacks: ScraperCallbacks) {
    this.callbacks = callbacks;
  }

  async start(config: ScraperConfig): Promise<void> {
    if (currentProcess) {
      throw new Error("Scraper is already running");
    }

    this.log("🚀 Starting TikTok scraper...");
    this.updateProgress(0, "Initializing...");

    try {
      // Convert config to command line arguments
      const args = [
        "./src/scrapers/main.ts",
        "--limitPerQuery",
        config.limitPerQuery.toString(),
        "--query",
        config.query.join(","),
        "--removeNonEnglish",
        config.removeNonEnglish.toString(),
        "--minFollowers",
        config.minFollowers.toString(),
        "--minVideoViews",
        config.minVideoViews.toString(),
        "--minAvgViews",
        config.minAvgViews.toString(),
        "--videoLimitPerProfile",
        config.videoLimitPerProfile.toString(),
        "--includePinnedVideos",
        config.includePinnedVideos.toString(),
        "--timeWindowInDays",
        config.timeWindowInDays.toString(),
        "--minNoOfVideosInWindow",
        config.minNoOfVideosInWindow.toString(),
        "--type",
        config.type,
      ];

      this.log(`📋 Command: bun ${args.join(" ")}`);
      this.updateProgress(5, "Starting scraper process...");

      // Spawn the scraper process
      currentProcess = spawn("bun", args, {
        cwd: path.join(process.cwd(), ".."),
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
        },
      });

      let buffer = "";

      currentProcess.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        buffer += text;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        if (lines.length > 0) {
          this.processLogLine(lines[lines.length - 1] || "");
        }
      });

      currentProcess.stderr?.on("data", (data: Buffer) => {
        const errorText = data.toString();
        this.log(`❌ Error: ${errorText}`);
      });

      currentProcess.on("close", (code: number) => {
        currentProcess = null;

        if (code === 0) {
          this.updateProgress(100, "Completed successfully");
          this.log("✅ Scraper completed successfully!");
          this.callbacks.onComplete?.(true);
        } else {
          this.log(`❌ Scraper failed with exit code: ${code}`);
          this.callbacks.onComplete?.(
            false,
            `Process exited with code ${code}`,
          );
        }
      });

      currentProcess.on("error", (error: Error) => {
        currentProcess = null;
        this.log(`❌ Process error: ${error.message}`);
        this.callbacks.onComplete?.(false, error.message);
      });
    } catch (error) {
      currentProcess = null;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.log(`❌ Failed to start scraper: ${errorMessage}`);
      this.callbacks.onComplete?.(false, errorMessage);
      throw error;
    }
  }

  stop(): void {
    if (currentProcess) {
      this.log("🛑 Stopping scraper...");
      currentProcess.kill("SIGTERM");

      // Force kill after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        if (currentProcess) {
          currentProcess.kill("SIGKILL");
        }
      }, 5000);
    }
  }

  isRunning(): boolean {
    return currentProcess !== null;
  }

  private processLogLine(line: string): void {
    this.log(line);

    const logText = line.toLowerCase();
    console.log(logText);

    // Define pipeline stages based on actual log messages from src/utils/postProcess.ts
    const stages = [
      {
        keyword: "starting data processing pipeline",
        progress: 5,
        step: "Initializing data processing pipeline",
      },
      {
        keyword: "extracted",
        progress: 15,
        step: "Extracting author profiles",
      },
      {
        keyword: "after deduplication",
        progress: 25,
        step: "Removing duplicate profiles",
      },
      {
        keyword: "after initial quality filter",
        progress: 35,
        step: "Applying first quality filter",
      },
      {
        keyword: "expanding profiles with additional data",
        progress: 45,
        step: "Expanding profiles with additional data",
      },
      {
        keyword: "profile expansion complete",
        progress: 60,
        step: "Profile expansion completed",
      },
      {
        keyword: "after final deduplication",
        progress: 70,
        step: "Final deduplication of video rows",
      },
      {
        keyword: "after second quality filter",
        progress: 80,
        step: "Applying second quality filter",
      },
      {
        keyword: "after third quality filter",
        progress: 90,
        step: "Applying third quality filter",
      },
      {
        keyword: "after contact filter",
        progress: 95,
        step: "Filtering profiles with contact info",
      },
      {
        keyword: "process complete",
        progress: 100,
        step: "Scraping process completed",
      },
    ];

    // Find the highest progress stage that has been reached
    let currentProgress = 0;
    let currentStep = "Initializing...";

    for (const stage of stages) {
      if (logText.includes(stage.keyword)) {
        currentProgress = stage.progress;
        currentStep = stage.step;
      }
    }

    // Special handling for scraper initialization
    if (
      logText.includes("starting hashtag scraper") ||
      logText.includes("starting discover scraper")
    ) {
      currentProgress = Math.max(currentProgress, 1);
      currentStep = "Starting scraper...";
    }

    if (logText.includes("scraper configured")) {
      currentProgress = Math.max(currentProgress, 2);
      currentStep = "Configuring scraper...";
    }

    if (
      logText.includes("initiating tiktok hashtag scraper") ||
      logText.includes("initiating tiktok discover scraper")
    ) {
      currentProgress = Math.max(currentProgress, 3);
      currentStep = "Initiating TikTok scraper...";
    }

    if (logText.includes("scraping completed")) {
      currentProgress = Math.max(currentProgress, 4);
      currentStep = "Scraping completed, retrieving dataset...";
    }

    if (logText.includes("dataset retrieved")) {
      currentProgress = Math.max(currentProgress, 5);
      currentStep = "Dataset retrieved, starting processing...";
    }

    console.log(currentProgress, currentStep);

    // should not go back to 0
    if (currentProgress !== 0) {
      // Update status if progress has changed
      this.updateProgress(currentProgress, currentStep);
    }
  }

  private log(message: string): void {
    this.callbacks.onLog?.(message);
  }

  private updateProgress(progress: number, step: string): void {
    this.callbacks.onProgress?.(progress, step);
  }
}

export const scraperRunner = new ScraperRunner();
