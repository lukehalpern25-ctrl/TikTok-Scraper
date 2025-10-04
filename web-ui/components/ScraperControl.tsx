import React, { useState, useEffect } from "react";
import { api, ScraperStatus, WebSocketMessage } from "../utils/api";

type ScraperType = "discover" | "hashtag";

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
  const [status, setStatus] = useState<ScraperStatus>({ running: false, logs: [] });
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Subscribe to WebSocket updates
    const unsubscribe = api.onWebSocketMessage((message: WebSocketMessage) => {
      if (message.type === "status") {
        setStatus(message.data);
      } else if (message.type === "log") {
        setLogs(prev => [...prev, message.data]);
      } else if (message.type === "progress") {
        setStatus(prev => ({ ...prev, progress: message.data.progress, currentStep: message.data.step }));
      }
    });

    return unsubscribe;
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await api.getScraperStatus();
      setStatus(currentStatus);
      if (currentStatus.logs) {
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
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        queries = parsed;
      }
    } catch {
      // Not JSON, try comma-separated or single string
      if (value.includes(',')) {
        queries = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (value.trim()) {
        queries = [value.trim()];
      }
    }
    
    setConfig(prev => ({ ...prev, query: queries }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setQueryInput(JSON.stringify(parsed, null, 2));
          setConfig(prev => ({ ...prev, query: parsed }));
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
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scraper");
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
    const logContent = logs.join('\n');
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(logContent);
    const exportFileDefaultName = `scraper_logs_${Date.now()}.txt`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🚀 Scraper Configuration</h2>
          <p className="text-gray-600">
            Configure and run TikTok hashtag or discover scraper
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); startScraper(); }} className="space-y-6">
            {/* Scraper Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scraper Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    config.type === "hashtag"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                  onClick={() => setConfig(prev => ({ ...prev, type: "hashtag" }))}
                >
                  <div className="text-lg font-semibold mb-1">#️⃣ Hashtag</div>
                  <div className="text-xs">Search by hashtags</div>
                </button>
                <button
                  type="button"
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    config.type === "discover"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                  onClick={() => setConfig(prev => ({ ...prev, type: "discover" }))}
                >
                  <div className="text-lg font-semibold mb-1">🔍 Discover</div>
                  <div className="text-xs">Browse discover feed</div>
                </button>
              </div>
            </div>

            {/* Query Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Queries
                <span className="text-xs text-gray-500 ml-2">
                  ({config.type === "hashtag" ? "hashtags" : "search terms"}, comma-separated, or JSON array)
                </span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Examples:\n${config.type === "hashtag" ? "music, dance, comedy" : "viral, trending, popular"}\n\n["${config.type === "hashtag" ? "music" : "viral"}", "${config.type === "hashtag" ? "dance" : "trending"}", "${config.type === "hashtag" ? "comedy" : "popular"}"]\n\nOr upload a JSON file below`}
                value={queryInput}
                onChange={(e) => handleQueryInputChange(e.target.value)}
                rows={4}
                required
              />
            
              <div className="mt-2">
                <label className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                  📁 Upload JSON File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            
              {config.query.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500">Parsed queries:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {config.query.map((q, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Results per Query (1-500)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="500"
                  value={config.limitPerQuery}
                  onChange={(e) => setConfig(prev => ({ ...prev, limitPerQuery: parseInt(e.target.value) || 50 }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Window (days)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  value={config.timeWindowInDays}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeWindowInDays: parseInt(e.target.value) || 30 }))}
                  required
                />
              </div>
            </div>

            {/* First Pass Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">First Pass Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Followers</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    value={config.minFollowers}
                    onChange={(e) => setConfig(prev => ({ ...prev, minFollowers: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Videos per Profile</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    value={config.videoLimitPerProfile}
                    onChange={(e) => setConfig(prev => ({ ...prev, videoLimitPerProfile: parseInt(e.target.value) || 10 }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Second Pass Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Second Pass Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remove Non-English</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={config.removeNonEnglish.toString()}
                    onChange={(e) => setConfig(prev => ({ ...prev, removeNonEnglish: e.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Include Pinned Videos</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={config.includePinnedVideos.toString()}
                    onChange={(e) => setConfig(prev => ({ ...prev, includePinnedVideos: e.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aggregation Filters */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Aggregation Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Video Views</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    value={config.minVideoViews}
                    onChange={(e) => setConfig(prev => ({ ...prev, minVideoViews: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Avg Views</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    value={config.minAvgViews}
                    onChange={(e) => setConfig(prev => ({ ...prev, minAvgViews: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Videos in Window</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    value={config.minNoOfVideosInWindow}
                    onChange={(e) => setConfig(prev => ({ ...prev, minNoOfVideosInWindow: parseInt(e.target.value) || 1 }))}
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
              <button
                type="submit"
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  status.running || config.query.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                disabled={status.running || config.query.length === 0}
              >
                {status.running ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running...
                  </div>
                ) : (
                  "🚀 Start Scraper"
                )}
              </button>
              
              {status.running && (
                <button
                  type="button"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  onClick={stopScraper}
                >
                  ⏹️ Stop
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Status and Logs Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Execution Status</h3>
              <p className="text-gray-600">
                Real-time scraper progress and logs
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  logs.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                🗑️ Clear
              </button>
              <button 
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  logs.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                💾 Export
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  status.running ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                }`}>
                  {status.running ? "🔄 Running" : "⏸️ Idle"}
                </span>
                {status.currentStep && (
                  <span className="text-sm text-gray-600">
                    {status.currentStep}
                  </span>
                )}
              </div>
              {status.progress !== undefined && (
                <span className="text-sm font-medium text-gray-900">
                  {status.progress}%
                </span>
              )}
            </div>
          
            {status.progress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto border border-gray-300">
            {logs.length === 0 ? (
              <div className="text-gray-400 text-center pt-8">
                No logs yet. Start the scraper to see real-time output.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {" "}
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}