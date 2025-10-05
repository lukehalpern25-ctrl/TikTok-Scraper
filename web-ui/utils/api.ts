export interface RunData {
  timestamp: string;
  date: string;
  metadata?: any;
  processed?: any[];
  stepCount?: number;
}

export interface ScraperStatus {
  running: boolean;
  currentStep?: string;
  progress?: number;
  logs: string[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

class ApiClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private wsListeners: ((message: WebSocketMessage) => void)[] = [];

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // REST API methods
  async getRuns(): Promise<RunData[]> {
    const response = await fetch(`${this.baseUrl}/api/runs`);
    if (!response.ok) throw new Error('Failed to fetch runs');
    return response.json();
  }

  async getRunData(timestamp: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/runs/${timestamp}`);
    if (!response.ok) throw new Error('Failed to fetch run data');
    return response.json();
  }

  async getStepData(timestamp: string, step: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/runs/${timestamp}/step/${step}`);
    if (!response.ok) throw new Error('Failed to fetch step data');
    return response.json();
  }

  async getScraperStatus(): Promise<ScraperStatus> {
    const response = await fetch(`${this.baseUrl}/api/scraper/status`);
    if (!response.ok) throw new Error('Failed to fetch scraper status');
    return response.json();
  }

  async startScraper(config: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/scraper/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to start scraper');
  }

  async stopScraper(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/scraper/stop`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to stop scraper');
  }

  async getPipelineStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/pipeline-stats`);
    if (!response.ok) throw new Error('Failed to fetch pipeline stats');
    return response.json();
  }

  // WebSocket methods
  connectWebSocket(): void {
    if (this.ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.wsListeners.forEach(listener => listener(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
      // Attempt to reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onWebSocketMessage(listener: (message: WebSocketMessage) => void): () => void {
    this.wsListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.wsListeners.indexOf(listener);
      if (index > -1) {
        this.wsListeners.splice(index, 1);
      }
    };
  }
}

export const api = new ApiClient();