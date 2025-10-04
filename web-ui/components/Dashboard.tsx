import React, { useState, useEffect } from "react";
import { api, RunData } from "../utils/api";

export function Dashboard() {
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

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleString();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
            <button
              className="ml-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              onClick={loadRuns}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {runs.length}
          </div>
          <div className="text-sm text-gray-600">Total Runs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {getTotalCreators()}
          </div>
          <div className="text-sm text-gray-600">Total Creators Found</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {getAverageCreatorsPerRun()}
          </div>
          <div className="text-sm text-gray-600">Avg per Run</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {runs.length > 0
              ? formatTimestamp(runs[0].timestamp).split(",")[0]
              : "N/A"}
          </div>
          <div className="text-sm text-gray-600">Latest Run</div>
        </div>
      </div>

      {/* Scraper Type Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              #️⃣ Hashtag Scraper
            </h3>
            <p className="text-gray-600">
              Statistics for hashtag-based scraping
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {getStatsForType("hashtag").runs}
                </div>
                <div className="text-xs text-gray-500">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {getStatsForType("hashtag").creators}
                </div>
                <div className="text-xs text-gray-500">Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {getStatsForType("hashtag").avgPerRun}
                </div>
                <div className="text-xs text-gray-500">Avg/Run</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔍 Discover Scraper
            </h3>
            <p className="text-gray-600">
              Statistics for discover feed scraping
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {getStatsForType("discover").runs}
                </div>
                <div className="text-xs text-gray-500">Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {getStatsForType("discover").creators}
                </div>
                <div className="text-xs text-gray-500">Creators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {getStatsForType("discover").avgPerRun}
                </div>
                <div className="text-xs text-gray-500">Avg/Run</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Recent Scraper Runs
          </h2>
          <p className="text-gray-600">
            Overview of all scraper executions and their results
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No scraper runs found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Start your first scraper run to see data here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Run Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limit Per Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raw Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Results After DeDupe (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => {
                  const rawCount = run.metadata?.rawResult?.count || 0;
                  const finalCount = run.processed?.length || 0;
                  const successRate =
                    rawCount > 0
                      ? ((finalCount / rawCount) * 100).toFixed(1)
                      : "0";

                  return (
                    <tr key={run.timestamp}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTimestamp(run.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            run.metadata?.options?.type === "discover"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {run.metadata?.options?.type === "discover"
                            ? "🔍 Discover"
                            : "#️⃣ Hashtag"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {run.metadata?.options?.query?.join(", ") ||
                            "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {run.metadata?.options?.limitPerQuery || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {rawCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          {finalCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            parseFloat(successRate) > 10
                              ? "bg-green-100 text-green-800"
                              : parseFloat(successRate) > 5
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {successRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 px-6 pb-6">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            onClick={loadRuns}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Pipeline Performance
            </h3>
            <p className="text-gray-600">
              Average data retention through pipeline stages
            </p>
          </div>

          <div className="p-6">
            {pipelineStats ? (
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Raw Extraction</span>
                  <span className="font-medium text-gray-900">{pipelineStats.extracted}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">After Deduplication</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.deduped} ({pipelineStats.extracted > 0 ? ((pipelineStats.deduped / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Quality Filter Pass 1</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.qualityPass1} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass1 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">After Profile Expansion</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.expanded} ({pipelineStats.extracted > 0 ? ((pipelineStats.expanded / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Final Video Deduped</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.finalDeduped} ({pipelineStats.extracted > 0 ? ((pipelineStats.finalDeduped / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Quality Pass 2</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.qualityPass2} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass2 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Quality Pass 3</span>
                  <span className="font-medium text-gray-900">
                    {pipelineStats.qualityPass3} ({pipelineStats.extracted > 0 ? ((pipelineStats.qualityPass3 / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Final Results</span>
                  <span className="font-medium text-green-600">
                    {pipelineStats.final} ({pipelineStats.extracted > 0 ? ((pipelineStats.final / pipelineStats.extracted) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No pipeline data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Data Quality
            </h3>
            <p className="text-gray-600">Insights about your scraped data</p>
          </div>

          <div className="p-6">
            {runs.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">
                    Creators with Bio Links
                  </span>
                  <span className="font-medium text-gray-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => p.authorMeta?.bioLink).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">
                    Verified Accounts
                  </span>
                  <span className="font-medium text-gray-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => p.authorMeta?.verified).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">High Engagement (>10K followers)</span>
                  <span className="font-medium text-gray-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => (p.authorMeta?.fans || 0) > 10000).length;
                    }, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-600">Super High Engagement (>1M followers)</span>
                  <span className="font-medium text-gray-900">
                    {runs.reduce((total, run) => {
                      if (!run.processed) return total;
                      return total + run.processed.filter((p) => (p.authorMeta?.fans || 0) > 1000000).length;
                    }, 0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

