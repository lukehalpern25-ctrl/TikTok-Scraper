import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import index from "./index.html";
import { scraperRunner } from "./utils/scraper-runner";

interface RunData {
  timestamp: string;
  date: string;
  metadata?: any;
  processed?: any[];
  stepCount?: number;
}

interface ScraperStatus {
  running: boolean;
  currentStep?: string;
  progress?: number;
  logs?: string[];
}

let scraperStatus: ScraperStatus = { running: false, logs: [] };
let wsConnections = new Set<any>();

// Utility functions for data access
function getAvailableRuns(): RunData[] {
  try {
    const discoverPath = path.join(process.cwd(), "../out/discover");
    const files = readdirSync(discoverPath)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const timestamp = f.replace(".json", "");
        const filePath = path.join(discoverPath, f);
        const stats = statSync(filePath);

        // Try to read metadata
        let metadata, processed;
        try {
          const content = JSON.parse(readFileSync(filePath, "utf8"));
          metadata = content.metadata;
          processed = content.processed;
        } catch (e) {
          console.warn(`Failed to parse ${f}:`, e);
        }

        return {
          timestamp,
          date: stats.mtime.toISOString(),
          metadata,
          processed,
          stepCount: getStepCount(timestamp),
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return files;
  } catch (error) {
    console.warn("No discover directory found:", error);
    return [];
  }
}

function getStepCount(timestamp: string): number {
  try {
    const intermediaryPath = path.join(
      process.cwd(),
      "../out/intermediary",
      timestamp,
    );
    return readdirSync(intermediaryPath).filter((f) => f.endsWith(".json"))
      .length;
  } catch {
    return 0;
  }
}

function getRunData(timestamp: string) {
  try {
    const filePath = path.join(
      process.cwd(),
      "../out/discover",
      `${timestamp}.json`,
    );
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Run not found: ${timestamp}`);
  }
}

function getStepData(timestamp: string, step: string) {
  try {
    const filePath = path.join(
      process.cwd(),
      "../out/intermediary",
      timestamp,
      `${step}.json`,
    );
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Step data not found: ${timestamp}/${step}`);
  }
}

function broadcastToWebSockets(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  wsConnections.forEach((ws) => {
    try {
      ws.send(message);
    } catch (e) {
      wsConnections.delete(ws);
    }
  });
}

const server = Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      if (server.upgrade(req)) {
        return; // Successfully upgraded to WebSocket
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Serve the main page
    if (url.pathname === "/") {
      return new Response(await Bun.file("./index.html").text(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve static files
    if (url.pathname.startsWith("/styles/")) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/css" }
        });
      }
    }
    
    // Serve and transpile TypeScript/TSX files
    if (url.pathname.startsWith("/components/") && (url.pathname.endsWith(".tsx") || url.pathname.endsWith(".ts"))) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        try {
          const result = await Bun.build({
            entrypoints: [filePath],
            format: "esm",
            target: "browser",
            minify: false,
            splitting: false,
          });
          
          if (result.success && result.outputs[0]) {
            const jsContent = await result.outputs[0].text();
            return new Response(jsContent, {
              headers: { "Content-Type": "application/javascript" }
            });
          }
        } catch (error) {
          console.error("Failed to transpile:", error);
        }
      }
    }

    // API Routes
    if (url.pathname === "/api/runs") {
      return new Response(JSON.stringify(getAvailableRuns()), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.startsWith("/api/runs/")) {
      const parts = url.pathname.split("/");
      const timestamp = parts[3];

      if (parts.length === 4) {
        // Get run details
        try {
          const data = getRunData(timestamp);
          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (parts[4] === "step" && parts[5]) {
        // Get step data
        try {
          const data = getStepData(timestamp, parts[5]);
          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    if (url.pathname === "/api/scraper/status") {
      return new Response(JSON.stringify(scraperStatus), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/scraper/start" && req.method === "POST") {
      if (scraperRunner.isRunning()) {
        return new Response(
          JSON.stringify({ error: "Scraper already running" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      try {
        const config = (await req.json()) as any;

        // Set up scraper callbacks
        scraperRunner.setCallbacks({
          onProgress: (progress, step) => {
            scraperStatus.progress = progress;
            scraperStatus.currentStep = step;
            broadcastToWebSockets("progress", { progress, step });
          },
          onLog: (log) => {
            if (!scraperStatus.logs) scraperStatus.logs = [];
            scraperStatus.logs.push(log);
            broadcastToWebSockets("log", log);
          },
          onComplete: (success, error) => {
            scraperStatus.running = false;
            scraperStatus.currentStep = success ? "Completed" : "Failed";
            scraperStatus.progress = success ? 100 : 0;
            broadcastToWebSockets("status", scraperStatus);
            if (error) {
              broadcastToWebSockets("log", `Error: ${error}`);
            }
          },
        });

        // Start the scraper
        scraperStatus.running = true;
        scraperStatus.currentStep = "Starting...";
        scraperStatus.progress = 0;
        scraperStatus.logs = [];

        broadcastToWebSockets("status", scraperStatus);

        // Start scraper asynchronously
        scraperRunner.start(config).catch((error) => {
          scraperStatus.running = false;
          scraperStatus.currentStep = "Failed to start";
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          broadcastToWebSockets("log", `Failed to start: ${errorMessage}`);
          broadcastToWebSockets("status", scraperStatus);
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Invalid configuration";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/api/scraper/stop" && req.method === "POST") {
      scraperRunner.stop();

      scraperStatus.running = false;
      scraperStatus.currentStep = "Stopped";
      scraperStatus.progress = 0;

      broadcastToWebSockets("status", scraperStatus);
      broadcastToWebSockets("log", "Scraper stopped by user");

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      wsConnections.add(ws);
      ws.send(
        JSON.stringify({ type: "connected", data: "WebSocket connected" }),
      );
    },

    message(ws, message) {
      // Handle incoming WebSocket messages if needed
      console.log("WebSocket message:", message);
    },

    close(ws) {
      wsConnections.delete(ws);
    },
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 TikTok Scraper UI running at http://localhost:${server.port}`);

