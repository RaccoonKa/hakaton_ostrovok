import React from "react";
import {
  TrendingDown,
  Calendar,
  Plane,
  Building2,
  Car,
  ShieldCheck,
  ArrowRight,
  ArrowRightLeft,
} from "lucide-react";
import { TripBudget, Currency } from "../../types/travel";
import { formatPrice } from "@corvax/shared";

export interface PriceOptimizationDiff {
  previousTotal: number;
  newTotal: number;
  savings: number;
  percentSavings: number;
  dateChange?: {
    from: string;
    to: string;
    note: string;
  };
  flightChange?: {
    from: string;
    to: string;
    savings: number;
  };
  hotelChange?: {
    from: string;
    to: string;
    savings: number;
    plan: string;
  };
}

interface PriceBreakdownProps {
  budget?: TripBudget | null;
  currency?: Currency | null;
  optimizationDiff?: PriceOptimizationDiff | null;
  onConfirmDemo?: () => void;
  confirmLabel?: string;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  budget,
  currency = Currency.RUB,
  optimizationDiff,
  onConfirmDemo,
  confirmLabel = "Подтвердить демо-бронирование",
}) => {
  const flightsTotal = budget?.flights_total ?? 51400;
  const hotelsTotal = budget?.hotels_total ?? 68600;
  const transfersTotal = budget?.transfers_total ?? 8600;
  const total = budget?.total ?? flightsTotal + hotelsTotal + transfersTotal;

  return (
    <div className="flex flex-col gap-5 bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-surface-container-highest/60 shadow-sm">
      {/* Optional Optimization Diff Header (Screen 4) */}
      {optimizationDiff && (
        <div className="flex flex-col gap-3 pb-4 border-b border-surface-container-highest/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                <TrendingDown className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-content-primary">
                Сводка оптимизации тарифа
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Экономия {formatPrice(optimizationDiff.savings, currency)} (-
                {optimizationDiff.percentSavings.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* 3-column diff preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
            {/* Date diff */}
            {optimizationDiff.dateChange && (
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5 text-content-muted">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Даты вылета</span>
                </div>
                <div className="line-through text-content-muted">
                  {optimizationDiff.dateChange.from}
                </div>
                <div className="font-semibold text-content-primary flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                  <span>{optimizationDiff.dateChange.to}</span>
                </div>
                <span className="text-[10px] text-content-muted mt-0.5">
                  {optimizationDiff.dateChange.note}
                </span>
              </div>
            )}

            {/* Flight diff */}
            {optimizationDiff.flightChange && (
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5 text-content-muted">
                  <Plane className="w-3.5 h-3.5 text-primary" />
                  <span>Перелёт</span>
                </div>
                <div className="line-through text-content-muted">
                  {optimizationDiff.flightChange.from}
                </div>
                <div className="font-semibold text-content-primary flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                  <span>{optimizationDiff.flightChange.to}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  Выгода: {formatPrice(optimizationDiff.flightChange.savings, currency)}
                </span>
              </div>
            )}

            {/* Hotel diff */}
            {optimizationDiff.hotelChange && (
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5 text-content-muted">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Проживание (7 ночей)</span>
                </div>
                <div className="line-through text-content-muted truncate">
                  {optimizationDiff.hotelChange.from}
                </div>
                <div className="font-semibold text-content-primary flex items-center gap-1 truncate">
                  <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{optimizationDiff.hotelChange.to}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                  {optimizationDiff.hotelChange.plan}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Itemized cost list */}
      <div className="space-y-2 text-xs sm:text-sm text-content-primary">
        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low/60 transition-colors">
          <div className="flex items-center gap-2.5">
            <Plane className="w-4 h-4 text-content-muted shrink-0" />
            <span>Перелёт туда и обратно (билеты с багажом 20 кг)</span>
          </div>
          <span className="font-mono font-medium shrink-0">
            {formatPrice(flightsTotal, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low/60 transition-colors">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-content-muted shrink-0" />
            <span>Проживание в отеле 7 ночей (выбранный тип питания)</span>
          </div>
          <span className="font-mono font-medium shrink-0">
            {formatPrice(hotelsTotal, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low/60 transition-colors">
          <div className="flex items-center gap-2.5">
            <Car className="w-4 h-4 text-content-muted shrink-0" />
            <span>Индивидуальный трансфер а/п – отель – а/п</span>
          </div>
          <span className="font-mono font-medium shrink-0">
            {formatPrice(transfersTotal, currency)}
          </span>
        </div>
      </div>

      {/* Total row */}
      <div className="flex items-baseline justify-between pt-3 border-t border-surface-container-highest/60 px-1">
        <div>
          <span className="text-xs uppercase tracking-wider text-content-muted font-medium block">
            Итоговая стоимость тура
          </span>
          <span className="text-xs text-content-muted">
            Включая налоги, топливные сборы и страховку
          </span>
        </div>

        <div className="text-right">
          {optimizationDiff && (
            <div className="line-through text-xs text-content-muted font-mono mb-0.5">
              {formatPrice(optimizationDiff.previousTotal, currency)}
            </div>
          )}
          <div className="text-2xl font-bold text-primary tracking-tight">
            {formatPrice(total, currency)}
          </div>
          <span className="text-xs text-content-muted block">за 7 ночей, семья</span>
        </div>
      </div>

      {/* Action button */}
      {onConfirmDemo && (
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirmDemo}
            className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{confirmLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-content-muted">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Демо-режим (симуляция) — реальное списание средств не производится</span>
          </div>
        </div>
      )}
    </div>
  );
};
