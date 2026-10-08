import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Music, Users, Wrench, Trophy, PartyPopper, Heart, Grid3x3, CalendarDays, Clock, MapPin } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import EventCard from "../components/EventCard";
import SafeImg from "../components/SafeImg";
import api from "../api/axios";
 
const ICONS = {
  Music, Users, Wrench, Trophy, PartyPopper, Heart,
};
 
export default function Home() {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const navigate = useNavigate();
 
  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
    api.get("/events/featured").then((res) => setFeatured(res.data)).catch(() => {});
    // Public "Upcoming Events" list — sorted soonest first, visible to every visitor (no login needed)
    api
      .get("/events?per_page=6")
      .then((res) => setUpcoming(res.data.events || res.data))
      .catch(() => {});
  }, []);
 
  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/events${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };
 
  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-gradient-to-br from-[#3B0764] via-[#5B21B6] to-[#7C3AED] pb-24">
        <Navbar transparent />
        <div className="max-w-3xl mx-auto text-center px-6 pt-16">
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight">
            Discover. Book. Enjoy.<br />All Events in One Place.
          </h1>
          <p className="text-purple-100 mt-4 text-base">
            Find and book amazing events, concerts, workshops, conferences and more.
          </p>
 
          <form onSubmit={handleSearch} className="flex gap-2 mt-8 bg-white rounded-lg p-1.5 shadow-lg">
            <div className="flex items-center flex-1 px-3">
              <Search size={18} className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, categories or venues..."
                className="w-full px-2 py-2 text-sm text-gray-700 focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>
      </div>
 
      {/* Popular Categories */}
      <div id="categories" className="max-w-6xl mx-auto px-6 -mt-14 relative z-10">
        <div className="card p-6">
          <h3 className="text-center font-semibold text-gray-800 mb-6">Popular Categories</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const Icon = ICONS[cat.icon] || Grid3x3;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/events?category=${encodeURIComponent(cat.name)}`)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary p-3 rounded-full">
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.event_count} Events</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate("/events")}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <Grid3x3 size={20} />
              </div>
              <span className="text-sm font-medium text-gray-700">More</span>
              <span className="text-xs text-primary">View All</span>
            </button>
          </div>
        </div>
      </div>
 
      {/* Featured Events */}
      <div className="max-w-6xl mx-auto px-6 mt-14">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800 text-lg">Featured Events</h3>
          <button onClick={() => navigate("/events")} className="text-sm text-primary font-medium">View All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {featured.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </div>
 
      {/* Upcoming Events — public, no login needed. Shows date, time and booking status. */}
      <div className="max-w-6xl mx-auto px-6 mt-14">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800 text-lg">Upcoming Events</h3>
          <button onClick={() => navigate("/events")} className="text-sm text-primary font-medium">View All</button>
        </div>
 
        <div className="card divide-y divide-gray-100">
          {upcoming.map((event) => {
            const noTickets = event.has_tickets === false;
            const soldOut = !noTickets && event.available_tickets <= 0;
            const dateLabel = new Date(event.event_date).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });
            return (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <SafeImg
                  src={event.image_url}
                  alt={event.title}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      noTickets ? "bg-purple-100 text-purple-700" : soldOut ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {noTickets ? "Invitation" : soldOut ? "Sold Out" : `${event.available_tickets} tickets left`}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><CalendarDays size={12} /> {dateLabel}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {event.event_time}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {event.venue}</span>
                  </p>
                </div>
                <p className="font-semibold text-primary text-sm flex-shrink-0">{event.has_tickets === false ? "Invitation" : `Rs. ${event.price?.toLocaleString()}`}</p>
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <p className="p-6 text-sm text-gray-400 text-center">No upcoming events right now.</p>
          )}
        </div>
      </div>
 
      <div className="mt-20"><Footer /></div>
    </div>
  );
}
 