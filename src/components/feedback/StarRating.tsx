import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  error?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const activeValue = hoverValue !== null ? hoverValue : value;

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(star);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
      e.preventDefault();
      onChange(parseInt(e.key, 10));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
          Rating <span className="text-amber-500 font-bold">*</span>
        </label>
        {activeValue > 0 && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/40">
            {RATING_LABELS[activeValue]}
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Rating out of 5 stars"
        className="flex items-center gap-1.5 sm:gap-2"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeValue;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star > 1 ? "s" : ""} - ${RATING_LABELS[star]}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => !disabled && setHoverValue(star)}
              onMouseLeave={() => !disabled && setHoverValue(null)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              className={`p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <Star
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-all duration-200 ${
                  isFilled
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)] scale-110"
                    : "text-slate-300 dark:text-zinc-700 hover:text-amber-300 dark:hover:text-amber-500"
                }`}
              />
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-medium text-rose-500 dark:text-rose-400 mt-1 animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
