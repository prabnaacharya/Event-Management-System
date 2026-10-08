import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Users, CheckCircle2, UserCircle2, Plus, X, Trash2, Eye, Pencil, Calendar,
  CheckCircle, XCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import api, { BACKEND_URL } from "../../api/axios";
import SafeImg from "../../components/SafeImg";
import EventFormModal from "../../components/EventFormModal";
import { Stars } from "../../components/StarRating";
import GateCheckin from "../../components/GateCheckin";

const BOOKING_BADGE = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

// today's date in the user's own time zone (YYYY-MM-DD)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
const lc = (s) => (s || "").toLowerCase();
const PayDetails = ({ b }) =>
  b.delivery_address ? (
    <div className="text-xs text-gray-600 max-w-[200px]">
      <p className="font-medium text-amber-700">COD delivery</p>
      <p>{b.delivery_address}, {b.delivery_city}</p>
      {b.delivery_landmark && <p className="text-gray-400">Near {b.delivery_landmark}</p>}
      <p className="text-gray-500">Tel: {b.buyer_phone}</p>
    </div>
  ) : b.payment_ref ? (
    <div className="text-xs">
      <p className={b.amount_mismatch ? "font-semibold text-red-600" : "text-gray-600"}>
        Paid {rs(b.paid_amount)}{b.amount_mismatch ? ` ≠ ${rs(b.total_amount)}` : ""}
      </p>
      <p className="text-gray-400">Txn: {b.payment_ref}</p>
    </div>
  ) : <span className="text-xs text-gray-300">—</span>;


/* ---------- hover tooltip for the bar chart ---------- */
function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[210px]">
      <p className="font-semibold text-gray-900 text-sm mb-2">{d.fullName}</p>
      <Row k="Tickets sold" v={`${d.sold} / ${d.total}`} color="text-indigo-600" />
      <Row k="Tickets left" v={d.left} />
      <Row k="Pending tickets" v={d.pendingTickets} />
      <Row k="Bookings" v={d.bookings} />
      <div className="border-t border-gray-100 my-1.5" />
      <Row k="Payment received" v={rs(d.received)} color="text-green-600" />
      <Row k="Pending payment" v={rs(d.pendingAmount)} color="text-amber-600" />
    </div>
  );
}
const Row = ({ k, v, color = "text-gray-800" }) => (
  <div className="flex justify-between gap-4 py-0.5">
    <span className="text-gray-500">{k}</span>
    <span className={`font-semibold ${color}`}>{v}</span>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);

  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", event }
  const [reviews, setReviews] = useState([]);
  const [bq, setBq] = useState("");
  const [bStatus, setBStatus] = useState("all");

  const [confirmDel, setConfirmDel] = useState(null); // event to delete
  const [deleting, setDeleting] = useState(false);

  const [proofUrl, setProofUrl] = useState(null);
  const [busyBooking, setBusyBooking] = useState(null);
  const [toast, setToast] = useState(null); // { type: "success" | "error", msg }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/bookings").then((r) => setBookings(r.data)).catch(() => {});
    api.get("/admin/reviews").then((r) => setReviews(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const events = stats?.upcoming_events || [];

  /* ---- chart: one bar per event (sold + pending), details on hover ---- */
  const chartData = useMemo(
    () =>
      events
        .filter((e) => e.has_tickets !== false && e.total_tickets > 0)
        .map((e) => {
          const mine = bookings.filter((b) => b.event_id === e.id);
          const pend = mine.filter((b) => lc(b.status) === "pending");
          const conf = mine.filter((b) => lc(b.status) === "confirmed");
          const sold = e.total_tickets - e.available_tickets;
          const pendingTickets = pend.reduce((s, b) => s + b.quantity, 0);
          const left = Math.max(0, e.available_tickets - pendingTickets);
          const pct = (n) => Math.round((n / e.total_tickets) * 1000) / 10;
          return {
            fullName: e.title,
            name: e.title.length > 12 ? e.title.slice(0, 12) + "…" : e.title,
            total: e.total_tickets,
            sold,
            pendingTickets,
            left,
            soldPct: pct(sold),
            pendingPct: pct(pendingTickets),
            leftPct: pct(left),
            bookings: mine.length,
            received: conf.reduce((s, b) => s + b.total_amount, 0),
            pendingAmount: pend.reduce((s, b) => s + b.total_amount, 0),
          };
        }),
    [events, bookings]
  );

  if (!stats) return <p className="text-gray-400 text-sm">Loading dashboard...</p>;

  const ticketsSold = events.reduce((n, e) => n + (e.has_tickets === false ? 0 : e.total_tickets - e.available_tickets), 0);
  const pendingList = bookings.filter((b) => lc(b.status) === "pending");
  const shownBookings = bookings.filter((b) => {
    if (bStatus !== "all" && lc(b.status) !== bStatus) return false;
    const q = bq.trim().toLowerCase();
    return !q || [b.user, b.buyer_email, b.buyer_phone, b.event].some((x) => (x || "").toLowerCase().includes(q));
  });

  const cards = [
    { label: "Total Events", value: stats.total_events, icon: CalendarDays, chip: "bg-blue-500", bg: "from-blue-50 to-white" },
    { label: "Registrations", value: stats.total_bookings, icon: Users, chip: "bg-emerald-500", bg: "from-emerald-50 to-white" },
    { label: "Tickets Sold", value: ticketsSold, icon: CheckCircle2, chip: "bg-indigo-600", bg: "from-indigo-50 to-white" },
    { label: "Participants", value: stats.total_users, icon: UserCircle2, chip: "bg-amber-500", bg: "from-amber-50 to-white" },
  ];

  /* ---------------- event create / edit ---------------- */
  const openCreate = () => setModal({ mode: "create" });
  const openEdit = (e) => setModal({ mode: "edit", event: e });

  const delReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      showToast("success", "Review deleted.");
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not delete review.");
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/events/${confirmDel.id}`);
      setConfirmDel(null);
      showToast("error", "Event deleted successfully!");
      load();
    } catch (err) {
      setConfirmDel(null);
      showToast("error", err.response?.data?.message || "Could not delete event.");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- payments ---------------- */
  const setBookingStatus = async (id, status) => {
    setBusyBooking(id);
    try {
      await api.put(`/admin/bookings/${id}/status`, { status });
      showToast(status === "confirmed" ? "success" : "error",
        status === "confirmed" ? "Payment approved successfully!" : "Payment rejected.");
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not update booking.");
    } finally {
      setBusyBooking(null);
    }
  };

  const eventBadge = (e) => {
    if (e.has_tickets === false) return { t: "No tickets", c: "bg-purple-100 text-purple-700" };
    if (e.available_tickets <= 0) return { t: "Sold Out", c: "bg-red-100 text-red-700" };
    if (e.event_date < today()) return { t: "Completed", c: "bg-blue-100 text-blue-700" };
    return { t: "Upcoming", c: "bg-green-100 text-green-700" };
  };

  const Proof = ({ b }) =>
    b.payment_proof_url ? (
      <img
        src={`${BACKEND_URL}${b.payment_proof_url}`} alt="payment proof"
        onClick={() => setProofUrl(`${BACKEND_URL}${b.payment_proof_url}`)}
        className="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
      />
    ) : (
      <span className="text-xs text-gray-300">—</span>
    );

  return (
    <div id="top">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0B1B5A]">Dashboard</h1>
          <p className="text-gray-500 mt-0.5">Welcome back, Admin 👋</p>
        </div>
        <button onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <Plus size={18} /> Create Event
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border border-gray-100 p-5 bg-gradient-to-br ${c.bg}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${c.chip}`}>
              <c.icon size={22} />
            </div>
            <p className="mt-4 text-gray-600 font-medium">{c.label}</p>
            <p className="text-3xl font-bold text-[#0B1B5A]">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart + Recent events */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 min-w-0">
          <h3 className="font-semibold text-[#0B1B5A] text-lg mb-1">Registration Analytics</h3>
          <p className="text-xs text-gray-400 mb-4">Tickets sold per event (% of tickets) — hover a bar for exact numbers</p>
          {chartData.length === 0 ? (
            <p className="text-xs text-gray-400">No ticketed events yet.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="soldPct" name="Sold" stackId="t" fill="#4F46E5" />
                    <Bar dataKey="pendingPct" name="Pending approval" stackId="t" fill="#818CF8" />
                    <Bar dataKey="leftPct" name="Available" stackId="t" fill="#E0E7FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {chartData.map((d) => (
                  <div key={d.fullName} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate pr-3">{d.fullName}</span>
                    <span className="font-semibold text-indigo-600 flex-shrink-0">
                      {d.sold} / {d.total} sold{d.pendingTickets ? ` (+${d.pendingTickets} pending)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div id="events" className="bg-white rounded-xl border border-gray-100 p-5 scroll-mt-4 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0B1B5A] text-lg">Recent Events</h3>
            <span className="text-xs text-gray-400">{events.length} Events</span>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {events.map((e) => {
              const b = eventBadge(e);
              return (
                <div key={e.id} className="flex items-center gap-3 border-b border-gray-50 pb-3">
                  <SafeImg src={e.image_url} alt={e.title} className="w-16 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Calendar size={12} />
                        {new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1"><Users size={12} />{e.has_tickets === false ? "No tickets" : `${e.total_tickets - e.available_tickets} / ${e.total_tickets} sold`}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.c}`}>{b.t}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => navigate(`/events/${e.id}`)}
                      className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md flex items-center gap-1">
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => openEdit(e)}
                      className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-md flex items-center gap-1">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setConfirmDel(e)}
                      className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md flex items-center gap-1">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No events available.</p>}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <GateCheckin />

      <div id="bookings" className="bg-white rounded-xl border border-gray-100 p-5 mt-6 scroll-mt-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-[#0B1B5A] text-lg">All Bookings &amp; Payments</h3>
          <div className="flex items-center gap-2">
            <input value={bq} onChange={(e) => setBq(e.target.value)} placeholder="Search user, email, event..."
              className="input-field !py-1.5 text-xs w-56" />
            <select value={bStatus} onChange={(e) => setBStatus(e.target.value)} className="input-field !py-1.5 text-xs w-auto">
              {["all", "pending", "confirmed", "failed", "cancelled"].map((x) => <option key={x} value={x}>{x === "all" ? "All status" : x}</option>)}
            </select>
            <span className="text-xs text-gray-400">{shownBookings.length} / {bookings.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-400 border-b border-gray-100">
                {["#", "User", "Event", "Qty", "Amount", "Method", "Payment / Delivery", "Screenshot", "Date", "Status", "Action"].map((h) => (
                  <th key={h} className="py-2 font-medium pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownBookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 align-top">
                  <td className="py-2.5 text-gray-500 pr-3">{b.id}</td>
                  <td className="py-2.5 pr-3">
                    <p className="text-gray-800">{b.user}</p>
                    <p className="text-xs text-gray-400">{b.buyer_email}</p>
                    <p className="text-xs text-gray-400">{b.buyer_phone}</p>
                  </td>
                  <td className="py-2.5 text-gray-800 pr-3">{b.event}{b.kind === "rsvp" && <span className="ml-1 text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">RSVP</span>}</td>
                  <td className="py-2.5 text-gray-600 pr-3">{b.quantity}{b.kind === "rsvp" ? " guests" : ""}</td>
                  <td className="py-2.5 text-gray-600 pr-3">{rs(b.total_amount)}</td>
                  <td className="py-2.5 text-gray-600 uppercase text-xs pr-3">{(b.payment_method || "").replace("_qr", " QR")}</td>
                  <td className="py-2.5 pr-3"><PayDetails b={b} /></td>
                  <td className="py-2.5 pr-3">
                    <Proof b={b} />
                    {b.duplicate_proof && <p className="text-[10px] font-semibold text-red-600 mt-1">Duplicate!</p>}
                  </td>
                  <td className="py-2.5 text-gray-500 text-xs pr-3">{b.created_at}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${BOOKING_BADGE[lc(b.status)] || "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {lc(b.status) === "pending" ? (
                      <div className="flex gap-1.5">
                        <button disabled={busyBooking === b.id} onClick={() => setBookingStatus(b.id, "confirmed")}
                          className="text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-md disabled:opacity-40">Approve</button>
                        <button disabled={busyBooking === b.id} onClick={() => setBookingStatus(b.id, "failed")}
                          className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-md disabled:opacity-40">Reject</button>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
              {shownBookings.length === 0 && (
                <tr><td colSpan={11} className="py-5 text-center text-gray-400">No bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending payments */}
      <div id="payments" className="bg-white rounded-xl border border-gray-100 p-5 mt-6 scroll-mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0B1B5A] text-lg">Pending Payments</h3>
          <span className="text-xs font-medium text-amber-600">{pendingList.length} pending</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                {["#", "Event", "User", "Qty", "Amount", "Method", "Payment / Delivery", "Screenshot", "Action"].map((h) => (
                  <th key={h} className="py-2 font-medium pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingList.map((b) => (
                <tr key={b.id} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-500 pr-3">{b.id}</td>
                  <td className="py-2.5 text-gray-800 pr-3">{b.event}</td>
                  <td className="py-2.5 text-gray-600 pr-3">{b.user}</td>
                  <td className="py-2.5 text-gray-600 pr-3">{b.quantity}</td>
                  <td className="py-2.5 text-gray-600 pr-3">{rs(b.total_amount)}</td>
                  <td className="py-2.5 text-gray-600 uppercase text-xs pr-3">{(b.payment_method || "").replace("_qr", " QR")}</td>
                  <td className="py-2.5 pr-3"><PayDetails b={b} /></td>
                  <td className="py-2.5 pr-3"><Proof b={b} />{b.duplicate_proof && <p className="text-[10px] font-semibold text-red-600 mt-1">Duplicate!</p>}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      <button disabled={busyBooking === b.id} onClick={() => setBookingStatus(b.id, "confirmed")}
                        className="text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-40">
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button disabled={busyBooking === b.id} onClick={() => setBookingStatus(b.id, "failed")}
                        className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-40">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingList.length === 0 && (
                <tr><td colSpan={9} className="py-5 text-center text-gray-400">No pending payments 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reviews & comments */}
      <div id="reviews" className="bg-white rounded-xl border border-gray-100 p-5 mt-6 scroll-mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0B1B5A] text-lg">Reviews &amp; Comments</h3>
          <span className="text-xs text-gray-400">{reviews.length} total</span>
        </div>
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {reviews.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-gray-50 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.user_name} <span className="text-gray-400 font-normal">on</span> {r.event_title}</p>
                  <div className="flex items-center gap-2 mt-0.5"><Stars value={r.rating} size={13} /><span className="text-xs text-gray-400">{r.created_at}</span></div>
                </div>
                <button onClick={() => delReview(r.id)} className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md flex items-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-line break-words">{r.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot viewer */}
      {proofUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setProofUrl(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProofUrl(null)} className="absolute -top-9 right-0 text-white"><X size={22} /></button>
            <img src={proofUrl} alt="Payment screenshot" className="w-full max-h-[85vh] object-contain rounded-xl bg-white" />
          </div>
        </div>
      )}

      {/* Create / Edit modal (shared form with validation) */}
      {modal && (
        <EventFormModal
          event={modal.mode === "edit" ? modal.event : null}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={(msg) => { setModal(null); showToast("success", msg); load(); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mt-4">Are you sure?</h3>
            <p className="text-sm text-gray-500 mt-1">
              "{confirmDel.title}" will be permanently deleted and cannot be recovered.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setConfirmDel(null)}
                className="border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
                {deleting ? "..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
