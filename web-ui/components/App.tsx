import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Dashboard } from "./Dashboard";
import { DataExplorer } from "./DataExplorer";
import { ScraperControl } from "./ScraperControl";
import { api, WebSocketMessage } from "../utils/api";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Play, BarChart3, Search, Menu } from "lucide-react";

type Tab = "scraper" | "dashboard" | "explorer";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scraper");
  const [wsConnected, setWsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navigationItems = [
    { id: "scraper" as Tab, label: "Run Scraper", icon: Play },
    { id: "dashboard" as Tab, label: "Dashboard", icon: BarChart3 },
    { id: "explorer" as Tab, label: "Data Explorer", icon: Search },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">TikTok Scraper</h1>
            <p className="text-sm text-slate-600 mt-1">Content discovery platform</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    activeTab === item.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Badge variant={wsConnected ? "default" : "destructive"}>
                <span className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  wsConnected ? "bg-green-500" : "bg-red-500"
                )}></span>
                {wsConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-slate-900">TikTok Scraper</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === "scraper" && <ScraperControl />}
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "explorer" && <DataExplorer />}
          </div>
        </main>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);