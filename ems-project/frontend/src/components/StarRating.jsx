import { useState } from "react";
import { Star } from "lucide-react";

/** Read-only stars (value can be 3.4 etc.) */
export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-gray-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-amber-400 fill-amber-400" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Clickable stars for choosing a rating 1..5 */
export function StarInput({ value, onChange, size = 26 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star size={size} className={n <= shown ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500">
        {value ? ["", "Poor", "Fair", "Good", "Very good", "Excellent"][value] : "Select rating"}
      </span>
    </div>
  );
}
