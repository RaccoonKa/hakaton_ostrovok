import React from "react";
import { ShieldCheck } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
  label?: string;
  variant?: "pill" | "subtle" | "outline";
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  className = "",
  label = "Проверенный тур",
  variant = "pill",
}) => {
  const baseClasses =
    variant === "subtle"
      ? "bg-header/10 text-header-dark border border-header/20"
      : variant === "outline"
      ? "bg-transparent text-header border border-header/30"
      : "bg-emerald-50 text-emerald-800 border border-emerald-200/80";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight select-none shadow-xs ${baseClasses} ${className}`}
      title="Все цены и параметры подтверждены и зафиксированы"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
};
