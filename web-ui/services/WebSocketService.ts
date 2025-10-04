export class WebSocketService {
  private wsConnections = new Set<any>();

  addConnection(ws: any) {
    this.wsConnections.add(ws);
    ws.send(JSON.stringify({ type: "connected", data: "WebSocket connected" }));
  }

  removeConnection(ws: any) {
    this.wsConnections.delete(ws);
  }

  broadcast(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    this.wsConnections.forEach((ws) => {
      try {
        ws.send(message);
      } catch (e) {
        this.wsConnections.delete(ws);
      }
    });
  }

  handleMessage(ws: any, message: any) {
    // Handle incoming WebSocket messages if needed
    console.log("WebSocket message:", message);
  }
}