import { ScraperController } from "../controllers/ScraperController";
import { WebSocketService } from "../services/WebSocketService";

export class ScraperRoutes {
  private scraperController: ScraperController;

  constructor(wsService: WebSocketService) {
    this.scraperController = new ScraperController(wsService);
  }

  async handleRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // GET /api/scraper/status
    if (url.pathname === "/api/scraper/status" && request.method === "GET") {
      return this.scraperController.getStatus();
    }
    
    // POST /api/scraper/start
    if (url.pathname === "/api/scraper/start" && request.method === "POST") {
      return this.scraperController.startScraper(request);
    }
    
    // POST /api/scraper/stop
    if (url.pathname === "/api/scraper/stop" && request.method === "POST") {
      return this.scraperController.stopScraper();
    }
    
    // POST /api/scraper/resume
    if (url.pathname === "/api/scraper/resume" && request.method === "POST") {
      return this.scraperController.resumeScraper(request);
    }
    
    return null;
  }
}