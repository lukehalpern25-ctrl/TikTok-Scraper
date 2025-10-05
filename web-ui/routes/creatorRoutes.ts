import { CreatorController } from "../controllers/CreatorController";

export class CreatorRoutes {
  private creatorController: CreatorController;

  constructor() {
    this.creatorController = new CreatorController();
  }

  async handleRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // POST /api/creators/update
    if (url.pathname === "/api/creators/update" && request.method === "POST") {
      return this.creatorController.updateCreatorList(request);
    }
    
    // GET /api/creators/stats
    if (url.pathname === "/api/creators/stats" && request.method === "GET") {
      return this.creatorController.getCreatorListStats();
    }
    
    return null;
  }
}