import React, { useState } from "react";
import { CheckCircle2, Circle, Edit3 } from "lucide-react";

interface ClarificationChipsProps {
  chips?: string[];
  onSelectChip?: (text: string) => void;
  activeChip?: string | null;
}

const DEFAULT_CLARIFICATION_CHIPS = [
  "Важен пологий песчаный вход и All Inclusive",
  "Достаточно завтраков, главное короткий трансфер",
  "Напишу своими словами...",
];

export const ClarificationChips: React.FC<ClarificationChipsProps> = ({
  chips = DEFAULT_CLARIFICATION_CHIPS,
  onSelectChip,
  activeChip: externalActiveChip,
}) => {
  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = externalActiveChip !== undefined ? externalActiveChip : internalActive;

  const handleClick = (chipText: string) => {
    setInternalActive(chipText);
    onSelectChip?.(chipText);
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2" id="clarification-chips">
      {chips.map((chip) => {
        const isSelected = active === chip;
        const isCustomEdit = chip.includes("своими словами");

        return (
          <button
            key={chip}
            type="button"
            onClick={() => handleClick(chip)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs active:scale-95 text-left ${
              isSelected
                ? "bg-on-surface text-white shadow-sm ring-1 ring-on-surface"
                : "bg-surface-container-high hover:bg-surface-container-highest text-content-primary"
            }`}
          >
            {isSelected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : isCustomEdit ? (
              <Edit3 className="w-3.5 h-3.5 text-content-muted shrink-0" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-content-muted shrink-0" />
            )}
            <span className="truncate">{chip}</span>
          </button>
        );
      })}
    </div>
  );
};
