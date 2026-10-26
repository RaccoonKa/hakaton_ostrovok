import React from "react";
import { Info } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
  label?: string;
  variant?: "pill" | "subtle" | "outline";
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  className = "",
  label = "Демо-режим (симуляция)",
  variant = "pill",
}) => {
  const baseClasses =
    variant === "subtle"
      ? "bg-secondary-container text-on-secondary-fixed border border-secondary-container"
      : variant === "outline"
      ? "bg-transparent text-amber-700 border border-amber-300"
      : "bg-amber-50 text-amber-800 border border-amber-200/80";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight select-none shadow-sm ${baseClasses} ${className}`}
      title="Цены, доступность мест и бронирования являются демонстрационными и не требуют оплаты"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 animate-pulse" />
      <span className="truncate">{label}</span>
      <Info className="w-3 h-3 text-secondary shrink-0 opacity-70" />
    </span>
  );
};
