import { scraperRunner } from "../utils/scraper-runner";
import { ScraperStatus } from "../types";
import { WebSocketService } from "../services/WebSocketService";

export class ScraperController {
  private scraperStatus: ScraperStatus = { running: false, logs: [] };
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  getStatus() {
    return Response.json(this.scraperStatus);
  }

  async startScraper(request: Request) {
    if (scraperRunner.isRunning()) {
      return Response.json({ error: "Scraper already running" }, { status: 400 });
    }

    try {
      const config = await request.json() as any;

      // Set up scraper callbacks
      scraperRunner.setCallbacks({
        onProgress: (progress, step) => {
          this.scraperStatus.progress = progress;
          this.scraperStatus.currentStep = step;
          this.wsService.broadcast("progress", { progress, step });
        },
        onLog: (log) => {
          if (!this.scraperStatus.logs) this.scraperStatus.logs = [];
          this.scraperStatus.logs.push(log);
          this.wsService.broadcast("log", log);
        },
        onComplete: (success, error) => {
          this.scraperStatus.running = false;
          this.scraperStatus.paused = false;
          this.scraperStatus.currentStep = success ? "Completed" : "Failed";
          this.scraperStatus.progress = success ? 100 : 0;
          this.wsService.broadcast("status", this.scraperStatus);
          if (error) {
            this.wsService.broadcast("log", `Error: ${error}`);
          }
        },
        onPaused: (stage, timestamp) => {
          this.scraperStatus.running = false;
          this.scraperStatus.paused = true;
          this.scraperStatus.pausedAt = stage;
          this.scraperStatus.pausedTimestamp = timestamp;
          this.scraperStatus.canResume = true;
          this.scraperStatus.currentStep = `Paused at: ${this.getStageDisplayName(stage)}`;
          this.wsService.broadcast("paused", {
            stage,
            timestamp,
            stageName: this.getStageDisplayName(stage)
          });
          this.wsService.broadcast("status", this.scraperStatus);
        }
      });

      // Start the scraper
      this.scraperStatus.running = true;
      this.scraperStatus.currentStep = "Starting...";
      this.scraperStatus.progress = 0;
      this.scraperStatus.logs = [];

      this.wsService.broadcast("status", this.scraperStatus);

      // Start scraper asynchronously
      scraperRunner.start(config).catch((error) => {
        this.scraperStatus.running = false;
        this.scraperStatus.currentStep = "Failed to start";
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.wsService.broadcast("log", `Failed to start: ${errorMessage}`);
        this.wsService.broadcast("status", this.scraperStatus);
      });

      return Response.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid configuration";
      return Response.json({ error: errorMessage }, { status: 400 });
    }
  }

  stopScraper() {
    scraperRunner.stop();

    this.scraperStatus.running = false;
    this.scraperStatus.paused = false;
    this.scraperStatus.currentStep = "Stopped";
    this.scraperStatus.progress = 0;

    this.wsService.broadcast("status", this.scraperStatus);
    this.wsService.broadcast("log", "Scraper stopped by user");

    return Response.json({ success: true });
  }

  async resumeScraper(request: Request) {
    if (scraperRunner.isRunning()) {
      return Response.json({ error: "Scraper already running" }, { status: 400 });
    }

    if (!this.scraperStatus.paused || !this.scraperStatus.pausedTimestamp) {
      return Response.json({ error: "No paused session to resume" }, { status: 400 });
    }

    try {
      const { stage, config } = await request.json();
      
      // Create resume config
      const resumeConfig = {
        ...config,
        resumeFromStage: stage || this.scraperStatus.pausedAt,
        resumeTimestamp: this.scraperStatus.pausedTimestamp,
        debugMode: false, // Don't pause again when resuming
        pauseAtStage: undefined
      };

      // Set up callbacks again
      scraperRunner.setCallbacks({
        onProgress: (progress, step) => {
          this.scraperStatus.progress = progress;
          this.scraperStatus.currentStep = step;
          this.wsService.broadcast("progress", { progress, step });
        },
        onLog: (log) => {
          if (!this.scraperStatus.logs) this.scraperStatus.logs = [];
          this.scraperStatus.logs.push(log);
          this.wsService.broadcast("log", log);
        },
        onComplete: (success, error) => {
          this.scraperStatus.running = false;
          this.scraperStatus.paused = false;
          this.scraperStatus.pausedAt = undefined;
          this.scraperStatus.pausedTimestamp = undefined;
          this.scraperStatus.canResume = false;
          this.scraperStatus.currentStep = success ? "Completed" : "Failed";
          this.scraperStatus.progress = success ? 100 : 0;
          this.wsService.broadcast("status", this.scraperStatus);
          if (error) {
            this.wsService.broadcast("log", `Error: ${error}`);
          }
        }
      });

      // Start resume process
      this.scraperStatus.running = true;
      this.scraperStatus.paused = false;
      this.scraperStatus.currentStep = `Resuming from ${this.getStageDisplayName(stage || this.scraperStatus.pausedAt!)}...`;
      this.scraperStatus.progress = 0;

      this.wsService.broadcast("status", this.scraperStatus);

      // Start scraper asynchronously
      scraperRunner.start(resumeConfig).catch((error) => {
        this.scraperStatus.running = false;
        this.scraperStatus.currentStep = "Failed to resume";
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.wsService.broadcast("log", `Failed to resume: ${errorMessage}`);
        this.wsService.broadcast("status", this.scraperStatus);
      });

      return Response.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid resume configuration";
      return Response.json({ error: errorMessage }, { status: 400 });
    }
  }

  private getStageDisplayName(stage: string): string {
    const stageNames: { [key: string]: string } = {
      'raw-data': 'Raw Data Collection',
      'extraction': 'Profile Extraction',
      'deduplication': 'Deduplication',
      'quality-filter-1': 'First Quality Filter',
      'profile-expansion': 'Profile Expansion',
      'quality-filter-2': 'Second Quality Filter',
      'quality-filter-3': 'Third Quality Filter',
      'final': 'Contact Filter'
    };
    return stageNames[stage] || stage;
  }
}