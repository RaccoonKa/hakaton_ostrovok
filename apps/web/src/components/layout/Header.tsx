import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PanelLeft, Share2, RefreshCw, Moon, Sun, Check } from "lucide-react";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";

interface HeaderProps {
  onResetChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetChat }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { isDark, toggleTheme } = useTheme();

  const [isCopied, setIsCopied] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShare = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
    } catch {
      // Fallback
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setIsCopied(true);
    toastTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-[#581c87] dark:bg-[#340c54] text-white shadow-xs z-30 flex items-center justify-between px-4 sm:px-6 select-none transition-all duration-300 ease-in-out border-b border-transparent dark:border-white/10 ${
        isSidebarOpen ? "left-0 md:left-64" : "left-0"
      }`}
    >
      {/* Left: Sidebar toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-sidebar-toggle="true"
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

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
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
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isCopied
              ? "bg-white/20 text-emerald-300 shadow-xs"
              : "text-white/90 hover:bg-white/15 hover:text-white"
          }`}
          title={isCopied ? "Ссылка скопирована!" : "Поделиться маршрутом"}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Theme Toggle Button: Moon for dark theme, Sun when dark is active */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
          title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-white/90 transition-transform duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-white/90 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Floating Copied Toast Notification */}
      {isCopied &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            onClick={() => setIsCopied(false)}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface dark:bg-[#1c182c] text-content-primary dark:text-white border border-surface-border dark:border-[#383152] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.35)] backdrop-blur-md cursor-pointer select-none animate-toast"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs sm:text-sm font-medium pr-1">
              Ссылка на маршрут скопирована
            </span>
          </div>,
          document.body
        )}
    </header>
  );
};
