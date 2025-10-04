import { DataService } from "../services/DataService";

export class DataController {
  private dataService: DataService;

  constructor() {
    this.dataService = new DataService();
  }

  async getRuns() {
    try {
      const runs = this.dataService.getAvailableRuns();
      return Response.json(runs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get runs";
      return Response.json({ error: errorMessage }, { status: 500 });
    }
  }

  async getRunData(timestamp: string) {
    try {
      const data = this.dataService.getRunData(timestamp);
      return Response.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return Response.json({ error: errorMessage }, { status: 404 });
    }
  }

  async getStepData(timestamp: string, step: string) {
    try {
      const data = this.dataService.getStepData(timestamp, step);
      return Response.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return Response.json({ error: errorMessage }, { status: 404 });
    }
  }

  async getPipelineStats() {
    try {
      const stats = this.dataService.getAveragePipelineStats();
      return Response.json(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get pipeline stats";
      return Response.json({ error: errorMessage }, { status: 500 });
    }
  }
}