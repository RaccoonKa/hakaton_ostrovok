import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Sliders,
  Coins,
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
  Search,
  Plus,
  ChevronDown,
} from "lucide-react";
import { CITIES_DATABASE, CityOption } from "@corvax/shared";
import {
  usePreferences,
  CurrencyCode,
  TravelPreferences,
  UserProfile,
} from "../../context/PreferencesContext";
import { useAuth } from "../../context/AuthContext";

const POPULAR_CITIES = [
  "Москва (MOW)",
  "Санкт-Петербург (LED)",
  "Екатеринбург (SVX)",
  "Казань (KZN)",
  "Новосибирск (OVB)",
  "Сочи (AER)",
];

const RAW_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "AMD", label: "Армянский драм", symbol: "֏" },
  { code: "BYN", label: "Белорусский рубль", symbol: "Br" },
  { code: "GEL", label: "Грузинский лари", symbol: "₾" },
  { code: "AED", label: "Дирхам ОАЭ", symbol: "AED" },
  { code: "USD", label: "Доллар США", symbol: "$" },
  { code: "EUR", label: "Евро", symbol: "€" },
  { code: "EGP", label: "Египетский фунт", symbol: "E£" },
  { code: "KZT", label: "Казахстанский тенге", symbol: "₸" },
  { code: "CNY", label: "Китайский юань", symbol: "¥" },
  { code: "RUB", label: "Российский рубль", symbol: "₽" },
  { code: "THB", label: "Тайский бат", symbol: "฿" },
  { code: "TRY", label: "Турецкая лира", symbol: "₺" },
];

// Alphabetical sort by Russian currency title
const CURRENCIES = [...RAW_CURRENCIES].sort((a, b) =>
  a.label.localeCompare(b.label, "ru")
);

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
  const { isAuthenticated, logout, openAuthModal } = useAuth();

  const [draftPrefs, setDraftPrefs] = useState<TravelPreferences>(preferences);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  // Dynamic list of city chips: starts with POPULAR_CITIES + includes any selected city
  const [availableCities, setAvailableCities] = useState<string[]>(() => {
    if (preferences.homeCity && !POPULAR_CITIES.includes(preferences.homeCity)) {
      return [...POPULAR_CITIES, preferences.homeCity];
    }
    return POPULAR_CITIES;
  });

  const [cityQuery, setCityQuery] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Currency dropdown state
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState("");
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  const selectedCurrencyItem = useMemo(() => {
    return (
      CURRENCIES.find((c) => c.code === draftPrefs.currency) || {
        code: draftPrefs.currency,
        label: draftPrefs.currency,
        symbol: draftPrefs.currency,
      }
    );
  }, [draftPrefs.currency]);

  // Currencies filtered by search query (already sorted alphabetically)
  const filteredCurrencies = useMemo(() => {
    const q = currencySearchQuery.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currencySearchQuery]);

  // Sync draft whenever modal opens or tab changes
  useEffect(() => {
    if (isSettingsModalOpen) {
      setDraftPrefs(preferences);
      setDraftProfile(profile);
      setIsSaved(false);
      setCityQuery("");
      setIsCityDropdownOpen(false);
      setIsCurrencyDropdownOpen(false);
      setCurrencySearchQuery("");
      if (preferences.homeCity && !POPULAR_CITIES.includes(preferences.homeCity)) {
        setAvailableCities((prev) =>
          prev.includes(preferences.homeCity) ? prev : [...prev, preferences.homeCity]
        );
      }
    }
  }, [isSettingsModalOpen, preferences, profile]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCityDropdownOpen(false);
      }
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter cities by query (searches city name, IATA code, and airport name)
  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return [];
    return CITIES_DATABASE.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.airportName && c.airportName.toLowerCase().includes(q))
    ).slice(0, 7);
  }, [cityQuery]);

  const handleSelectCityOption = (city: CityOption) => {
    const formatted = `${city.name} (${city.code})`;
    setDraftPrefs((p) => ({ ...p, homeCity: formatted }));
    setAvailableCities((prev) => (prev.includes(formatted) ? prev : [...prev, formatted]));
    setCityQuery("");
    setIsCityDropdownOpen(false);
  };

  const handleSelectCustomCity = (cityName: string) => {
    const formatted = cityName.trim();
    if (!formatted) return;
    setDraftPrefs((p) => ({ ...p, homeCity: formatted }));
    setAvailableCities((prev) => (prev.includes(formatted) ? prev : [...prev, formatted]));
    setCityQuery("");
    setIsCityDropdownOpen(false);
  };

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
    logout();
    closeSettingsModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={closeSettingsModal}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-surface border border-surface-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-content-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-surface-muted/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "search"
                  ? "bg-surface text-primary shadow-xs border border-primary/30 font-bold"
                  : "text-content-secondary hover:text-content-primary hover:bg-surface-subtle"
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
                  ? "bg-surface text-primary shadow-xs border border-primary/30 font-bold"
                  : "text-content-secondary hover:text-content-primary hover:bg-surface-subtle"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Профиль</span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeSettingsModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-colors"
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
              {/* Section 1: Currency Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider">
                    <Coins className="w-4 h-4 text-primary" />
                    <span>Валюта цен</span>
                  </div>
                  {selectedCurrencyItem && (
                    <span className="text-[11px] font-semibold text-primary">
                      {selectedCurrencyItem.code} ({selectedCurrencyItem.symbol})
                    </span>
                  )}
                </div>

                {/* Currency Dropdown Container */}
                <div ref={currencyDropdownRef} className="relative">
                  {/* Select Trigger Box */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCurrencyDropdownOpen((prev) => !prev);
                      setCurrencySearchQuery("");
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-surface-border hover:border-slate-400 bg-surface text-content-primary transition-all text-xs focus:border-primary focus:outline-none shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {selectedCurrencyItem?.symbol || "₽"}
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-content-primary truncate">
                          {selectedCurrencyItem?.label || draftPrefs.currency}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-surface-muted">
                          {selectedCurrencyItem?.code || draftPrefs.currency}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-content-muted group-hover:text-content-primary transition-transform duration-200 shrink-0 ${
                        isCurrencyDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu (Sorted Alphabetically) */}
                  {isCurrencyDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-surface-border animate-fade-in max-h-64 flex flex-col">
                      {/* Search inside currency dropdown */}
                      <div className="p-2 bg-surface-muted/60 relative">
                        <Search className="w-3.5 h-3.5 text-content-muted absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={currencySearchQuery}
                          onChange={(e) => setCurrencySearchQuery(e.target.value)}
                          placeholder="Поиск валюты (по названию или коду)..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-surface-border focus:border-primary focus:outline-none bg-surface text-content-primary placeholder:text-content-muted"
                          autoFocus
                        />
                      </div>

                      {/* Currency options list */}
                      <div className="overflow-y-auto max-h-48 divide-y divide-surface-border/60">
                        {filteredCurrencies.length > 0 ? (
                          filteredCurrencies.map((cur) => {
                            const isSelected = draftPrefs.currency === cur.code;
                            return (
                              <button
                                key={cur.code}
                                type="button"
                                onClick={() => {
                                  setDraftPrefs((p) => ({ ...p, currency: cur.code }));
                                  setIsCurrencyDropdownOpen(false);
                                  setCurrencySearchQuery("");
                                }}
                                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-primary-light text-primary font-semibold"
                                    : "hover:bg-surface-subtle text-content-primary"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 text-center font-bold text-sm shrink-0">
                                    {cur.symbol}
                                  </span>
                                  <span className="truncate">{cur.label}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-[10px] font-mono font-bold text-content-muted px-1.5 py-0.5 rounded bg-surface-muted">
                                    {cur.code}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-content-muted">
                            Ничего не найдено
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Home Departure City */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Город вылета по умолчанию</span>
                  </div>
                  {draftPrefs.homeCity && (
                    <span className="text-[11px] font-semibold text-primary">
                      Выбран: {draftPrefs.homeCity}
                    </span>
                  )}
                </div>

                {/* Popular & Added City Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {availableCities.map((city) => {
                    const isSelected = draftPrefs.homeCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setDraftPrefs((p) => ({ ...p, homeCity: city }));
                          setIsCityDropdownOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-white font-semibold shadow-xs ring-2 ring-primary/20"
                            : "bg-surface-subtle hover:bg-surface-muted text-content-secondary border border-surface-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{city}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Autocomplete Input Container */}
                <div ref={cityDropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-content-muted absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={cityQuery}
                      onChange={(e) => {
                        setCityQuery(e.target.value);
                        setIsCityDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (cityQuery.trim()) {
                          setIsCityDropdownOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filteredCities.length > 0) {
                            handleSelectCityOption(filteredCities[0]);
                          } else if (cityQuery.trim()) {
                            handleSelectCustomCity(cityQuery);
                          }
                        } else if (e.key === "Escape") {
                          setIsCityDropdownOpen(false);
                        }
                      }}
                      placeholder="Начните вводить: Калининград, Уфа, Сочи..."
                      className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary placeholder:text-content-muted transition-colors"
                    />
                    {cityQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setCityQuery("");
                          setIsCityDropdownOpen(false);
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary absolute right-2.5 hover:bg-surface-subtle"
                        title="Очистить"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {isCityDropdownOpen && cityQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-surface-border max-h-60 overflow-y-auto animate-fade-in">
                      {filteredCities.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 bg-surface-muted text-[10px] font-bold text-content-muted uppercase tracking-wider">
                            Подходящие города и аэропорты ({filteredCities.length})
                          </div>
                          {filteredCities.map((city) => {
                            const formatted = `${city.name} (${city.code})`;
                            const isCurrentSelected = draftPrefs.homeCity === formatted;
                            return (
                              <button
                                key={city.code}
                                type="button"
                                onClick={() => handleSelectCityOption(city)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors group cursor-pointer ${
                                  isCurrentSelected
                                    ? "bg-primary-light text-primary font-semibold"
                                    : "hover:bg-surface-subtle text-content-primary"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                                    <Plane className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex flex-col min-w-0 truncate">
                                    <div className="flex items-center gap-1.5 leading-tight">
                                      <span className="font-semibold text-content-primary truncate">
                                        {city.name}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-surface-muted">
                                        {city.code}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-content-muted truncate mt-0.5">
                                      {city.country}
                                      {city.airportName ? ` • ${city.airportName}` : ""}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                  Выбрать →
                                </span>
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="p-3 text-center">
                          <p className="text-xs text-content-muted mb-2">
                            Город «{cityQuery}» не найден в базе основных хабов
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSelectCustomCity(cityQuery)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Использовать «{cityQuery}»</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Flight & Hotel Preferences */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary uppercase tracking-wider mb-3">
                  <Plane className="w-4 h-4 text-primary" />
                  <span>Предпочтения перелётов и отелей</span>
                </div>

                <div className="space-y-2.5">
                  {/* Direct Flights Only */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-muted/60 transition-colors cursor-pointer">
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
                  <label className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-muted/60 transition-colors cursor-pointer">
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
                  <div className="p-3 rounded-xl border border-surface-border flex flex-col gap-2">
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
                              : "bg-surface-subtle text-content-secondary hover:bg-surface-muted"
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
          ) : !isAuthenticated ? (
            /* Unauthenticated Account State */
            <div className="p-8 rounded-2xl bg-surface-muted/50 dark:bg-white/5 border border-surface-border text-center flex flex-col items-center justify-center my-4">
              <div className="w-14 h-14 rounded-full bg-[#581c87]/15 dark:bg-purple-900/30 text-[#581c87] dark:text-purple-300 flex items-center justify-center mb-3.5 shadow-xs">
                <User className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-content-primary mb-1">
                Личный кабинет путешественника
              </h4>
              <p className="text-xs text-content-muted mb-5 max-w-sm">
                Войдите или зарегистрируйтесь, чтобы сохранять историю маршрутов, управлять бронированиями и быстро оформлять билеты.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeSettingsModal();
                  openAuthModal();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#581c87] to-[#7e22ce] hover:from-[#4a1674] hover:to-[#6b21a8] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer"
              >
                Войти в аккаунт
              </button>
            </div>
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
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary"
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
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary"
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
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-border focus:border-primary focus:outline-none bg-surface-muted/60 text-content-primary"
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

                <label className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-muted/60 transition-colors cursor-pointer">
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
              <div className="pt-2 border-t border-surface-border flex justify-end">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-surface-border bg-surface-muted/60 flex items-center justify-between">
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
              className="px-3.5 py-2 text-xs font-semibold text-content-secondary hover:bg-surface-subtle rounded-xl transition-colors"
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
