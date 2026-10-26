import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: React.ReactNode;
  onNewChat: () => void;
  onSelectHistoryItem: (query: string) => void;
  onResetChat: () => void;
  activeHistoryId?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onNewChat,
  onSelectHistoryItem,
  onResetChat,
  activeHistoryId,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas font-sans text-content-primary antialiased flex flex-col">
      {/* Sidebar (Desktop 256px, Mobile slide-over) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          setSidebarOpen(false);
          onNewChat();
        }}
        onSelectHistoryItem={(query) => {
          setSidebarOpen(false);
          onSelectHistoryItem(query);
        }}
        activeHistoryId={activeHistoryId}
      />

      {/* Main viewport */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onResetChat={onResetChat}
        />

        <main className="w-full pt-14 flex-1 flex flex-col relative">
          {children}
        </main>
      </div>
    </div>
  );
};
