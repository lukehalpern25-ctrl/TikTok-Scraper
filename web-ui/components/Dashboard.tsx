import React, { useState, useEffect } from "react";
import { api, RunData } from "../utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";

interface DashboardProps {
  onNavigateToExplorer?: (runTimestamp: string) => void;
}

export function Dashboard({ onNavigateToExplorer }: DashboardProps = {}) {
  const [runs, setRuns] = useState<RunData[]>([]);
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const [runsData, statsData] = await Promise.all([
        api.getRuns(),
        api.getPipelineStats()
      ]);
      setRuns(runsData);
      setPipelineStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toUTCString();
  };

  const getTotalCreators = () => {
    return runs.reduce((total, run) => total + (run.processed?.length || 0), 0);
  };

  const getAverageCreatorsPerRun = () => {
    if (runs.length === 0) return 0;
    return Math.round(getTotalCreators() / runs.length);
  };

  const getRunsByType = (type: string) => {
    return runs.filter((run) => run.metadata?.options?.type === type);
  };

  const getStatsForType = (type: string) => {
    const typeRuns = getRunsByType(type);
    const totalCreators = typeRuns.reduce(
      (total, run) => total + (run.processed?.length || 0),
      0,
    );
    return {
      runs: typeRuns.length,
      creators: totalCreators,
      avgPerRun:
        typeRuns.length > 0 ? Math.round(totalCreators / typeRuns.length) : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        <span className="ml-2 text-slate-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
              <Button variant="outline" onClick={loadRuns}>
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {runs.length}
            </div>
            <div className="text-sm text-slate-600">Total Runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {getTotalCreators()}
            </div>
            <div className="text-sm text-slate-600">Total Creators Found</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {getAverageCreatorsPerRun()}
            </div>
            <div className="text-sm text-slate-600">Avg per Run</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-slate-900 mb-2">
              {runs.length > 0
                ? formatTimestamp(runs[0].timestamp)
                : "N/A"}
            </div>
            <div className="text-sm text-slate-600">Latest Run</div>
          </CardContent>
        </Card>
      </div>

      {/* Scraper Type Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hashtag Scraper</CardTitle>
            <CardDescription>
              Statistics for hashtag-based scraping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {getStatsForType("hashtag").runs}
                </div>
                <div className="text-xs text-slate-500">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {getStatsForType("hashtag").creators}
                </div>
                <div className="text-xs text-slate-500">Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {getStatsForType("hashtag").avgPerRun}
                </div>
                <div className="text-xs text-slate-500">Avg/Run</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discover Scraper</CardTitle>
            <CardDescription>
              Statistics for discover feed scraping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {getStatsForType("discover").runs}
                </div>
                <div className="text-xs text-slate-500">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {getStatsForType("discover").creators}
                </div>
                <div className="text-xs text-slate-500">Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {getStatsForType("discover").avgPerRun}
                </div>
                <div className="text-xs text-slate-500">Avg/Run</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explore Scraper</CardTitle>
            <CardDescription>
              Statistics for explore topics scraping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {getStatsForType("explore").runs}
                </div>
                <div className="text-xs text-slate-500">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {getStatsForType("explore").creators}
                </div>
                <div className="text-xs text-slate-500">Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {getStatsForType("explore").avgPerRun}
                </div>
                <div className="text-xs text-slate-500">Avg/Run</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraper Runs</CardTitle>
          <CardDescription>
            Overview of all scraper executions and their results
          </CardDescription>
        </CardHeader>

        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No scraper runs found.</p>
              <p className="text-sm text-slate-400 mt-2">
                Start your first scraper run to see data here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Run Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Limit Per Query
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Raw Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Final Results
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Results After DeDupe (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {runs.map((run) => {
                    const rawCount = run.metadata?.rawResult?.count || 0;
                    const finalCount = run.processed?.length || 0;
                    const successRate =
                      rawCount > 0
                        ? ((finalCount / rawCount) * 100).toFixed(1)
                        : "0";

                    return (
                      <tr 
                        key={run.timestamp}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => onNavigateToExplorer && onNavigateToExplorer(run.timestamp)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-slate-900">
                              {formatTimestamp(run.timestamp)}
                            </div>
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              run.metadata?.options?.type === "discover" 
                                ? "secondary" 
                                : run.metadata?.options?.type === "explore"
                                  ? "outline"
                                  : "default"
                            }
                          >
                            {run.metadata?.options?.type === "discover"
                              ? "Discover"
                              : run.metadata?.options?.type === "explore"
                                ? "Explore"
                                : "Hashtag"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {run.metadata?.options?.query?.join(", ") ||
                              "Unknown"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {run.metadata?.options?.limitPerQuery || "N/A"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900">
                            {rawCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">
                            {finalCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              parseFloat(successRate) > 10
                                ? "default"
                                : parseFloat(successRate) > 5
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {successRate}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={loadRuns}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Performance</CardTitle>
            <CardDescription>
              Average data retention through pipeline stages
            </CardDescription>
          </CardHeader>

          <CardContent>
            {pipelineStats ? (
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Extract creator profiles from Apify</span>
                  <span className="font-medium text-slate-900">{pipelineStats.extracted}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Remove duplicate profiles by ID</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.deduped} ({pipelineStats.extracted > 0 ? ((pipelineStats.deduped / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Filter by minimum followers</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.qualityPass1} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass1 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Expand profiles with full data</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.expanded} ({pipelineStats.extracted > 0 ? ((pipelineStats.expanded / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Final deduplication by creator ID</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.finalDeduped} ({pipelineStats.extracted > 0 ? ((pipelineStats.finalDeduped / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Remove non-English creators</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.qualityPass2} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass2 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Filter by video count and view metrics</span>
                  <span className="font-medium text-slate-900">
                    {pipelineStats.qualityPass3} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass3 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Filter creators with bio and contact info</span>
                  <span className="font-medium text-green-600">
                    {pipelineStats.final} ({pipelineStats.extracted > 0 ? ((pipelineStats.final / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No pipeline data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Quality</CardTitle>
            <CardDescription>Insights about your scraped data</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">
                    Creators with Bio Links
                  </span>
                  <span className="font-medium text-slate-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => p.authorMeta?.bioLink).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">
                    Verified Accounts
                  </span>
                  <span className="font-medium text-slate-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => p.authorMeta?.verified).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">High Engagement (>10K followers)</span>
                  <span className="font-medium text-slate-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => (p.authorMeta?.fans || 0) > 10000).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-slate-600">Super High Engagement (>1M followers)</span>
                  <span className="font-medium text-slate-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => (p.authorMeta?.fans || 0) > 1000000).length;
                    }, 0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

