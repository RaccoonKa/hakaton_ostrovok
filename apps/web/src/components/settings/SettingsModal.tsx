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
} from "lucide-react";
import {
  usePreferences,
  CurrencyCode,
  LanguageCode,
  TravelPreferences,
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
  const { preferences, updatePreferences, isSettingsModalOpen, closeSettingsModal } =
    usePreferences();

  const [draft, setDraft] = useState<TravelPreferences>(preferences);
  const [isSaved, setIsSaved] = useState(false);

  // Sync draft whenever modal opens
  useEffect(() => {
    if (isSettingsModalOpen) {
      setDraft(preferences);
      setIsSaved(false);
    }
  }, [isSettingsModalOpen, preferences]);

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
    updatePreferences(draft);
    setIsSaved(true);
    setTimeout(() => {
      closeSettingsModal();
    }, 400);
  };

  const handleReset = () => {
    setDraft({
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-content-primary leading-tight">
                Настройки поиска и профиля
              </h2>
              <span className="text-xs text-content-muted leading-tight mt-0.5">
                Регион, валюта и параметры путешествий по умолчанию
              </span>
            </div>
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
          {/* Section 1: Currency & Language */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
              <Globe className="w-4 h-4 text-primary" />
              <span>Валюта и язык</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {CURRENCIES.map((cur) => {
                const isSelected = draft.currency === cur.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, currency: cur.code }))}
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
                const isSelected = draft.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, language: lang.code }))}
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
                const isSelected = draft.homeCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, homeCity: city }))}
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
              value={draft.homeCity}
              onChange={(e) => setDraft((p) => ({ ...p, homeCity: e.target.value }))}
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
                  checked={draft.directFlightsOnly}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, directFlightsOnly: e.target.checked }))
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
                  checked={draft.withLuggage}
                  onChange={(e) => setDraft((p) => ({ ...p, withLuggage: e.target.checked }))}
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
                    {draft.minHotelRating === 0
                      ? "Любая"
                      : draft.minHotelRating === 5
                      ? "Только 5★"
                      : `От ${draft.minHotelRating}★`}
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
                      onClick={() => setDraft((p) => ({ ...p, minHotelRating: opt.rating }))}
                      className={`py-1 text-xs rounded-lg font-medium transition-all ${
                        draft.minHotelRating === opt.rating
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
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-content-muted hover:text-content-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить</span>
          </button>

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
