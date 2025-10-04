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
          this.scraperStatus.currentStep = success ? "Completed" : "Failed";
          this.scraperStatus.progress = success ? 100 : 0;
          this.wsService.broadcast("status", this.scraperStatus);
          if (error) {
            this.wsService.broadcast("log", `Error: ${error}`);
          }
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
    this.scraperStatus.currentStep = "Stopped";
    this.scraperStatus.progress = 0;

    this.wsService.broadcast("status", this.scraperStatus);
    this.wsService.broadcast("log", "Scraper stopped by user");

    return Response.json({ success: true });
  }
}