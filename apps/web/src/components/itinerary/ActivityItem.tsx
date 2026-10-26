import React from "react";
import { LucideIcon } from "lucide-react";

interface ActivityItemProps {
  index: number;
  title: string;
  subtitle?: string;
  timeLabel?: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "primary" | "tertiary" | "neutral" | "secondary";
  isLast?: boolean;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  index,
  title,
  subtitle,
  timeLabel,
  description,
  icon: Icon,
  variant = "primary",
  isLast = false,
}) => {
  const dotColorClass =
    variant === "primary"
      ? "bg-primary"
      : variant === "tertiary"
      ? "bg-emerald-600"
      : variant === "secondary"
      ? "bg-secondary"
      : "bg-surface-border";

  const timeColorClass =
    variant === "primary"
      ? "text-primary font-semibold"
      : variant === "tertiary"
      ? "text-emerald-700 font-semibold"
      : "text-content-secondary";

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      {/* Connector line */}
      {!isLast && (
        <span
          className="absolute left-[7px] top-3 bottom-0 w-0.5 bg-surface-container-highest"
          aria-hidden="true"
        />
      )}

      {/* Timeline Node dot */}
      <span
        className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full ${dotColorClass} ring-4 ring-surface-container-lowest shadow-xs flex items-center justify-center`}
      >
        {Icon && <Icon className="w-2 h-2 text-white" />}
      </span>

      {/* Content */}
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-content-primary">
            <span>
              {index}. {title}
            </span>
            {subtitle && (
              <span className="text-xs text-content-muted">({subtitle})</span>
            )}
          </div>

          {timeLabel && (
            <span className={`font-mono text-xs ${timeColorClass} shrink-0`}>
              {timeLabel}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-content-secondary leading-relaxed mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
