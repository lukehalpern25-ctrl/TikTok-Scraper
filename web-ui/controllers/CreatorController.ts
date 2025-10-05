import { appendFileSync, existsSync } from "fs";
import path from "path";

export class CreatorController {
  private creatorListPath: string;

  constructor() {
    this.creatorListPath = path.join(process.cwd(), "..", "src", "data", "Creator_URL_Key.csv");
  }

  async updateCreatorList(request: Request) {
    try {
      const { profileUrls } = await request.json() as { profileUrls: string[] };

      if (!Array.isArray(profileUrls) || profileUrls.length === 0) {
        return Response.json({ error: "Invalid profile URLs provided" }, { status: 400 });
      }

      // Check if the creator list file exists
      if (!existsSync(this.creatorListPath)) {
        return Response.json({ error: "Creator list file not found" }, { status: 404 });
      }

      // Append new profile URLs to the CSV file
      // Format: URL,timestamp (simple CSV format)
      const timestamp = new Date().toISOString();
      const csvLines = profileUrls.map(url => `${url},${timestamp}`).join('\n');
      
      // Append with newline prefix to ensure proper formatting
      appendFileSync(this.creatorListPath, '\n' + csvLines);

      return Response.json({ 
        success: true, 
        message: `Successfully added ${profileUrls.length} creators to the list`,
        count: profileUrls.length 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return Response.json({ error: `Failed to update creator list: ${errorMessage}` }, { status: 500 });
    }
  }

  async getCreatorListStats() {
    try {
      if (!existsSync(this.creatorListPath)) {
        return Response.json({ count: 0, exists: false });
      }

      // Read file and count lines (excluding header if any)
      const fs = await import("fs");
      const content = fs.readFileSync(this.creatorListPath, "utf8");
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      return Response.json({ 
        count: lines.length,
        exists: true,
        path: this.creatorListPath
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return Response.json({ error: `Failed to get creator list stats: ${errorMessage}` }, { status: 500 });
    }
  }
}