import React from "react";
import { Info } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
  label?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  className = "",
  label = "Демонстрационные данные",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
      title="Цены, доступность и бронирования являются демонстрационными и не требуют реальной оплаты"
    >
      <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      <span>{label}</span>
    </span>
  );
};
