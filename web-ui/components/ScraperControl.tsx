import React, { useState, useEffect } from "react";
import { api, ScraperStatus, WebSocketMessage } from "../utils/api";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Upload,
  Download,
  Trash2,
  RotateCcw,
  X,
} from "lucide-react";
import { validExploreValues, exploreValueLabels } from "../utils/exploreValues";

type ScraperType = "discover" | "hashtag" | "explore";

interface ScraperConfig {
  // Basic config
  limitPerQuery: number;
  query: string[];
  type: ScraperType;

  // First pass filters
  minFollowers: number;

  // Second pass filters
  removeNonEnglish: boolean;

  // Aggregation pass
  minVideoViews: number;
  minAvgViews: number;
  minNoOfVideosInWindow: number;

  // Direct to apify
  videoLimitPerProfile: number;
  includePinnedVideos: boolean;
  timeWindowInDays: number;
}

// LocalStorage helpers for saving/loading configurations
interface SavedConfig extends ScraperConfig {
  timestamp: number;
  label: string;
}

const saveConfigToLocalStorage = (config: ScraperConfig) => {
  const key = `scraperConfigs_${config.type}`;
  const savedConfigs = getSavedConfigs(config.type);

  const newConfig: SavedConfig = {
    ...config,
    timestamp: Date.now(),
    label: `${config.type} - ${config.query.join(", ").substring(0, 30)}${config.query.join(", ").length > 30 ? "..." : ""} - ${new Date().toLocaleString()}`,
  };

  // Add to beginning and keep only last 3
  const updatedConfigs = [
    newConfig,
    ...savedConfigs.filter((c) => c.timestamp !== newConfig.timestamp),
  ].slice(0, 3);

  localStorage.setItem(key, JSON.stringify(updatedConfigs));
};

const getSavedConfigs = (type: ScraperType): SavedConfig[] => {
  const key = `scraperConfigs_${type}`;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const loadConfigFromLocalStorage = (config: SavedConfig): ScraperConfig => {
  const { timestamp, label, ...scraperConfig } = config;
  return scraperConfig;
};

export function ScraperControl() {
  const [config, setConfig] = useState<ScraperConfig>({
    // Basic config
    limitPerQuery: 380,
    query: [],
    type: "hashtag",

    // First pass filters
    minFollowers: 1000,

    // Second pass filters
    removeNonEnglish: true,

    // Aggregation pass
    minVideoViews: 10000,
    minAvgViews: 15000,
    minNoOfVideosInWindow: 3,

    // Direct to apify
    videoLimitPerProfile: 5,
    includePinnedVideos: false,
    timeWindowInDays: 14,
  });
  const [queryInput, setQueryInput] = useState("");
  const [status, setStatus] = useState<ScraperStatus>({
    running: false,
    logs: [],
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadStatus();

    // Subscribe to WebSocket updates
    const unsubscribe = api.onWebSocketMessage((message: WebSocketMessage) => {
      if (message.type === "status") {
        setStatus(message.data);
      } else if (message.type === "log") {
        setLogs((prev) => [...prev, message.data]);
      } else if (message.type === "progress") {
        setStatus((prev) => ({
          ...prev,
          progress: message.data.progress,
          currentStep: message.data.step,
        }));
      }
    });

    return unsubscribe;
  }, [logs]);

  // Load saved configs when scraper type changes
  useEffect(() => {
    setSavedConfigs(getSavedConfigs(config.type));
    // Clear queryInput when switching to explore type
    if (config.type === "explore") {
      setQueryInput("");
    }
  }, [config.type]);

  const loadStatus = async () => {
    try {
      const currentStatus = await api.getScraperStatus();
      setStatus(currentStatus);
      // only update where is actually a new log
      if (currentStatus.logs.length > logs.length) {
        setLogs(currentStatus.logs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    }
  };

  const handleQueryInputChange = (value: string) => {
    setQueryInput(value);

    // Parse query input
    let queries: string[] = [];

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        queries = parsed;
      }
    } catch {
      // Not JSON, try comma-separated or single string
      if (value.includes(",")) {
        queries = value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (value.trim()) {
        queries = [value.trim()];
      }
    }

    setConfig((prev) => ({ ...prev, query: queries }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          setQueryInput(JSON.stringify(parsed, null, 2));
          setConfig((prev) => ({ ...prev, query: parsed }));
        } else {
          setError("JSON file must contain an array of strings");
        }
      } catch (err) {
        setError("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  };

  const startScraper = async () => {
    try {
      setError(null);
      await api.startScraper(config);

      // Save config to localStorage
      saveConfigToLocalStorage(config);
      setSavedConfigs(getSavedConfigs(config.type));

      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scraper");
    }
  };

  const restoreConfig = (savedConfig: SavedConfig) => {
    const restoredConfig = loadConfigFromLocalStorage(savedConfig);
    setConfig(restoredConfig);
    // Only set queryInput for non-explore types
    if (restoredConfig.type !== "explore") {
      setQueryInput(
        restoredConfig.query.length > 0
          ? JSON.stringify(restoredConfig.query, null, 2)
          : "",
      );
    } else {
      setQueryInput("");
    }
  };

  const stopScraper = async () => {
    try {
      setError(null);
      await api.stopScraper();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop scraper");
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logContent = logs.join("\n");
    const dataUri =
      "data:text/plain;charset=utf-8," + encodeURIComponent(logContent);
    const exportFileDefaultName = `scraper_logs_${Date.now()}.txt`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Scraper Type Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  type="button"
                  variant={config.type === "hashtag" ? "default" : "outline"}
                  className={`h-auto p-3 flex-col ${config.type === "hashtag" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50 hover:border-blue-200"}`}
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, type: "hashtag", query: [] }))
                  }
                >
                  <div className="text-lg font-semibold mb-1">Hashtag</div>
                  <div className="text-xs opacity-70">Search by hashtags</div>
                </Button>
                <Button
                  type="button"
                  variant={config.type === "discover" ? "default" : "outline"}
                  className={`h-auto p-3 flex-col ${config.type === "discover" ? "bg-cyan-500 hover:bg-cyan-600 text-white" : "hover:bg-cyan-50 hover:border-cyan-200"}`}
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, type: "discover", query: [] }))
                  }
                >
                  <div className="text-lg font-semibold mb-1">Discover</div>
                  <div className="text-xs opacity-70">Browse discover feed</div>
                </Button>
                <Button
                  type="button"
                  variant={config.type === "explore" ? "default" : "outline"}
                  className={`h-auto p-3 flex-col ${config.type === "explore" ? "bg-purple-600 hover:bg-purple-700 text-white" : "hover:bg-purple-50 hover:border-purple-200"}`}
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, type: "explore", query: [] }))
                  }
                >
                  <div className="text-lg font-semibold mb-1">Explore</div>
                  <div className="text-xs opacity-70">Browse explore topics</div>
                </Button>
              </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      <Card>
        <CardContent className="pt-4">
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startScraper();
            }}
            className="space-y-10"
          >
            {/* Query Input */}
            <div>
              {config.type === "explore" ? (
                // Multi-select for explore topics
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Explore Topics
                    <span className="text-xs text-slate-500 ml-2">
                      (Select one or more topics)
                    </span>
                  </label>
                  <div className="border border-slate-300 rounded-lg p-3 min-h-[100px] max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {validExploreValues.map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={config.query.includes(value) ? "default" : "outline"}
                          size="sm"
                          className="justify-start h-auto p-2 text-xs"
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              query: prev.query.includes(value)
                                ? prev.query.filter((q) => q !== value)
                                : [...prev.query, value],
                            }));
                          }}
                        >
                          {exploreValueLabels[value]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {config.query.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-500 mb-1">
                        Selected topics ({config.query.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {config.query.map((q) => (
                          <Badge key={q} variant="secondary" className="text-xs">
                            {exploreValueLabels[q]}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                              onClick={() => {
                                setConfig((prev) => ({
                                  ...prev,
                                  query: prev.query.filter((query) => query !== q),
                                }));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                        showFilters 
                          ? "text-amber-700 bg-amber-100 border border-amber-200" 
                          : "text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                      }`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      Filters
                    </button>
                  </div>
                </>
              ) : (
                // Textarea for hashtag and discover
                <>
                  <label className="block text-base font-medium text-slate-700 mb-2">
                    {config.type === "hashtag" ? "Input Your Hashtags" : "Input Your Keywords"}
                  </label>
                  <textarea
                    className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-xs placeholder:text-xs"
                    placeholder={`Examples:\n\n${config.type === "hashtag" ? "music, dance, comedy" : "viral, trending, popular"}\n\n["${config.type === "hashtag" ? "music" : "viral"}", "${config.type === "hashtag" ? "dance" : "trending"}", "${config.type === "hashtag" ? "comedy" : "popular"}"]\n\nOr upload a JSON file below`}
                    value={queryInput}
                    onChange={(e) => handleQueryInputChange(e.target.value)}
                    rows={8}
                    required
                  />

                  <div className="mt-2 flex gap-2">
                    <input
                      ref={(input) => {
                        if (input) {
                          input.onclick = () => (input.value = "");
                        }
                      }}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="json-file-upload"
                    />
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 transition-colors"
                      onClick={() =>
                        document.getElementById("json-file-upload")?.click()
                      }
                    >
                      <Upload className="mr-1 h-3 w-3 inline" />
                      Upload JSON
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                        showFilters 
                          ? "text-amber-700 bg-amber-100 border border-amber-200" 
                          : "text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                      }`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      Filters
                    </button>
                  </div>

                  {config.query.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-500 mb-1">
                        {config.type === "hashtag" ? "Hashtags:" : "Keywords:"}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {config.query.map((q, index) => (
                          <Badge key={index} variant="secondary">
                            {q}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>


            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2 mt-12">
              <Button
                type="submit"
                disabled={status.running}
                className={`flex-1 h-12 text-base font-semibold ${config.query.length === 0 ? "bg-slate-300 hover:bg-slate-400 text-slate-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
              >
                {status.running ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {config.query.length === 0 ? (config.type === "hashtag" ? "Add Hashtags" : config.type === "discover" ? "Add Keywords" : "Add Inputs To Run Scraper") : "Start Scraper"}
                  </>
                )}
              </Button>

              {status.running && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={stopScraper}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Set minimum thresholds for creator selection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Min Followers
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  min="0"
                  value={config.minFollowers}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minFollowers: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Min Video Views
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  min="0"
                  value={config.minVideoViews}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minVideoViews: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Min Avg Views
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  min="0"
                  value={config.minAvgViews}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minAvgViews: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Status</CardTitle>
              <CardDescription>Real-time scraper progress</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.running ? "default" : "secondary"}>
                {status.running ? "Running" : "Idle"}
              </Badge>
              {status.progress !== undefined && (
                <span className="text-sm font-medium text-slate-900">
                  {status.progress}%
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status.currentStep && (
            <p className="text-sm text-slate-600 mb-4">{status.currentStep}</p>
          )}

          {status.progress !== undefined && (
            <Progress value={status.progress} className="mb-4" />
          )}

          {/* Collapsible Terminal */}
          <Collapsible open={terminalOpen} onOpenChange={setTerminalOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full mb-4">
                <div className="flex items-center justify-between w-full">
                  <span>Terminal Output</span>
                  <div className="flex items-center gap-2">
                    {logs.length > 0 && (
                      <Badge variant="secondary">{logs.length} lines</Badge>
                    )}
                    {terminalOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogs}
                    disabled={logs.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto border border-slate-300">
                {logs.length === 0 ? (
                  <div className="text-slate-400 text-center pt-8">
                    No logs yet. Start the scraper to see real-time output.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-slate-500">
                        [{new Date().toLocaleTimeString()}]
                      </span>{" "}
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}

