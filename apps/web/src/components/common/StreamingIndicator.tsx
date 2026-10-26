import React from "react";
import { Sparkles, Plane, Building2, Calculator, CheckCircle2 } from "lucide-react";
import { AgentStepPhase } from "../../types/travel";

interface StreamingIndicatorProps {
  currentStep?: AgentStepPhase | string;
  customMessage?: string;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  currentStep = "analyzing_flights",
  customMessage,
}) => {
  const getStepDetails = (step: string) => {
    switch (step) {
      case "analyzing_flights":
        return {
          icon: Plane,
          title: "Анализирую авиарейсы и логистику...",
          desc: "Поиск прямых дневных вылетов с включённым багажом",
        };
      case "finding_hotels":
        return {
          icon: Building2,
          title: "Подбираю отели...",
          desc: "Поиск доступных вариантов проживания",
        };
      case "calculating_budget":
        return {
          icon: Calculator,
          title: "Рассчитываю бюджет и оптимизацию...",
          desc: "Поиск спецтарифов и окон пониженного спроса",
        };
      case "ready":
        return {
          icon: CheckCircle2,
          title: "Варианты подготовлены",
          desc: "Сформировано подробное досье поездки",
        };
      default:
        return {
          icon: Sparkles,
          title: customMessage || "ИИ-ассистент формирует ответ...",
          desc: "Синтез информации о рейсах, трансферах и квотах",
        };
    }
  };

  const info = getStepDetails(currentStep);
  const IconComponent = info.icon;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/60 text-content-primary max-w-lg shadow-sm animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0 mt-0.5">
        <IconComponent className="w-4 h-4 animate-spin-slow" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-content-primary leading-tight">
            {info.title}
          </span>
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </span>
        </div>
        <p className="text-[11px] text-content-muted mt-0.5 truncate">{info.desc}</p>
      </div>
    </div>
  );
};
