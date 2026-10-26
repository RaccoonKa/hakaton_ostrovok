import React, { createContext, useContext, useState } from "react";

export type CurrencyCode = "RUB" | "USD" | "EUR" | "AED";
export type LanguageCode = "ru" | "en";

export interface TravelPreferences {
  currency: CurrencyCode;
  language: LanguageCode;
  homeCity: string;
  adultsCount: number;
  childrenCount: number;
  directFlightsOnly: boolean;
  withLuggage: boolean;
  minHotelRating: number;
}

const DEFAULT_PREFERENCES: TravelPreferences = {
  currency: "RUB",
  language: "ru",
  homeCity: "Москва (MOW)",
  adultsCount: 2,
  childrenCount: 1,
  directFlightsOnly: true,
  withLuggage: true,
  minHotelRating: 4,
};

const STORAGE_KEY = "odin_travel_preferences_v1";

interface PreferencesContextType {
  preferences: TravelPreferences;
  updatePreferences: (newPrefs: Partial<TravelPreferences>) => void;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  currencyLabel: string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<TravelPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PREFERENCES;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const updatePreferences = (newPrefs: Partial<TravelPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const langLabel = preferences.language === "ru" ? "Русский" : "English";
  const currencyLabel = `${preferences.currency} • ${langLabel}`;

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        isSettingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        currencyLabel,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};
