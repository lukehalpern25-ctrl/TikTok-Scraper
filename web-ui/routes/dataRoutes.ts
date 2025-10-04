import { DataController } from "../controllers/DataController";

export class DataRoutes {
  private dataController: DataController;

  constructor() {
    this.dataController = new DataController();
  }

  async handleRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // GET /api/runs
    if (url.pathname === "/api/runs" && request.method === "GET") {
      return this.dataController.getRuns();
    }
    
    // GET /api/pipeline-stats
    if (url.pathname === "/api/pipeline-stats" && request.method === "GET") {
      return this.dataController.getPipelineStats();
    }
    
    // GET /api/runs/:timestamp
    if (url.pathname.startsWith("/api/runs/")) {
      const parts = url.pathname.split("/");
      const timestamp = parts[3];
      
      if (parts.length === 4) {
        return this.dataController.getRunData(timestamp);
      }
      
      // GET /api/runs/:timestamp/step/:step
      if (parts[4] === "step" && parts[5]) {
        return this.dataController.getStepData(timestamp, parts[5]);
      }
    }
    
    return null;
  }
}