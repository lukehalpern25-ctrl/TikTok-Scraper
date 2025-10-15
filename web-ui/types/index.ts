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
  // Debug/pause state
  paused?: boolean;
  pausedAt?: string; // stage name
  pausedTimestamp?: string;
  availableStages?: string[];
  canResume?: boolean;
}

export interface WebSocketCallbacks {
  onProgress: (progress: number, step: string) => void;
  onLog: (log: string) => void;
  onComplete: (success: boolean, error?: string) => void;
}