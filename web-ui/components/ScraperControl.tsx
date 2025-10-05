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
    limitPerQuery: 50,
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
    videoLimitPerProfile: 10,
    includePinnedVideos: false,
    timeWindowInDays: 30,
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
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scraper Configuration</CardTitle>
              <CardDescription>
                Configure and run TikTok hashtag or discover scraper
              </CardDescription>
            </div>

            {/* Restore Config Section - Top Right */}
            {savedConfigs.length > 0 && (
              <div className="ml-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <RotateCcw className="inline h-4 w-4 mr-1" />
                  Restore Previous Configuration
                </label>
                <Select
                  onValueChange={(value) => {
                    const selectedConfig = savedConfigs.find(
                      (c) => c.timestamp.toString() === value,
                    );
                    if (selectedConfig) restoreConfig(selectedConfig);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a previous configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedConfigs.map((savedConfig) => (
                      <SelectItem
                        key={savedConfig.timestamp}
                        value={savedConfig.timestamp.toString()}
                      >
                        {savedConfig.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startScraper();
            }}
            className="space-y-6"
          >
            {/* Scraper Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Scraper Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  type="button"
                  variant={config.type === "hashtag" ? "default" : "outline"}
                  className="h-auto p-4 flex-col"
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
                  className="h-auto p-4 flex-col"
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
                  className="h-auto p-4 flex-col"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, type: "explore", query: [] }))
                  }
                >
                  <div className="text-lg font-semibold mb-1">Explore</div>
                  <div className="text-xs opacity-70">Browse explore topics</div>
                </Button>
              </div>
            </div>

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
                </>
              ) : (
                // Textarea for hashtag and discover
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Search Queries
                    <span className="text-xs text-slate-500 ml-2">
                      ({config.type === "hashtag" ? "hashtags" : "search terms"},
                      comma-separated, or JSON array)
                    </span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder={`Examples:\n${config.type === "hashtag" ? "music, dance, comedy" : "viral, trending, popular"}\n\n["${config.type === "hashtag" ? "music" : "viral"}", "${config.type === "hashtag" ? "dance" : "trending"}", "${config.type === "hashtag" ? "comedy" : "popular"}"]\n\nOr upload a JSON file below`}
                    value={queryInput}
                    onChange={(e) => handleQueryInputChange(e.target.value)}
                    rows={4}
                    required
                  />

                  <div className="mt-2">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("json-file-upload")?.click()
                      }
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload JSON File
                    </Button>
                  </div>

                  {config.query.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-500 mb-1">
                        Parsed queries:
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

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Results per Query (1-500)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  min="1"
                  max="500"
                  value={config.limitPerQuery}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      limitPerQuery: parseInt(e.target.value) || 50,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Time Window (days)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  min="1"
                  value={config.timeWindowInDays}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      timeWindowInDays: parseInt(e.target.value) || 30,
                    }))
                  }
                  required
                />
              </div>
            </div>

            {/* First Pass Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-slate-800 mb-3">
                First Pass Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Followers
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Videos per Profile
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    min="1"
                    value={config.videoLimitPerProfile}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        videoLimitPerProfile: parseInt(e.target.value) || 10,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Second Pass Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-slate-800 mb-3">
                Second Pass Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Remove Non-English
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    value={config.removeNonEnglish.toString()}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        removeNonEnglish: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Include Pinned Videos
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    value={config.includePinnedVideos.toString()}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        includePinnedVideos: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aggregation Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-slate-800 mb-3">
                Aggregation Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Video Views
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Avg Views
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Videos in Window
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    min="1"
                    value={config.minNoOfVideosInWindow}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        minNoOfVideosInWindow: parseInt(e.target.value) || 1,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={status.running || config.query.length === 0}
                className="flex-1"
              >
                {status.running ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Scraper
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

