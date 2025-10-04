import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Dashboard } from "./Dashboard";
import { DataExplorer } from "./DataExplorer";
import { ScraperControl } from "./ScraperControl";
import { api, WebSocketMessage } from "../utils/api";

type Tab = "dashboard" | "explorer" | "scraper";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    api.connectWebSocket();
    
    const unsubscribe = api.onWebSocketMessage((message: WebSocketMessage) => {
      if (message.type === "connected") {
        setWsConnected(true);
      }
    });

    return () => {
      unsubscribe();
      api.disconnectWebSocket();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🎵 TikTok Scraper Dashboard</h1>
              <p className="text-gray-600">Hashtag & Discover scraping with advanced quality filtering</p>
            </div>
            <div className="flex items-center justify-between">
              <nav className="flex space-x-1">
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "dashboard" 
                      ? "bg-blue-100 text-blue-700 border border-blue-200" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  📊 Dashboard
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "explorer" 
                      ? "bg-blue-100 text-blue-700 border border-blue-200" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("explorer")}
                >
                  🔍 Data Explorer
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "scraper" 
                      ? "bg-blue-100 text-blue-700 border border-blue-200" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("scraper")}
                >
                  🚀 Run Scraper
                </button>
              </nav>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  wsConnected 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    wsConnected ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                  {wsConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "explorer" && <DataExplorer />}
        {activeTab === "scraper" && <ScraperControl />}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);