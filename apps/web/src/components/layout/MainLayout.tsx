import React from "react";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import { PreferencesProvider } from "../../context/PreferencesContext";
import { SettingsModal } from "../settings/SettingsModal";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutContentProps {
  children: React.ReactNode;
  onNewChat: () => void;
  onSelectHistoryItem: (query: string) => void;
  onResetChat: () => void;
  activeHistoryId?: string;
}

const MainLayoutContent: React.FC<MainLayoutContentProps> = ({
  children,
  onNewChat,
  onSelectHistoryItem,
  onResetChat,
  activeHistoryId,
}) => {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-canvas font-sans text-content-primary antialiased flex flex-col">
      {/* Sidebar with animated width / transform */}
      <Sidebar
        onNewChat={onNewChat}
        onSelectHistoryItem={onSelectHistoryItem}
        activeHistoryId={activeHistoryId}
      />

      {/* Main viewport with smooth left padding transition */}
      <div
        className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:pl-64" : "pl-0"
        }`}
      >
        <Header onResetChat={onResetChat} />

        <main className="w-full pt-14 flex-1 flex flex-col relative">
          {children}
        </main>
      </div>

      {/* Global travel settings & preferences modal */}
      <SettingsModal />
    </div>
  );
};

export const MainLayout: React.FC<MainLayoutContentProps> = (props) => {
  return (
    <PreferencesProvider>
      <SidebarProvider>
        <MainLayoutContent {...props} />
      </SidebarProvider>
    </PreferencesProvider>
  );
};
