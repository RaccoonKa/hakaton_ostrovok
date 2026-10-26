import React from "react";
import { PanelLeft, Share2, RefreshCw } from "lucide-react";
import { DemoBadge } from "../common/DemoBadge";

interface HeaderProps {
  onToggleSidebar: () => void;
  onResetChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onResetChat,
}) => {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "О!дин запрос — AI-планировщик путешествий",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Ссылка на текущий диалог скопирована в буфер обмена!");
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-14 bg-surface/85 backdrop-blur-md z-30 flex items-center justify-between px-4 sm:px-6 border-b border-surface-container-highest/60 select-none">
      {/* Left: Sidebar toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:bg-surface-container-high hover:text-content-primary transition-colors"
          title="Свернуть / развернуть сайдбар"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-content-primary">
            О!дин запрос v2.4
          </span>
          <span className="text-xs text-content-muted hidden sm:inline">•</span>
          <span className="text-xs text-content-muted hidden sm:inline">
            Ассистент путешествий
          </span>
        </div>
      </div>

      {/* Right: Demo mode badge & actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <DemoBadge variant="subtle" label="Демо-режим (симуляция)" />

        {onResetChat && (
          <button
            type="button"
            onClick={onResetChat}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:bg-surface-container-high hover:text-content-primary transition-colors"
            title="Очистить диалог"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:bg-surface-container-high hover:text-content-primary transition-colors"
          title="Поделиться диалогом"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
