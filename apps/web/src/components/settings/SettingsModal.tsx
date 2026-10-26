import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Globe,
  MapPin,
  Plane,
  Luggage,
  Star,
  Check,
  RotateCcw,
  User,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  Send,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  usePreferences,
  CurrencyCode,
  LanguageCode,
  SettingsTab,
  TravelPreferences,
  UserProfile,
} from "../../context/PreferencesContext";

const POPULAR_CITIES = [
  "Москва (MOW)",
  "Санкт-Петербург (LED)",
  "Екатеринбург (SVX)",
  "Казань (KZN)",
  "Новосибирск (OVB)",
  "Сочи (AER)",
];

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "RUB", label: "Российский рубль", symbol: "₽" },
  { code: "USD", label: "Доллар США", symbol: "$" },
  { code: "EUR", label: "Евро", symbol: "€" },
  { code: "AED", label: "Дирхам ОАЭ", symbol: "AED" },
];

const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export const SettingsModal: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    profile,
    updateProfile,
    isSettingsModalOpen,
    activeTab,
    setActiveTab,
    closeSettingsModal,
  } = usePreferences();

  const [draftPrefs, setDraftPrefs] = useState<TravelPreferences>(preferences);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  // Sync draft whenever modal opens or tab changes
  useEffect(() => {
    if (isSettingsModalOpen) {
      setDraftPrefs(preferences);
      setDraftProfile(profile);
      setIsSaved(false);
    }
  }, [isSettingsModalOpen, preferences, profile]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSettingsModalOpen) {
        closeSettingsModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsModalOpen, closeSettingsModal]);

  if (!isSettingsModalOpen) return null;

  const handleSave = () => {
    updatePreferences(draftPrefs);
    updateProfile(draftProfile);
    setIsSaved(true);
    setTimeout(() => {
      closeSettingsModal();
    }, 400);
  };

  const handleResetSearch = () => {
    setDraftPrefs({
      currency: "RUB",
      language: "ru",
      homeCity: "Москва (MOW)",
      adultsCount: 2,
      childrenCount: 1,
      directFlightsOnly: true,
      withLuggage: true,
      minHotelRating: 4,
    });
  };

  const handleLogout = () => {
    if (confirm("Вы уверены, что хотите выйти из аккаунта?")) {
      closeSettingsModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={closeSettingsModal}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-content-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "search"
                  ? "bg-white text-primary shadow-xs border border-primary/25 font-bold"
                  : "text-content-secondary hover:text-content-primary hover:bg-slate-100/80"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Параметры поиска</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "account"
                  ? "bg-white text-primary shadow-xs border border-primary/25 font-bold"
                  : "text-content-secondary hover:text-content-primary hover:bg-slate-100/80"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Профиль</span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeSettingsModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-slate-200/60 transition-colors"
            title="Закрыть"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {activeTab === "search" ? (
            /* TAB 1: Search & Regional Preferences */
            <>
              {/* Section 1: Currency & Language */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>Валюта и язык</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {CURRENCIES.map((cur) => {
                    const isSelected = draftPrefs.currency === cur.code;
                    return (
                      <button
                        key={cur.code}
                        type="button"
                        onClick={() => setDraftPrefs((p) => ({ ...p, currency: cur.code }))}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "border-primary bg-primary-light text-primary font-bold shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-content-secondary"
                        }`}
                      >
                        <span className="text-lg font-bold leading-tight">{cur.symbol}</span>
                        <span className="text-xs font-semibold mt-0.5">{cur.code}</span>
                        <span className="text-[10px] text-content-muted truncate max-w-full">
                          {cur.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = draftPrefs.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setDraftPrefs((p) => ({ ...p, language: lang.code }))}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-primary bg-primary-light text-primary font-bold shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-content-secondary"
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-xs font-semibold">{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Home Departure City */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-2.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Город вылета по умолчанию</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {POPULAR_CITIES.map((city) => {
                    const isSelected = draftPrefs.homeCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setDraftPrefs((p) => ({ ...p, homeCity: city }))}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          isSelected
                            ? "bg-primary text-white font-semibold shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-content-secondary"
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={draftPrefs.homeCity}
                  onChange={(e) => setDraftPrefs((p) => ({ ...p, homeCity: e.target.value }))}
                  placeholder="Или укажите свой город вылета..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Section 3: Flight & Hotel Preferences */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
                  <Plane className="w-4 h-4 text-primary" />
                  <span>Предпочтения перелётов и отелей</span>
                </div>

                <div className="space-y-2.5">
                  {/* Direct Flights Only */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Plane className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-content-primary">
                          Только прямые перелёты
                        </span>
                        <span className="text-[11px] text-content-muted">
                          Исключать рейсы с длительными пересадками
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftPrefs.directFlightsOnly}
                      onChange={(e) =>
                        setDraftPrefs((p) => ({ ...p, directFlightsOnly: e.target.checked }))
                      }
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </label>

                  {/* Luggage included */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Luggage className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-content-primary">
                          Багаж всегда включён
                        </span>
                        <span className="text-[11px] text-content-muted">
                          Подбирать тарифы с зарегистрированным багажом от 20 кг
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftPrefs.withLuggage}
                      onChange={(e) =>
                        setDraftPrefs((p) => ({ ...p, withLuggage: e.target.checked }))
                      }
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                  </label>

                  {/* Min Hotel Rating */}
                  <div className="p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-content-primary flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Категория отеля по умолчанию</span>
                      </span>
                      <span className="text-xs font-bold text-primary">
                        {draftPrefs.minHotelRating === 0
                          ? "Любая"
                          : draftPrefs.minHotelRating === 5
                          ? "Только 5★"
                          : `От ${draftPrefs.minHotelRating}★`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { rating: 0, label: "Любая" },
                        { rating: 3, label: "3★+" },
                        { rating: 4, label: "4★+" },
                        { rating: 5, label: "5★ Luxe" },
                      ].map((opt) => (
                        <button
                          key={opt.rating}
                          type="button"
                          onClick={() =>
                            setDraftPrefs((p) => ({ ...p, minHotelRating: opt.rating }))
                          }
                          className={`py-1 text-xs rounded-lg font-medium transition-all ${
                            draftPrefs.minHotelRating === opt.rating
                              ? "bg-primary text-white shadow-xs font-bold"
                              : "bg-slate-100 text-content-secondary hover:bg-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: User Profile & Account Settings */
            <>
              {/* Premium Tier Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-[#6b3b90] text-white shadow-sm flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold leading-tight">
                        {draftProfile.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-[10px] font-bold text-amber-200 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Премиум
                      </span>
                    </div>
                    <span className="text-xs text-white/80 block mt-0.5">
                      {draftProfile.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Данные аккаунта</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      Имя и фамилия
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={draftProfile.fullName}
                        onChange={(e) =>
                          setDraftProfile((p) => ({ ...p, fullName: e.target.value }))
                        }
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-content-secondary mb-1">
                        Электронная почта
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={draftProfile.email}
                          onChange={(e) =>
                            setDraftProfile((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-content-secondary mb-1">
                        Телефон
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          value={draftProfile.phone}
                          onChange={(e) =>
                            setDraftProfile((p) => ({ ...p, phone: e.target.value }))
                          }
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Travel Documents */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Документы для бронирования</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      Паспорт РФ (поездки по России)
                    </label>
                    <input
                      type="text"
                      value={draftProfile.domesticPassport}
                      onChange={(e) =>
                        setDraftProfile((p) => ({ ...p, domesticPassport: e.target.value }))
                      }
                      placeholder="Серия и номер"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      Загранпаспорт (международные туры)
                    </label>
                    <input
                      type="text"
                      value={draftProfile.intlPassport}
                      onChange={(e) =>
                        setDraftProfile((p) => ({ ...p, intlPassport: e.target.value }))
                      }
                      placeholder="Серия и номер"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-primary focus:outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                <span className="text-[11px] text-content-muted block leading-tight">
                  🔒 Данные хранятся локально и автоматически подставляются при быстром бронировании
                  в Ostrovok Travel Gateway.
                </span>
              </div>

              {/* Telegram & Notifications */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-2.5">
                  <Send className="w-4 h-4 text-primary" />
                  <span>Уведомления и интеграции</span>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4 text-sky-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-content-primary block">
                        Telegram-бот (@odin_travel_bot)
                      </span>
                      <span className="text-[11px] text-content-muted">
                        Уведомления об изменении статуса рейсов и падении цен
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftProfile.telegramNotifications}
                    onChange={(e) =>
                      setDraftProfile((p) => ({
                        ...p,
                        telegramNotifications: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Logout button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          {activeTab === "search" ? (
            <button
              type="button"
              onClick={handleResetSearch}
              className="flex items-center gap-1.5 text-xs font-medium text-content-muted hover:text-content-primary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить поиск</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSettingsModal}
              className="px-3.5 py-2 text-xs font-semibold text-content-secondary hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-active rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Сохранено!</span>
                </>
              ) : (
                <span>Сохранить</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
