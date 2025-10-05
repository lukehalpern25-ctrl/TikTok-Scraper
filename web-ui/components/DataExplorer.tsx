import React, { useState, useEffect } from "react";
import { api, RunData } from "../utils/api";
import { PipelineVisualizer } from "./PipelineVisualizer";
import { ProfileCard } from "./ProfileCard";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Download, FileText, Eye } from "lucide-react";

interface StepData {
  name: string;
  file: string;
  data?: any[];
  count: number;
}

type ScraperType = "hashtag" | "discover" | "explore" | "all";

export function DataExplorer() {
  const [runs, setRuns] = useState<RunData[]>([]);
  const [selectedScraperType, setSelectedScraperType] = useState<ScraperType>("all");
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [runData, setRunData] = useState<any>(null);
  const [stepData, setStepData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("fans");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFullQuery, setShowFullQuery] = useState(false);

  const steps: StepData[] = [
    { name: "Raw Extraction", file: "01_extracted_profiles", count: 0 },
    { name: "Deduplication", file: "02_deduped_profiles", count: 0 },
    { name: "Quality Filter Pass 1", file: "03_quality_filtered_pass1", count: 0 },
    { name: "Profile Expansion", file: "04_expanded_profiles", count: 0 },
    { name: "Final Deduplication", file: "05_final_deduped_profiles", count: 0 },
    { name: "Quality Filter Pass 2", file: "06_quality_filtered_pass2", count: 0 },
    { name: "Final Processing", file: "07_final_processed", count: 0 },
  ];

  useEffect(() => {
    loadRuns();
  }, []);

  // Check for pre-selected run from navigation
  useEffect(() => {
    const preSelectedRun = window.sessionStorage.getItem("selectedRunTimestamp");
    if (preSelectedRun && runs.length > 0) {
      const runExists = runs.find(run => run.timestamp === preSelectedRun);
      if (runExists) {
        setSelectedRun(preSelectedRun);
        window.sessionStorage.removeItem("selectedRunTimestamp");
      }
    }
  }, [runs]);

  useEffect(() => {
    if (selectedRun) {
      loadRunData(selectedRun);
    }
  }, [selectedRun]);

  useEffect(() => {
    if (selectedRun && selectedStep) {
      loadStepData(selectedRun, selectedStep);
    }
  }, [selectedRun, selectedStep]);

  const loadRuns = async () => {
    try {
      const runsData = await api.getRuns();
      setRuns(runsData);
      // Reset run selection when runs are loaded
      setSelectedRun(null);
      setSelectedStep(null);
      setStepData([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    }
  };

  const getFilteredRuns = () => {
    if (selectedScraperType === "all") {
      return runs;
    }
    return runs.filter(run => run.metadata?.options?.type === selectedScraperType);
  };

  const handleScraperTypeChange = (type: ScraperType) => {
    setSelectedScraperType(type);
    setSelectedRun(null);
    setSelectedStep(null);
    setStepData([]);
    setRunData(null);
    setShowFullQuery(false);
  };

  const loadRunData = async (timestamp: string) => {
    try {
      setLoading(true);
      const data = await api.getRunData(timestamp);
      setRunData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run data");
    } finally {
      setLoading(false);
    }
  };

  const loadStepData = async (timestamp: string, step: string) => {
    try {
      setLoading(true);
      const data = await api.getStepData(timestamp, step);
      setStepData(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load step data");
    } finally {
      setLoading(false);
    }
  };

  const handleRunChange = (timestamp: string) => {
    setSelectedRun(timestamp);
    setSelectedStep(null);
    setStepData([]);
    setShowFullQuery(false);
  };

  const handleStepSelect = (stepFile: string) => {
    setSelectedStep(stepFile);
  };

  const exportData = () => {
    if (!stepData.length) return;
    
    const dataStr = JSON.stringify(stepData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${selectedRun}_${selectedStep}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportCSV = () => {
    if (!stepData.length) return;
    
    const headers = ['Name', 'Username', 'Followers', 'Videos', 'Verified', 'Bio Link', 'Signature'];
    const csvContent = [
      headers.join(','),
      ...stepData.map(item => [
        item.authorMeta?.nickName || '',
        item.authorMeta?.name || '',
        item.authorMeta?.fans || 0,
        item.authorMeta?.video || 0,
        item.authorMeta?.verified || false,
        item.authorMeta?.bioLink || '',
        `"${(item.authorMeta?.signature || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = `${selectedRun}_${selectedStep}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredAndSortedData = stepData
    .filter(item => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (item.authorMeta?.name || '').toLowerCase().includes(searchLower) ||
        (item.authorMeta?.nickName || '').toLowerCase().includes(searchLower) ||
        (item.authorMeta?.signature || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'fans':
          aVal = parseInt(a.authorMeta?.fans) || 0;
          bVal = parseInt(b.authorMeta?.fans) || 0;
          break;
        case 'video':
          aVal = parseInt(a.authorMeta?.video) || 0;
          bVal = parseInt(b.authorMeta?.video) || 0;
          break;
        case 'name':
          aVal = a.authorMeta?.name || '';
          bVal = b.authorMeta?.name || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Run Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Explorer</h2>
          <p className="text-gray-600">
            Explore scraped data through each pipeline stage
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Scraper Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scraper Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                type="button"
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedScraperType === "all"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
                onClick={() => handleScraperTypeChange("all")}
              >
                <div className="text-lg font-semibold mb-1">🔍 All</div>
                <div className="text-xs">Show all runs</div>
              </button>
              <button
                type="button"
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedScraperType === "hashtag"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
                onClick={() => handleScraperTypeChange("hashtag")}
              >
                <div className="text-lg font-semibold mb-1">#️⃣ Hashtag</div>
                <div className="text-xs">Hashtag runs</div>
              </button>
              <button
                type="button"
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedScraperType === "discover"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
                onClick={() => handleScraperTypeChange("discover")}
              >
                <div className="text-lg font-semibold mb-1">🔍 Discover</div>
                <div className="text-xs">Discover runs</div>
              </button>
              <button
                type="button"
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedScraperType === "explore"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
                onClick={() => handleScraperTypeChange("explore")}
              >
                <div className="text-lg font-semibold mb-1">🧭 Explore</div>
                <div className="text-xs">Explore runs</div>
              </button>
            </div>
          </div>

          {/* Run Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Scraper Run ({getFilteredRuns().length} available)
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedRun || ''}
              onChange={(e) => handleRunChange(e.target.value)}
              disabled={getFilteredRuns().length === 0}
            >
              <option value="">Choose a run...</option>
              {getFilteredRuns().map(run => {
                const scraperType = run.metadata?.options?.type || 'hashtag';
                const query = run.metadata?.options?.query?.join(', ') || 
                             run.metadata?.config?.hashtags?.join(', ') || 
                             'Unknown query';
                const typeIcon = scraperType === 'discover' ? '🔍' : scraperType === 'explore' ? '🧭' : '#️⃣';
                
                return (
                  <option key={run.timestamp} value={run.timestamp}>
                    {typeIcon} {formatTimestamp(run.timestamp)} - {query}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedRun && runData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="font-medium text-gray-900">
                    {runData.metadata?.options?.type === 'discover' 
                      ? '🔍 Discover' 
                      : runData.metadata?.options?.type === 'explore'
                        ? '🧭 Explore'
                        : '#️⃣ Hashtag'}
                  </div>
                </div>
                <div className="relative">
                  <div className="text-sm text-gray-600">Query</div>
                  <div className="font-medium text-gray-900">
                    {(() => {
                      const fullQuery = runData.metadata?.options?.query?.join(', ') || 
                                       runData.metadata?.config?.hashtags?.join(', ') || 
                                       'Unknown';
                      const maxLength = 50;
                      
                      if (fullQuery.length <= maxLength) {
                        return fullQuery;
                      }
                      
                      return (
                        <div className="relative group">
                          <button
                            type="button"
                            className="text-left hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1"
                            onClick={() => setShowFullQuery(!showFullQuery)}
                          >
                            <span>
                              {showFullQuery ? fullQuery : `${fullQuery.substring(0, maxLength)}...`}
                            </span>
                            <Eye className="h-3 w-3 text-gray-400" />
                          </button>
                          
                          {/* Tooltip */}
                          {!showFullQuery && (
                            <div className="absolute bottom-full left-0 mb-2 w-max max-w-xs bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              <div className="break-words">{fullQuery}</div>
                              <div className="text-gray-300 mt-1">Click to {showFullQuery ? 'hide' : 'show'} full query</div>
                              <div className="absolute top-full left-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Limit per Query</div>
                  <div className="font-medium text-gray-900">
                    {runData.metadata?.options?.limitPerQuery || 
                     runData.metadata?.config?.resultsPerPage || 
                     'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Raw Items</div>
                  <div className="font-medium text-gray-900">{runData.metadata?.rawResult?.count || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Final Results</div>
                  <div className="font-medium text-gray-900">{runData.processed?.length || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="font-medium text-gray-900">
                    {runData.metadata?.rawResult?.count > 0 
                      ? `${((runData.processed?.length || 0) / runData.metadata.rawResult.count * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                </div>
              </div>
              
              {/* Additional Options Display */}
              {runData.metadata?.options && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="text-sm text-gray-600 mb-2">Quality Filters</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Min Followers:</span>
                      <span className="ml-1 font-medium">{runData.metadata.options.minFollowers?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Video Views:</span>
                      <span className="ml-1 font-medium">{runData.metadata.options.minVideoViews?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Avg Views:</span>
                      <span className="ml-1 font-medium">{runData.metadata.options.minAvgViews?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Non-English Removed:</span>
                      <span className="ml-1 font-medium">{runData.metadata.options.removeNonEnglish ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedRun && (
        <>
          {/* Pipeline Visualizer */}
          <PipelineVisualizer 
            runTimestamp={selectedRun}
            selectedStep={selectedStep}
            onStepSelect={handleStepSelect}
          />

          {/* Data Viewer */}
          {selectedStep && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {steps.find(s => s.file === selectedStep)?.name || selectedStep}
                    </h3>
                    <p className="text-gray-600">
                      {filteredAndSortedData.length} items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={exportCSV}
                      disabled={stepData.length === 0}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={exportData}
                      disabled={stepData.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search by name, username, or bio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="fans">Followers</option>
                      <option value="video">Video Count</option>
                      <option value="name">Username</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading data...</span>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800">Error: {error}</div>
                  </div>
                ) : filteredAndSortedData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No data found for this step.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedData.slice(0, 50).map((item, index) => (
                      <ProfileCard key={index} profile={item} />
                    ))}
                  </div>
                )}
              </div>

              {filteredAndSortedData.length > 50 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">
                    Showing first 50 of {filteredAndSortedData.length} results. Use export to get all data.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}