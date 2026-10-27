import React from "react";
import {
  Plus,
  Search,
  Settings,
  User,
  MessageSquare,
  Trash2,
  LogIn,
} from "lucide-react";
import { useSidebar } from "../../context/SidebarContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

interface SidebarProps {
  onNewChat?: () => void;
  onSelectHistoryItem?: (query: string) => void;
  activeHistoryId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
}) => {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { openSettingsModal } = usePreferences();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const {
    sessions,
    activeSessionId,
    selectSession,
    deleteSession,
    startNewChat,
  } = useChat();

  const handleStartNew = () => {
    startNewChat();
    if (onNewChat) onNewChat();
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop with smooth fade */}
      <div
        data-sidebar-backdrop="true"
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar aside — frosted glass surface elevated over the main screen */}
      <aside
        id="main-sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-white/75 dark:bg-[#151221]/90 backdrop-blur-2xl z-40 flex flex-col justify-between select-none shadow-[4px_0_30px_rgba(0,0,0,0.07)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden relative">
          {/* SINGLE continuous frosted purple gradient background */}
          <div
            className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(92, 30, 134, 0.96) 0%, rgba(92, 30, 134, 0.93) 30%, rgba(92, 30, 134, 0.70) 52%, rgba(92, 30, 134, 0.38) 70%, rgba(92, 30, 134, 0.15) 85%, rgba(92, 30, 134, 0.04) 94%, rgba(92, 30, 134, 0) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Top Brand Bar */}
          <div className="relative h-14 px-4 text-white flex items-center justify-between shrink-0 z-10">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                О!
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight leading-tight">
                  О!дин запрос
                </span>
                <span className="text-[11px] text-white/85 font-medium leading-tight">
                  travel AI-assistant
                </span>
              </div>
            </div>

            {/* Search button */}
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/85 hover:bg-white/15 hover:text-white transition-colors"
              title="Поиск по диалогам"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* New route button section */}
          <div className="px-3 pt-2.5 pb-1 relative z-10">
            <button
              type="button"
              onClick={handleStartNew}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white/95 dark:hover:bg-white/15 backdrop-blur-md text-content-primary border border-black/[0.06] dark:border-white/[0.08] transition-all shadow-xs group cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-content-primary">
                <Plus className="w-4 h-4 text-primary" />
                <span>Новый маршрут</span>
              </span>
            </button>
          </div>

          {/* Dialog history feed */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-content-muted">
                История диалогов пуста
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {sessions.map((item) => (
                  <div
                    key={item.id}
                    className={`group/session relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                      activeSessionId === item.id
                        ? "bg-white/90 dark:bg-white/15 text-content-primary font-medium shadow-xs border border-black/[0.04] dark:border-white/[0.08]"
                        : "text-content-secondary hover:bg-white/60 dark:hover:bg-white/10 hover:text-content-primary"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSession(item.id)}
                      className="flex items-center gap-2 truncate text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70 text-primary" />
                      <span className="truncate">{item.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(item.id);
                      }}
                      className="opacity-0 group-hover/session:opacity-100 hover:text-red-500 p-1 transition-opacity shrink-0 cursor-pointer text-content-muted"
                      title="Удалить диалог"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer User & Settings — frosted glass footer */}
          <div className="p-3 bg-white/60 dark:bg-[#151221]/80 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08]">
            {isAuthenticated && user ? (
              /* User Profile bar with authenticated user data */
              <div
                onClick={() => openSettingsModal("account")}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                title="Открыть профиль путешественника"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-[#581c87] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                    {user.fullName ? user.fullName.slice(0, 1).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-bold text-content-primary truncate leading-tight">
                      {user.fullName}
                    </span>
                    <span className="text-[11px] font-medium text-content-secondary truncate leading-tight mt-0.5">
                      {user.tier || "Путешественник"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container dark:hover:bg-white/10 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSettingsModal("account");
                  }}
                  title="Настройки профиля и аккаунта"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Unauthenticated: inviting login button */
              <button
                type="button"
                onClick={openAuthModal}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#581c87]/10 dark:bg-purple-950/40 hover:bg-[#581c87]/20 border border-[#581c87]/20 text-[#581c87] dark:text-purple-300 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#581c87] flex items-center justify-center text-white shrink-0 shadow-xs">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">Вход в аккаунт</span>
                    <span className="text-[10px] text-content-muted leading-tight mt-0.5">
                      Сохранение маршрутов
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold">Войти →</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
