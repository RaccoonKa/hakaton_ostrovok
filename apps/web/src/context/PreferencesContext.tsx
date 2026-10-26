import React, { createContext, useContext, useState } from "react";

export type CurrencyCode = "RUB" | "USD" | "EUR" | "AED";
export type LanguageCode = "ru" | "en";
export type SettingsTab = "search" | "account";

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

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  tier: string;
  domesticPassport: string;
  intlPassport: string;
  telegramNotifications: boolean;
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

const DEFAULT_PROFILE: UserProfile = {
  fullName: "Алексей Смирнов",
  email: "alexey.smirnov@example.com",
  phone: "+7 (999) 123-45-67",
  tier: "Премиум",
  domesticPassport: "4512 789123",
  intlPassport: "75 1234567",
  telegramNotifications: true,
};

const STORAGE_PREFS_KEY = "odin_travel_preferences_v1";
const STORAGE_PROFILE_KEY = "odin_user_profile_v1";

interface PreferencesContextType {
  preferences: TravelPreferences;
  updatePreferences: (newPrefs: Partial<TravelPreferences>) => void;
  profile: UserProfile;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  isSettingsModalOpen: boolean;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  openSettingsModal: (tab?: SettingsTab) => void;
  closeSettingsModal: () => void;
  currencyLabel: string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<TravelPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFS_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved), language: "ru" };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PREFERENCES;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROFILE;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("search");

  const updatePreferences = (newPrefs: Partial<TravelPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...newProfile };
      try {
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const openSettingsModal = (tab: SettingsTab = "search") => {
    setActiveTab(tab);
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const currencyLabel = `${preferences.currency} • Русский`;

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        profile,
        updateProfile,
        isSettingsModalOpen,
        activeTab,
        setActiveTab,
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
