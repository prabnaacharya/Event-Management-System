import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import {
  Music, Users, Wrench, Trophy, PartyPopper, Sparkles, ArrowRight, Heart,
} from "lucide-react";
 
const ICONS = {
  Music, Users, Wrench, Trophy, PartyPopper, Sparkles, Heart,
};
 
const CARD_COLORS = [
  "bg-purple-50 text-primary",
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-600",
  "bg-green-50 text-green-600",
  "bg-pink-50 text-pink-600",
];
 
export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);
 
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
 
      <section className="bg-primary text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Browse by Category</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Pick a category to see events that match what you're looking for.
          </p>
        </div>
      </section>
 
      <section className="max-w-6xl mx-auto px-6 py-14 flex-1 w-full">
        {loading && <p className="text-sm text-gray-400">Loading categories...</p>}
        {!loading && categories.length === 0 && (
          <p className="text-sm text-gray-400">No categories found.</p>
        )}
 
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => {
            const Icon = ICONS[cat.icon] || Sparkles;
            const color = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <Link
                key={cat.id}
                to={`/events?category=${encodeURIComponent(cat.name)}`}
                className="card p-6 flex flex-col items-start gap-4 hover:shadow-md transition-shadow"
              >
                <div className={`p-3 rounded-xl ${color}`}>
                  <Icon size={26} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{cat.name}</h3>
                  <p className="text-sm text-gray-500">
                    {cat.event_count} {cat.event_count === 1 ? "event" : "events"}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary flex items-center gap-1 mt-auto">
                  View events <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
 
      <Footer />
    </div>
  );
}
 