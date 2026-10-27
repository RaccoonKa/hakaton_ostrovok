import React from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { MainLayout } from "./components/layout/MainLayout";
import { ChatView } from "./components/ChatView";

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MainLayout>
        <ChatView />
      </MainLayout>
    </ErrorBoundary>
  );
};
