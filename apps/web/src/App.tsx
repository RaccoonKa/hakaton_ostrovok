import React, { useState } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { MainLayout } from "./components/layout/MainLayout";
import { ChatView } from "./components/ChatView";

export const App: React.FC = () => {
  const [chatKey, setChatKey] = useState(0);
  const [activeHistoryId, setActiveHistoryId] = useState("hist-1");

  const handleNewChat = () => {
    setActiveHistoryId("");
    setChatKey((prev) => prev + 1);
  };

  const handleSelectHistoryItem = (query: string) => {
    setActiveHistoryId("hist-1");
    // Trigger reset and re-mount with query if needed
    setChatKey((prev) => prev + 1);
  };

  const handleResetChat = () => {
    setChatKey((prev) => prev + 1);
  };

  return (
    <ErrorBoundary>
      <MainLayout
        onNewChat={handleNewChat}
        onSelectHistoryItem={handleSelectHistoryItem}
        onResetChat={handleResetChat}
        activeHistoryId={activeHistoryId}
      >
        <ChatView key={chatKey} />
      </MainLayout>
    </ErrorBoundary>
  );
};
