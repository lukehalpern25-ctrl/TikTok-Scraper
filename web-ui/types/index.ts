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
  logs?: string[];
}

export interface WebSocketCallbacks {
  onProgress: (progress: number, step: string) => void;
  onLog: (log: string) => void;
  onComplete: (success: boolean, error?: string) => void;
}