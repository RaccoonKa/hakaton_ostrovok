import React from "react";
import { ChatView } from "./components/ChatView";

export const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-canvas">
      <ChatView />
    </main>
  );
};
