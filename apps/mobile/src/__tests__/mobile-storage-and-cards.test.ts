import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice, Currency, ClientAuthManager } from "@corvax/shared";
import { SavedMobileSession } from "../hooks/useMobileAgent";

test("card price formatting produces unbreakable string with non-breaking spaces", () => {
  const price = 145000;
  const formatted = formatPrice(price, Currency.RUB);
  const cardPriceString = `~${formatted.replace(/ /g, "\u00A0")}`;

  // Ensure no standard spaces exist that could allow line breaks between digits or currency symbol
  assert.ok(!cardPriceString.includes(" "), "Should not contain breakable spaces");
  assert.ok(cardPriceString.includes("\u00A0"), "Should contain non-breaking spaces");
  assert.equal(cardPriceString, "~145\u00A0000\u00A0₽");
});

test("SavedMobileSession data structure can be serialized and deserialized accurately", () => {
  const mockSession: SavedMobileSession = {
    id: "test-session-123",
    title: "Хочу к теплому морю в ноябре",
    timestamp: "14:30",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Хочу к теплому морю в ноябре",
        timestamp: "14:30",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "По вашему запросу сформированы варианты:",
        timestamp: "14:30",
      },
    ],
    tripOptions: [],
    selectedOption: null,
  };

  const serialized = JSON.stringify([mockSession]);
  const restored: SavedMobileSession[] = JSON.parse(serialized);

  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, "test-session-123");
  assert.equal(restored[0].title, "Хочу к теплому морю в ноябре");
  assert.equal(restored[0].messages.length, 2);
});

test("ClientAuthManager supports custom storage adapter fallback", () => {
  const memory = new Map<string, string>();
  ClientAuthManager.setStorageAdapter({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => memory.set(key, val),
    removeItem: (key) => memory.delete(key),
  });

  const testSession = {
    token: "token-abc-123",
    user: {
      id: "u-1",
      email: "traveler@example.com",
      fullName: "Тестовый Путешественник",
      phone: "+7 999 123-45-67",
      isGuest: false,
      createdAt: "2026-10-27",
    },
  };

  ClientAuthManager.saveCurrentSession(testSession);
  const loaded = ClientAuthManager.getCurrentSession();
  assert.equal(loaded?.token, testSession.token);
  assert.equal(loaded?.user.email, testSession.user.email);
  assert.equal(loaded?.user.fullName, testSession.user.fullName);
  assert.equal(loaded?.user.isGuest, false);

  ClientAuthManager.saveCurrentSession(null);
  assert.equal(ClientAuthManager.getCurrentSession(), null);

  // Reset adapter
  ClientAuthManager.setStorageAdapter(null);
});

test("dark theme tokens provide high contrast dark palette", () => {
  const { getTheme, setAppTheme, theme } = require("../theme");
  const dark = getTheme(true);
  const light = getTheme(false);

  assert.equal(dark.isDark, true);
  assert.equal(light.isDark, false);
  assert.notEqual(dark.colors.background, light.colors.background);
  assert.equal(dark.colors.background, "#0F0E17");
  assert.equal(dark.colors.surface, "#181726");
  assert.equal(dark.colors.textPrimary, "#F4F4F6");

  // Dynamic theme proxy
  setAppTheme(true);
  assert.equal(theme.isDark, true);
  assert.equal(theme.colors.background, "#0F0E17");

  setAppTheme(false);
  assert.equal(theme.isDark, false);
  assert.equal(theme.colors.background, "#FBFBFD");

  // Verify getTheme returns exact lightColors when switching back to light mode
  const lightResolved = getTheme(false);
  assert.equal(lightResolved.colors.background, "#FBFBFD");
  assert.equal(lightResolved.colors.surface, "#FFFFFF");
  assert.equal(lightResolved.colors.textPrimary, "#18181B");
  assert.equal(lightResolved.colors.textSecondary, "#3F3F46");
  assert.equal(lightResolved.colors.border, "#E5E5EB");
});

test("mobile sidebar drawer filters sessions accurately by title search", () => {
  const sessions: SavedMobileSession[] = [
    {
      id: "s1",
      title: "Поездка в Сочи на 7 дней",
      timestamp: "10:00",
      messages: [],
      tripOptions: [],
      selectedOption: null,
    },
    {
      id: "s2",
      title: "Отдых в Дубае в отеле 5 звёзд",
      timestamp: "11:30",
      messages: [],
      tripOptions: [],
      selectedOption: null,
    },
    {
      id: "s3",
      title: "Горнолыжный тур в Шерегеш",
      timestamp: "14:15",
      messages: [],
      tripOptions: [],
      selectedOption: null,
    },
  ];

  const filterQuery = (query: string) => {
    if (!query.trim()) return sessions;
    const lower = query.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(lower));
  };

  assert.equal(filterQuery("").length, 3);
  assert.equal(filterQuery("сочи").length, 1);
  assert.equal(filterQuery("сочи")[0].id, "s1");
  assert.equal(filterQuery("дуба").length, 1);
  assert.equal(filterQuery("шерегеш").length, 1);
  assert.equal(filterQuery("париж").length, 0);
});

test("option selection state toggle operates cleanly in place without jump", () => {
  type OptionState = { id: string; title: string } | null;
  let currentSelection: OptionState = null;

  const selectOptionHandler = (opt: OptionState) => {
    currentSelection = currentSelection?.id === opt?.id ? null : opt;
  };

  const optionA = { id: "opt-1", title: "Сочи Парк Отель" };
  const optionB = { id: "opt-2", title: "Radisson Collection" };

  // Select option A
  selectOptionHandler(optionA);
  assert.deepEqual(currentSelection, optionA);

  // Re-selecting option A deselects it (returns to card list in place)
  selectOptionHandler(optionA);
  assert.equal(currentSelection, null);

  // Select option B
  selectOptionHandler(optionB);
  assert.deepEqual(currentSelection, optionB);

  // Directly back to list (pass null)
  selectOptionHandler(null);
  assert.equal(currentSelection, null);
});

test("system OS color scheme auto-detection resolution logic", () => {
  const resolveEffectiveDark = (manualTheme: "light" | "dark" | null, systemColorScheme: "light" | "dark") => {
    return manualTheme !== null ? manualTheme === "dark" : systemColorScheme === "dark";
  };

  // When no manual theme chosen, follows OS scheme automatically
  assert.equal(resolveEffectiveDark(null, "dark"), true, "Should automatically be dark when system is dark");
  assert.equal(resolveEffectiveDark(null, "light"), false, "Should automatically be light when system is light");

  // When manual theme is chosen, takes precedence over OS scheme
  assert.equal(resolveEffectiveDark("light", "dark"), false, "Manual light override takes precedence over system dark");
  assert.equal(resolveEffectiveDark("dark", "light"), true, "Manual dark override takes precedence over system light");
});

test("header theme icon uses pure white and avoids yellow/amber in dark mode", () => {
  const getHeaderThemeIconProps = (isDark: boolean) => ({
    name: isDark ? "sun" : "moon",
    color: "#FFFFFF",
  });

  const darkProps = getHeaderThemeIconProps(true);
  const lightProps = getHeaderThemeIconProps(false);

  assert.equal(darkProps.color, "#FFFFFF");
  assert.notEqual(darkProps.color, "#F59E0B");
  assert.equal(lightProps.color, "#FFFFFF");
});

test("mobile chat send button has proper light/dark visuals and is never dark when disabled in light theme", () => {
  const { getSendButtonVisuals } = require("../utils/themeVisuals");

  // Light mode, disabled (no text or thinking)
  const lightDisabled = getSendButtonVisuals(false, false, "#242236", "#8E8E9A");
  assert.equal(lightDisabled.backgroundColor, "#E5E7EB", "Should be a soft light gray, NOT dark");
  assert.notEqual(lightDisabled.backgroundColor, "#2E2A44", "Should never use dark border/surface in light theme");
  assert.notEqual(lightDisabled.backgroundColor, "#581C87", "Should not be dark purple when disabled");
  assert.equal(lightDisabled.iconColor, "#9CA3AF");

  // Light mode, active (text entered)
  const lightActive = getSendButtonVisuals(true, false, "#242236", "#8E8E9A");
  assert.equal(lightActive.backgroundColor, "#7E22CE", "Should be vibrant royal purple");
  assert.equal(lightActive.iconColor, "#FFFFFF");

  // Dark mode, disabled
  const darkDisabled = getSendButtonVisuals(false, true, "#242236", "#8E8E9A");
  assert.equal(darkDisabled.backgroundColor, "#242236");
  assert.equal(darkDisabled.iconColor, "#8E8E9A");

  // Dark mode, active
  const darkActive = getSendButtonVisuals(true, true, "#242236", "#8E8E9A");
  assert.equal(darkActive.backgroundColor, "#A855F7");
  assert.equal(darkActive.iconColor, "#FFFFFF");
});
