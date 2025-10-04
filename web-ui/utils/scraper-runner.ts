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
          APIFY_TOKEN: 'Replace with your Apify token',
        },
      });

      let buffer = "";

      currentProcess.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        buffer += text;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        lines.forEach((line) => {
          if (line.trim()) {
            this.processLogLine(line.trim());
          }
        });
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

    // Extract progress information from log patterns
    if (
      line.includes("Starting") &&
      (line.includes("hashtag") || line.includes("discover"))
    ) {
      this.updateProgress(10, "Starting scraper");
    } else if (line.includes("Scraper configured")) {
      this.updateProgress(15, "Configuring scraper");
    } else if (line.includes("Initiating TikTok")) {
      this.updateProgress(20, "Connecting to TikTok API");
    } else if (line.includes("Scraping completed")) {
      this.updateProgress(40, "Scraping completed");
    } else if (line.includes("Dataset retrieved")) {
      this.updateProgress(45, "Retrieving dataset");
    } else if (line.includes("Starting data processing")) {
      this.updateProgress(50, "Processing data");
    } else if (line.includes("Extracted") && line.includes("author profiles")) {
      this.updateProgress(55, "Extracting profiles");
    } else if (line.includes("After deduplication")) {
      this.updateProgress(60, "Removing duplicates");
    } else if (line.includes("Quality check pass 1")) {
      this.updateProgress(65, "Quality filtering (pass 1)");
    } else if (line.includes("Expanding profiles")) {
      this.updateProgress(70, "Expanding profiles");
    } else if (line.includes("Profile expansion complete")) {
      this.updateProgress(80, "Profile expansion complete");
    } else if (line.includes("Quality check pass 2")) {
      this.updateProgress(85, "Quality filtering (pass 2)");
    } else if (line.includes("Quality check aggregation")) {
      this.updateProgress(90, "Aggregation quality filtering");
    } else if (line.includes("Saving results")) {
      this.updateProgress(95, "Saving results");
    } else if (line.includes("complete") && line.includes("scraper")) {
      this.updateProgress(100, "Process complete");
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

