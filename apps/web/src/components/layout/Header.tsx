import React from "react";
import { PanelLeft, Share2, RefreshCw } from "lucide-react";
import { useSidebar } from "../../context/SidebarContext";

interface HeaderProps {
  onResetChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetChat }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "О!дин запрос — AI-планировщик путешествий",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Ссылка на диалог скопирована в буфер обмена!");
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-[#a758cc] text-white shadow-xs z-30 flex items-center justify-between px-4 sm:px-6 select-none transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "left-0 md:left-64" : "left-0"
      }`}
    >
      {/* Left: Sidebar toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors"
          title={isSidebarOpen ? "Скрыть боковую панель (⌘\\)" : "Показать боковую панель (⌘\\)"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold tracking-tight text-white">
            О!дин запрос
          </span>
          <span className="text-xs text-white/60 hidden sm:inline">•</span>
          <span className="text-xs text-white/85 font-medium hidden sm:inline">
            Ассистент путешествий
          </span>
        </div>
      </div>

      {/* Right: Online Status badge & actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white border border-white/20 backdrop-blur-xs shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span>Онлайн</span>
        </div>

        {onResetChat && (
          <button
            type="button"
            onClick={onResetChat}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors"
            title="Очистить диалог"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors"
          title="Поделиться маршрутом"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
