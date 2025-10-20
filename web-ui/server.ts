import { WebSocketService } from "./services/WebSocketService";
import { DataRoutes } from "./routes/dataRoutes";
import { ScraperRoutes } from "./routes/scraperRoutes";
import { CreatorRoutes } from "./routes/creatorRoutes";
import { StaticRoutes } from "./routes/staticRoutes";

// Initialize services
const wsService = new WebSocketService();

// Initialize route handlers
const dataRoutes = new DataRoutes();
const scraperRoutes = new ScraperRoutes(wsService);
const creatorRoutes = new CreatorRoutes();
const staticRoutes = new StaticRoutes();

const server = Bun.serve({
  port: 3002,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      if (server.upgrade(req)) {
        return; // Successfully upgraded to WebSocket
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Try each route handler in order
    let response: Response | null = null;

    // Try static routes first (for performance)
    response = await staticRoutes.handleRequest(req);
    if (response) return response;

    // Try API routes
    response = await dataRoutes.handleRequest(req);
    if (response) return response;

    response = await scraperRoutes.handleRequest(req);
    if (response) return response;

    response = await creatorRoutes.handleRequest(req);
    if (response) return response;

    // If no route matched, return 404
    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      wsService.addConnection(ws);
    },

    message(ws, message) {
      wsService.handleMessage(ws, message);
    },

    close(ws) {
      wsService.removeConnection(ws);
    },
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 TikTok Scraper UI running at http://localhost:${server.port}`);