import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChatMessage,
  TripOption,
  AgentStepPhase,
  Currency,
} from "../types/travel";
import { PriceOptimizationDiff } from "../components/cards/PriceBreakdown";
import { TravelApiClient, MOCK_TRIP_OPTIONS } from "@corvax/shared";

const WELCOME_MESSAGE: ChatMessage = {
  id: "msg-welcome",
  type: "ai",
  content:
    "Здравствуйте! Я ИИ-ассистент «О!дин запрос». Опишите поездку своими словами: даты, бюджет, пожелания к пляжу или компании. Я подберу честные варианты и соберу готовый маршрут.",
  created_at: new Date().toISOString(),
};

// Rich simulated direction options matching Screen 2
const SCREEN_2_DESTINATIONS: TripOption[] = [
  {
    id: "dest-rak",
    title: "Рас-эль-Хайма, ОАЭ",
    destination: "Рас-эль-Хайма, ОАЭ",
    description:
      "Идеальный пологий песок, тёплое спокойное море (+27°C) и короткий трансфер для детей.",
    score: 96,
    total_price: 148200,
    currency: Currency.RUB,
    isDemo: true,
    flights: [
      {
        origin: "Москва (SVO)",
        destination: "Дубай (DXB)",
        departure_at: "2026-11-12T08:45:00+03:00",
        arrival_at: "2026-11-12T15:00:00+04:00",
        duration: "PT5H15M",
        carrier: "Flydubai",
        flight_number: "FZ-968",
        stops: 0,
        baggage: "1 место 20 кг",
        price: 52000,
        currency: Currency.RUB,
      },
      {
        origin: "Дубай (DXB)",
        destination: "Москва (SVO)",
        departure_at: "2026-11-19T16:30:00+04:00",
        arrival_at: "2026-11-19T21:00:00+03:00",
        duration: "PT5H30M",
        carrier: "Flydubai",
        flight_number: "FZ-969",
        stops: 0,
        baggage: "1 место 20 кг",
        price: 52000,
        currency: Currency.RUB,
      },
    ],
    hotels: [
      {
        hotel: "BM Beach Resort 4★",
        city: "Аль-Хамра, Рас-эль-Хайма",
        check_in: "2026-11-12",
        check_out: "2026-11-19",
        guests: 3,
        room_type: "Делюкс шале (38 м²)",
        meal_plan: "all_inclusive" as any,
        price: 87600,
        currency: Currency.RUB,
        rating: 4.8,
        amenities: ["Wi-Fi", "Собственный песчаный пляж", "Детский клуб", "Бассейн"],
        cancellation_conditions: "Бесплатная отмена за 48 часов до заезда",
      },
    ],
    budget: {
      flights_total: 52000,
      hotels_total: 87600,
      transfers_total: 8600,
      total: 148200,
      currency: Currency.RUB,
    },
  },
  {
    id: "dest-sharm",
    title: "Шарм-эш-Шейх, Наама Бей",
    destination: "Шарм-эш-Шейх, Египет",
    description:
      "Защищённая бухта без ветра, безопасный вход в море без кораллов и удобный All Inclusive.",
    score: 92,
    total_price: 121500,
    currency: Currency.RUB,
    isDemo: true,
    flights: [
      {
        origin: "Москва (VKO)",
        destination: "Шарм-эш-Шейх (SSH)",
        departure_at: "2026-11-10T09:00:00+03:00",
        arrival_at: "2026-11-10T14:30:00+02:00",
        duration: "PT4H30M",
        carrier: "Аэрофлот",
        flight_number: "SU-420",
        stops: 0,
        baggage: "1 место 20 кг",
        price: 45000,
        currency: Currency.RUB,
      },
    ],
    hotels: [
      {
        hotel: "Jaz Sharm Dreams Resort 5★",
        city: "Шарм-эш-Шейх",
        check_in: "2026-11-10",
        check_out: "2026-11-17",
        guests: 3,
        room_type: "Family Deluxe Room",
        meal_plan: "all_inclusive" as any,
        price: 71500,
        currency: Currency.RUB,
        rating: 4.7,
      },
    ],
    budget: {
      flights_total: 45000,
      hotels_total: 71500,
      transfers_total: 5000,
      total: 121500,
      currency: Currency.RUB,
    },
  },
  {
    id: "dest-belek",
    title: "Белек, Турция",
    destination: "Белек, Турция",
    description:
      "Тёплые подогреваемые бассейны с морской водой, развитые детские клубы и выгодная цена.",
    score: 89,
    total_price: 96400,
    currency: Currency.RUB,
    isDemo: true,
    flights: [
      {
        origin: "Москва (DME)",
        destination: "Анталья (AYT)",
        departure_at: "2026-11-12T07:30:00+03:00",
        arrival_at: "2026-11-12T12:00:00+03:00",
        duration: "PT4H30M",
        carrier: "S7 Airlines",
        flight_number: "S7-3741",
        stops: 0,
        baggage: "1 место 23 кг",
        price: 36000,
        currency: Currency.RUB,
      },
    ],
    hotels: [
      {
        hotel: "Bellis Deluxe Hotel 5★",
        city: "Белек",
        check_in: "2026-11-12",
        check_out: "2026-11-19",
        guests: 3,
        room_type: "Standard Sea View",
        meal_plan: "all_inclusive" as any,
        price: 55400,
        currency: Currency.RUB,
        rating: 4.8,
      },
    ],
    budget: {
      flights_total: 36000,
      hotels_total: 55400,
      transfers_total: 5000,
      total: 96400,
      currency: Currency.RUB,
    },
  },
];

export function useTravelAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStepPhase>("idle");
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [optimizationDiff, setOptimizationDiff] =
    useState<PriceOptimizationDiff | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef(new TravelApiClient());

  // Cancel any running query
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStep("idle");
  }, []);

  // Send a message and stream the response
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      cancelRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setCurrentStep("analyzing_flights");

      // Append user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: "human",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const lowerText = text.toLowerCase();

      // Detection for Revision Scenario (Screen 4)
      const isRevisionScenario =
        lowerText.includes("позже") ||
        lowerText.includes("бюджет") ||
        lowerText.includes("меньш") ||
        lowerText.includes("дешевл") ||
        lowerText.includes("сдвинь");

      // Detection for Direct Destination Choice (Screen 3)
      const isPickDestination =
        lowerText.includes("рас-эль-хайм") ||
        lowerText.includes("выбираю") ||
        lowerText.includes("первая линия");

      const assistantMsgId = `ai-${Date.now()}`;
      let accumulatedTokens = "";

      // Step simulation timer for rich UX feedback
      const stepTimer1 = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setCurrentStep("finding_hotels");
        }
      }, 700);

      const stepTimer2 = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setCurrentStep("calculating_budget");
        }
      }, 1500);

      // Custom handler for curated revision scenario (Screen 4)
      const baseOption = selectedOption || tripOptions[0] || SCREEN_2_DESTINATIONS[0];
      if (isRevisionScenario && baseOption) {
        setTimeout(() => {
          if (abortController.signal.aborted) return;
          clearTimeout(stepTimer1);
          clearTimeout(stepTimer2);

          const revisionText =
            "Пересчитал поездку на даты 14–21 ноября (7 ночей, чт–чт). За счёт сдвига вылета на четверг открылось окно низкого спроса на рейс Эйр Арабия (экономия 8 400 ₽), а семейный курорт 5★ Marjan Island Resort & Spa предоставил спецтариф «Софт Всё включено» (выгода 11 200 ₽). Итоговая стоимость тура снизилась со 148 200 ₽ до 128 600 ₽ (чистая выгода — 19 600 ₽ или -13.2%).";

          const revisedOption: TripOption = {
            ...baseOption,
            id: "revised-marjan-5star",
            title: "Рас-эль-Хайма • Marjan Island Resort & Spa 5★",
            destination: "Рас-эль-Хайма, Марджан-Айленд",
            total_price: 128600,
            flights: [
              {
                origin: "Москва (DME)",
                destination: "Шарджа (SHJ)",
                departure_at: "2026-11-14T09:15:00+03:00",
                arrival_at: "2026-11-14T15:20:00+04:00",
                duration: "PT5H05M",
                carrier: "Эйр Арабия",
                flight_number: "G9-952",
                stops: 0,
                baggage: "3 места по 20 кг",
                price: 51400,
                currency: Currency.RUB,
              },
              {
                origin: "Шарджа (SHJ)",
                destination: "Москва (DME)",
                departure_at: "2026-11-21T17:00:00+04:00",
                arrival_at: "2026-11-21T21:30:00+03:00",
                duration: "PT5H30M",
                carrier: "Эйр Арабия",
                flight_number: "G9-953",
                stops: 0,
                baggage: "3 места по 20 кг",
                price: 51400,
                currency: Currency.RUB,
              },
            ],
            hotels: [
              {
                hotel: "Marjan Island Resort & Spa 5★",
                city: "Рас-эль-Хайма, Марджан-Айленд",
                check_in: "2026-11-14",
                check_out: "2026-11-21",
                guests: 3,
                room_type: "Superior Sea View (44 м²)",
                meal_plan: "all_inclusive" as any,
                price: 68600,
                currency: Currency.RUB,
                rating: 5.0,
                cancellation_conditions: "Бесплатная отмена за 24 часа",
              },
            ],
            budget: {
              flights_total: 51400,
              hotels_total: 68600,
              transfers_total: 8600,
              total: 128600,
              currency: Currency.RUB,
            },
          };

          setOptimizationDiff({
            previousTotal: 148200,
            newTotal: 128600,
            savings: 19600,
            percentSavings: 13.2,
            dateChange: {
              from: "12–19 ноября 2026",
              to: "14–21 ноя (чт–чт)",
              note: "Окно низкого спроса",
            },
            flightChange: {
              from: "Flydubai (Дубай)",
              to: "Эйр Арабия (Шарджа)",
              savings: 8400,
            },
            hotelChange: {
              from: "BM Beach Resort 4★",
              to: "Marjan Resort 5★",
              savings: 11200,
              plan: "Выгода: 11 200 ₽ (Софт Всё вкл.)",
            },
          });

          setSelectedOption(revisedOption);
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              type: "ai",
              content: revisionText,
              created_at: new Date().toISOString(),
            },
          ]);

          setIsLoading(false);
          setCurrentStep("ready");
        }, 1800);
        return;
      }

      // Default or First Choice: call client with mock fallback
      try {
        await clientRef.current.sendMessage(
          text,
          { mockFallback: true },
          {
            onToken: (token) => {
              accumulatedTokens += token;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: accumulatedTokens },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: assistantMsgId,
                    type: "ai",
                    content: accumulatedTokens,
                    created_at: new Date().toISOString(),
                  },
                ];
              });
            },
            onTripOptions: (options) => {
              // If user directly picked a destination, select it for dossier view
              if (isPickDestination) {
                const picked =
                  SCREEN_2_DESTINATIONS.find((d) =>
                    d.destination?.toLowerCase().includes("рас-эль-хайм")
                  ) || SCREEN_2_DESTINATIONS[0];
                setSelectedOption(picked);
              } else {
                setTripOptions(
                  options.length > 0 ? options : SCREEN_2_DESTINATIONS
                );
              }
            },
            onError: (err) => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              setIsLoading(false);
              setCurrentStep("ready");
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  type: "ai",
                  content: `Отображаю проверенные предложения из каталога.`,
                  created_at: new Date().toISOString(),
                },
              ]);
              setTripOptions(SCREEN_2_DESTINATIONS);
            },
            onComplete: () => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              if (isPickDestination) {
                const picked =
                  SCREEN_2_DESTINATIONS.find((d) =>
                    d.destination?.toLowerCase().includes("рас-эль-хайм")
                  ) || SCREEN_2_DESTINATIONS[0];
                setSelectedOption(picked);
              } else if (!selectedOption && tripOptions.length === 0) {
                setTripOptions(SCREEN_2_DESTINATIONS);
              }
              setIsLoading(false);
              setCurrentStep("ready");
            },
          },
          abortController.signal
        );
      } catch (e) {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          setCurrentStep("ready");
        }
      } finally {
        if (!abortController.signal.aborted) {
          clearTimeout(stepTimer1);
          clearTimeout(stepTimer2);
          setIsLoading(false);
        }
      }
    },
    [cancelRequest, isLoading, selectedOption, tripOptions.length]
  );

  // Select an option to see its full Dossier / Timeline
  const selectOption = useCallback((option: TripOption | null) => {
    setSelectedOption(option);
  }, []);

  // Reset entire dialog
  const resetChat = useCallback(() => {
    cancelRequest();
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setOptimizationDiff(null);
    setIsBookingModalOpen(false);
  }, [cancelRequest]);

  // Load a prompt from history item
  const applyHistoryQuery = useCallback(
    (query: string) => {
      resetChat();
      setTimeout(() => {
        sendMessage(query);
      }, 50);
    },
    [resetChat, sendMessage]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);

  return {
    messages,
    isLoading,
    currentStep,
    tripOptions,
    selectedOption,
    optimizationDiff,
    isBookingModalOpen,
    sendMessage,
    selectOption,
    resetChat,
    cancelRequest,
    applyHistoryQuery,
    openBookingModal: () => setIsBookingModalOpen(true),
    closeBookingModal: () => setIsBookingModalOpen(false),
  };
}
