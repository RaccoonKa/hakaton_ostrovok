import React from "react";
import {
  Plus,
  Search,
  Settings,
  Sliders,
  User,
  MessageSquare,
} from "lucide-react";
import { HistorySessionItem } from "../../types/travel";
import { useSidebar } from "../../context/SidebarContext";

interface SidebarProps {
  onNewChat: () => void;
  onSelectHistoryItem: (query: string) => void;
  activeHistoryId?: string;
}

const SAMPLE_HISTORY: HistorySessionItem[] = [
  {
    id: "hist-1",
    title: "К тёплому морю в ноябре с ребёнком",
    dateGroup: "today",
    query: "Хочу куда-нибудь к тёплому морю в ноябре, недорого, с ребёнком, без долгих перелётов",
    createdAt: "14:32",
  },
  {
    id: "hist-2",
    title: "Уикенд в Стамбуле на двоих",
    dateGroup: "today",
    query: "Уикенд в Стамбуле на двоих с уютным отелем в Бейоглу",
    createdAt: "11:15",
  },
  {
    id: "hist-3",
    title: "Горные лыжи в Сочи на 5 дней",
    dateGroup: "yesterday",
    query: "Горные лыжи в Сочи на 5 дней без очередей на подъёмники",
    createdAt: "Вчера",
  },
  {
    id: "hist-4",
    title: "Винный маршрут по Кахетии",
    dateGroup: "yesterday",
    query: "Винный маршрут по Кахетии на 4 дня с дегустациями",
    createdAt: "Вчера",
  },
  {
    id: "hist-5",
    title: "Лёд Байкала: Ольхон и Листвянка",
    dateGroup: "past7days",
    query: "Путешествие на Байкал зимой, увидеть прозрачный лёд",
    createdAt: "3 дня назад",
  },
  {
    id: "hist-6",
    title: "Стыковка в Дубае 36 часов",
    dateGroup: "past7days",
    query: "Что посмотреть в Дубае за 36 часов со стыковкой",
    createdAt: "5 дней назад",
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
  onSelectHistoryItem,
  activeHistoryId = "hist-1",
}) => {
  const { isSidebarOpen, closeSidebar } = useSidebar();

  const todayItems = SAMPLE_HISTORY.filter((i) => i.dateGroup === "today");
  const yesterdayItems = SAMPLE_HISTORY.filter((i) => i.dateGroup === "yesterday");
  const pastItems = SAMPLE_HISTORY.filter((i) => i.dateGroup === "past7days");

  const handleSelect = (query: string) => {
    onSelectHistoryItem(query);
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop with smooth fade */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar aside */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-surface-container-highest/60 z-40 flex flex-col justify-between select-none shadow-md md:shadow-none transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Brand & Actions with Purple Gradient & Backdrop Blur Effect */}
          <div className="relative pt-3.5 px-4 pb-6 bg-gradient-to-b from-[#581c87] via-[#581c87]/95 via-65% to-transparent backdrop-blur-md text-white shadow-xs">
            {/* Ambient blur glow layer extending slightly lower */}
            <div
              className="absolute inset-x-0 bottom-0 h-8 pointer-events-none -mb-3 bg-gradient-to-b from-[#581c87]/30 via-[#581c87]/10 to-transparent blur-xs"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between mb-3.5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                  О!
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white tracking-tight leading-tight">
                    О!дин запрос
                  </span>
                  <span className="text-[11px] text-white/80 font-medium leading-tight">
                    travel AI-assistant
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/85 hover:bg-white/15 hover:text-white transition-colors"
                title="Поиск по диалогам"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* New route button with ⌘K */}
            <button
              type="button"
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) closeSidebar();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white text-content-primary hover:bg-white/95 border border-white/30 transition-all shadow-sm group relative z-10"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-content-primary">
                <Plus className="w-4 h-4 text-[#581c87] group-hover:rotate-90 transition-transform" />
                <span>Новый маршрут</span>
              </span>
              <kbd className="font-mono text-[10px] text-content-muted bg-surface-container px-1.5 py-0.5 rounded border border-surface-container-highest/60">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Dialog history feed */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
            {/* Today */}
            <div>
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-content-muted uppercase tracking-wider">
                Сегодня
              </div>
              <div className="flex flex-col gap-0.5">
                {todayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.query)}
                    className={`w-full text-left truncate px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      activeHistoryId === item.id
                        ? "bg-surface-container-high text-content-primary font-medium"
                        : "text-content-secondary hover:bg-surface-container hover:text-content-primary"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60 text-primary" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Yesterday */}
            <div>
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-content-muted uppercase tracking-wider">
                Вчера
              </div>
              <div className="flex flex-col gap-0.5">
                {yesterdayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.query)}
                    className="w-full text-left truncate px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-container hover:text-content-primary transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Previous 7 days */}
            <div>
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-content-muted uppercase tracking-wider">
                Предыдущие 7 дней
              </div>
              <div className="flex flex-col gap-0.5">
                {pastItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.query)}
                    className="w-full text-left truncate px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-container hover:text-content-primary transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer User & Settings */}
          <div className="p-3 bg-surface-container-low border-t border-surface-container-highest/60 flex flex-col gap-2">
            {/* Currency & Language selector */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container text-xs text-content-primary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium">RUB • Русский</span>
              </div>
              <button
                type="button"
                className="text-content-muted hover:text-content-primary transition-colors"
                title="Настройки валюты"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Profile bar with enlarged typography */}
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-high transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#581c87] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-base font-bold text-content-primary truncate leading-tight">
                    Алексей С.
                  </span>
                  <span className="text-[13px] font-medium text-content-secondary truncate leading-tight mt-0.5">
                    Путешественник • Премиум
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container transition-colors shrink-0"
                title="Настройки профиля"
              >
                <Settings className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
