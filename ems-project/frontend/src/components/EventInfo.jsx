import { Mic2, UtensilsCrossed } from "lucide-react";

const toList = (text) => (text || "").split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);

const LINEUP_TITLE = {
  Concerts: "Who's Performing",
  Conferences: "Speakers & Sessions",
  Workshops: "Guided By",
  Sports: "Teams / Participants",
  Festivals: "Who's Performing",
  Weddings: "Family & Entertainment",
};

/** "Who is coming" + "Food & drinks" blocks. Only shows what the admin filled in. */
export default function EventInfo({ event, className = "" }) {
  const lineup = toList(event.performers);
  const food = toList(event.food_details);
  if (!lineup.length && !food.length) return null;
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {lineup.length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-2">
            <Mic2 size={16} className="text-primary" /> {LINEUP_TITLE[event.category] || "Who's Coming"}
          </h4>
          <ul className="space-y-1.5">
            {lineup.map((x, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-primary">•</span>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {food.length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-2">
            <UtensilsCrossed size={16} className="text-primary" /> Food &amp; Drinks
          </h4>
          <ul className="space-y-1.5">
            {food.map((x, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-primary">•</span>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
