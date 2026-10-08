import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import EventCard from "../components/EventCard";
import EventFormModal from "../components/EventFormModal";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Events() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "All Categories");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState(searchParams.get("sort") || "date_asc");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const fetchEvents = () => {
    setLoading(true);
    const params = { page, per_page: 4 };
    if (searchParams.get("search")) params.search = searchParams.get("search");
    if (searchParams.get("category") && searchParams.get("category") !== "All Categories") {
      params.category = searchParams.get("category");
    }
    if (searchParams.get("date_from")) params.date_from = searchParams.get("date_from");
    if (searchParams.get("date_to")) params.date_to = searchParams.get("date_to");
    params.sort = searchParams.get("sort") || "date_asc";

    api.get("/events", { params })
      .then((res) => {
        setEvents(res.data.events);
        setPages(res.data.pages || 1);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [searchParams]);

  const applyFilters = () => {
    const params = { page: "1" };
    if (search) params.search = search;
    if (category && category !== "All Categories") params.category = category;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    params.sort = sort;
    setSearchParams(params);
  };

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const quickRange = (days) => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);
    setDateFrom(iso(from));
    setDateTo(iso(to));
  };

  const goToPage = (p) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = String(p);
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        <p className="text-sm text-gray-400 mb-1">
          <Link to="/" className="hover:text-primary">Home</Link> / Events
        </p>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Events</h1>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
            >
              <Plus size={15} /> Add New Event
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <aside className="card p-5 h-fit">
            <h4 className="font-semibold text-gray-800 mb-4">Filters</h4>

            <label className="text-xs font-medium text-gray-500">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="input-field mt-1 mb-4"
            />

            <label className="text-xs font-medium text-gray-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field mt-1 mb-4"
            >
              <option>All Categories</option>
              {categories.map((c) => <option key={c.id}>{c.name}</option>)}
            </select>

            <label className="text-xs font-medium text-gray-500">Sort by date</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field mt-1 mb-4">
              <option value="date_asc">Soonest first</option>
              <option value="date_desc">Latest first</option>
              <option value="newest">Recently added</option>
            </select>

            <label className="text-xs font-medium text-gray-500">Quick date</label>
            <div className="flex flex-wrap gap-2 mt-1 mb-4">
              {[["This week", 7], ["This month", 30], ["Next 3 months", 90]].map(([label, days]) => (
                <button key={label} type="button" onClick={() => quickRange(days)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">{label}</button>
              ))}
              <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs px-2.5 py-1.5 rounded-full text-gray-400 hover:text-red-500">Clear</button>
            </div>

            <label className="text-xs font-medium text-gray-500">From date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field mt-1 mb-4" />

            <label className="text-xs font-medium text-gray-500">To date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field mt-1 mb-4" />

            <button onClick={applyFilters} className="btn-primary w-full">Apply Filters</button>
          </aside>

          {/* Event list */}
          <div className="md:col-span-3 space-y-4">
            {loading && <p className="text-sm text-gray-400">Loading events...</p>}
            {!loading && events.length === 0 && (
              <p className="text-sm text-gray-400">No events found matching your search.</p>
            )}
            {events.map((event) => <EventCard key={event.id} event={event} layout="row" />)}

            {pages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      p === page ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal (admin only) */}
      {showModal && (
        <EventFormModal
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchEvents(); }}
        />
      )}

      <Footer />
    </div>
  );
}