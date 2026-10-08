import { Link } from "react-router-dom";
import SafeImg from "./SafeImg";
import { CalendarDays, MapPin } from "lucide-react";
import { Stars } from "./StarRating";
import WishlistButton from "./WishlistButton";

const priceLabel = (e) => (e.has_tickets === false ? "Invitation" : `Rs. ${e.price.toLocaleString()}`);
const Rating = ({ e }) =>
  e.review_count > 0 ? (
    <span className="flex items-center gap-1 text-xs text-gray-500"><Stars value={e.avg_rating} size={12} /> {e.avg_rating.toFixed(1)} ({e.review_count})</span>
  ) : null;

export default function EventCard({ event, layout = "grid" }) {
  const dateLabel = new Date(event.event_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  if (layout === "row") {
    return (
      <div className="card flex gap-4 p-3 items-center">
        <div className="relative flex-shrink-0">
          <SafeImg src={event.image_url} alt={event.title} className="w-24 h-20 object-cover rounded-lg" />
          <WishlistButton eventId={event.id} size={15} className="absolute top-1 right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            {event.category}
          </span>
          <h4 className="font-semibold text-gray-900 mt-1 truncate">{event.title}</h4>
          <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 font-bold text-gray-800"><CalendarDays size={12} /> {dateLabel} • {event.event_time}</span>
          </div>
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {event.venue}
          </div>
          <div className="mt-1"><Rating e={event} /></div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-gray-900 mb-2">{priceLabel(event)}</p>
          <Link to={`/events/${event.id}`} className="btn-primary text-xs py-2 px-4 inline-block">
            View Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden group">
      <div className="relative">
        <SafeImg src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
        <span className="absolute top-2 left-2 bg-primary text-white text-[11px] font-medium px-2 py-0.5 rounded">
          {event.category}
        </span>
        <WishlistButton eventId={event.id} className="absolute top-2 right-2" />
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-2">
          <CalendarDays size={12} /> {dateLabel} • {event.event_time}
        </p>
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-1">
          <MapPin size={12} /> {event.venue}
        </p>
        <div className="mt-1.5 h-4"><Rating e={event} /></div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-gray-900">{priceLabel(event)}</span>
        </div>
        <Link to={`/events/${event.id}`} className="btn-primary text-sm w-full mt-3 block text-center">
          View Details
        </Link>
      </div>
    </div>
  );
}
