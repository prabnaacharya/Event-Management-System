import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

/** Heart icon: save / unsave an event to the wishlist. Asks the visitor to log in first. */
export default function WishlistButton({ eventId, size = 18, label = false, className = "" }) {
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const saved = has(eventId);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login", { state: { redirectTo: window.location.pathname } });
      return;
    }
    try { await toggle(eventId); } catch { alert("Could not update your wishlist. Please try again."); }
  };

  return (
    <button type="button" onClick={onClick} aria-pressed={saved}
      title={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${
        label ? "px-3 py-1.5 text-sm border border-gray-200 bg-white hover:bg-gray-50" : "p-1.5 bg-white/90 hover:bg-white shadow-sm"
      } ${saved ? "text-red-500" : "text-gray-400 hover:text-red-500"} ${className}`}>
      <Heart size={size} className={saved ? "fill-red-500" : ""} />
      {label && <span className="text-gray-700">{saved ? "Saved" : "Add to wishlist"}</span>}
    </button>
  );
}
