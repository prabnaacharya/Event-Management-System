import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Ticket, Clock, CheckCircle2, XCircle, ImageIcon, X, CalendarDays, MapPin, ChevronDown, ShieldCheck, MessageSquare, Heart, QrCode, Lock } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { BACKEND_URL } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import EventInfo from "../components/EventInfo";
import { ReviewForm } from "../components/Reviews";
import { Stars } from "../components/StarRating";
import AddToCalendar from "../components/AddToCalendar";
import EventCard from "../components/EventCard";
import { useWishlist } from "../context/WishlistContext";
import SafeImg from "../components/SafeImg";

const STATUS = {
  confirmed: { label: "Confirmed", cls: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  pending: { label: "Awaiting verification", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  failed: { label: "Rejected", cls: "bg-red-100 text-red-700", Icon: XCircle },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600", Icon: XCircle },
};

const METHOD = {
  esewa_qr: "eSewa (QR)",
  fonepay_qr: "Fonepay (QR)",
  cod: "Cash on Delivery",
  esewa: "eSewa",
  fonepay: "Fonepay",
  none: "No payment",
};

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [proof, setProof] = useState(null);
  const [open, setOpen] = useState({}); // booking id -> details expanded (open by default)
  const isOpen = (id) => open[id] !== false;
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "wishlist" ? "wishlist" : "bookings";
  const goBook = (eventId, quantity = 1) => navigate(`/checkout/${eventId}`, { state: { quantity } });
  const { events: wished } = useWishlist();
  const [qr, setQr] = useState(null); // booking whose QR is shown full screen
  const qrValue = (b) => `EMS:${b.ticket_code}:E${b.event_id}:Q${b.quantity}`;

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { redirectTo: "/my-bookings" } });
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    api.get("/bookings/my")
      .then((res) => setBookings(res.data))
      .catch(() => setError("Could not load your bookings. Is the backend running?"));
  }, [user]);

  const onReviewSaved = (eventId, data) =>
    setBookings((list) => list.map((b) => (b.event_id === eventId ? { ...b, my_review: data.review } : b)));

  const dateLabel = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";

  const countdown = (d) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d + "T00:00:00") - new Date(new Date().toDateString())) / 86400000);
    if (days < 0) return { t: "Event completed", c: "bg-gray-100 text-gray-500" };
    if (days === 0) return { t: "Today!", c: "bg-red-100 text-red-700" };
    if (days === 1) return { t: "Tomorrow", c: "bg-amber-100 text-amber-700" };
    return { t: `In ${days} days`, c: "bg-indigo-100 text-indigo-700" };
  };
  const mapUrl = (v) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v || "")}`;

  const confirmed = (bookings || []).filter((b) => b.status === "confirmed").length;
  const pending = (bookings || []).filter((b) => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-4xl mx-auto w-full px-6 py-8 flex-1">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Hi {user?.full_name}, here are all your tickets and payments.</p>

        <div className="flex gap-2 mt-5 border-b border-gray-200">
          {[["bookings", "My Bookings", Ticket, bookings?.length ?? 0], ["wishlist", "Wishlist", Heart, wished.length]].map(([key, label, Icon, n]) => (
            <button key={key} onClick={() => setParams(key === "bookings" ? {} : { tab: key })}
              className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px ${
                tab === key ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              <Icon size={15} /> {label}
              <span className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{n}</span>
            </button>
          ))}
        </div>

        {tab === "wishlist" && (
          <div className="mt-6 space-y-4">
            {wished.length === 0 && (
              <div className="card p-10 text-center">
                <Heart size={36} className="mx-auto text-gray-300" />
                <p className="text-gray-600 mt-3">Your wishlist is empty. Tap the heart on any event to save it here.</p>
                <Link to="/events" className="btn-primary inline-block mt-4">Browse events</Link>
              </div>
            )}
            {wished.map((e) => (
              <div key={e.id}>
                <EventCard event={e} layout="row" />
                <div className="flex gap-2 mt-2 pl-1">
                  {e.has_tickets === false ? (
                    <Link to={`/events/${e.id}`} className="text-xs font-medium text-white bg-primary px-3 py-1.5 rounded-lg">RSVP</Link>
                  ) : e.available_tickets > 0 ? (
                    <>
                      <button onClick={() => goBook(e.id, 1)} className="text-xs font-medium text-white bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg">Book now</button>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Sold out</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "bookings" && (
          <>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            ["Total", bookings?.length ?? 0, "text-gray-900"],
            ["Confirmed", confirmed, "text-green-600"],
            ["Pending", pending, "text-amber-600"],
          ].map(([label, n, cls]) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{n}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-6">{error}</p>}
        {!bookings && !error && <p className="text-gray-400 text-sm mt-8">Loading...</p>}

        {bookings && bookings.length === 0 && (
          <div className="card p-10 text-center mt-6">
            <Ticket size={36} className="mx-auto text-gray-300" />
            <p className="text-gray-600 mt-3">You have no bookings yet.</p>
            <Link to="/events" className="btn-primary inline-block mt-4">Browse events</Link>
          </div>
        )}

        <div className="space-y-4 mt-6">
          {(bookings || []).map((b) => {
            const st = STATUS[(b.status || "").toLowerCase()] || STATUS.pending;
            return (
              <div key={b.id} className="card p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <SafeImg src={b.event_image} alt={b.event} className="w-full sm:w-32 h-24 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <Link to={`/events/${b.event_id}`} className="font-semibold text-gray-900 hover:text-primary">{b.event}</Link>
                    <div className="flex items-center gap-2">
                      {b.status === "confirmed" && (
                        <button onClick={() => setQr(b)} className="text-xs font-medium text-white bg-primary hover:opacity-90 px-3 py-1 rounded-full flex items-center gap-1">
                          <QrCode size={12} /> Show QR
                        </button>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${st.cls}`}>
                        <st.Icon size={12} /> {st.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {b.quantity} {b.kind === "rsvp" ? "guest" : "ticket"}{b.quantity > 1 ? "s" : ""} · {b.kind === "rsvp" && b.total_amount === 0 ? "RSVP only" : `Rs. ${b.total_amount.toLocaleString()}`} · {METHOD[b.payment_method] || b.payment_method}
                  </p>
                  <p className="text-sm text-gray-700 mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <CalendarDays size={14} className="text-primary" />
                    <b>{dateLabel(b.event_date)}</b> · <b>{b.event_time}</b>
                    <span className="text-gray-400">·</span>
                    <MapPin size={14} className="text-primary" /> <b>{b.venue}</b>
                    {countdown(b.event_date) && (
                      <span className={`ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${countdown(b.event_date).c}`}>{countdown(b.event_date).t}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Booking #{b.id} · {b.created_at}</p>
                  {b.payment_ref && <p className="text-xs text-gray-500 mt-0.5">Paid Rs. {Number(b.paid_amount).toLocaleString()} · Txn ID: {b.payment_ref}</p>}
                  {b.delivery_address && (
                    <p className="text-xs text-gray-500 mt-0.5">Deliver to: {b.delivery_address}, {b.delivery_city}{b.delivery_landmark ? ` (near ${b.delivery_landmark})` : ""} · {b.buyer_phone}</p>
                  )}
                  {b.status === "pending" && (
                    <p className="text-xs text-amber-600 mt-2">
                      {b.payment_method === "cod"
                        ? "We'll confirm once your cash payment is received."
                        : "Our team is verifying your payment screenshot."}
                    </p>
                  )}
                  {b.status === "failed" && (
                    <p className="text-xs text-red-600 mt-2">
                      Payment was not accepted. <Link className="underline" to={`/events/${b.event_id}`}>Try again</Link>
                    </p>
                  )}
                </div>
                {b.payment_proof_url && (
                  <button onClick={() => setProof(`${BACKEND_URL}${b.payment_proof_url}`)}
                    className="self-start text-xs text-primary flex items-center gap-1 hover:underline">
                    <ImageIcon size={14} /> My screenshot
                  </button>
                )}
              </div>

              <button onClick={() => setOpen((o) => ({ ...o, [b.id]: !isOpen(b.id) }))}
                className="mt-3 text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                {isOpen(b.id) ? "Hide event details" : "Show time, venue, who is coming & food"}
                <ChevronDown size={16} className={isOpen(b.id) ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              {isOpen(b.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  {/* entry ticket (QR) */}
                  {b.status === "confirmed" ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                      <button onClick={() => setQr(b)} className="bg-white p-2 rounded-lg shadow-sm" title="Tap to enlarge">
                        <QRCodeSVG value={qrValue(b)} size={112} />
                      </button>
                      <div className="text-center sm:text-left">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 justify-center sm:justify-start">
                          <QrCode size={16} className="text-primary" /> {b.kind === "rsvp" ? "Your RSVP pass" : "Your entry ticket"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Show this QR code at the gate on the event day.</p>
                        <p className="text-sm font-mono font-bold text-gray-800 mt-2">{b.ticket_code}</p>
                        <p className="text-xs text-gray-500">{b.quantity} {b.kind === "rsvp" ? "guest" : "ticket"}{b.quantity > 1 ? "s" : ""} · tap the QR to enlarge</p>
                        {b.checked_in_count > 0 && (
                          <p className={`text-xs font-semibold mt-2 ${b.checked_in_count >= b.quantity ? "text-green-600" : "text-amber-600"}`}>
                            ✔ Entered: {b.checked_in_count} / {b.quantity}{b.checked_in_at ? ` (last scan ${b.checked_in_at})` : ""}
                          </p>
                        )}
                        <ol className="text-[11px] text-gray-500 mt-2 list-decimal list-inside space-y-0.5">
                          <li>On the event day open <b>My Bookings</b> on your phone.</li>
                          <li>Show this QR to the staff at the gate.</li>
                          <li>They scan it and let you in. Each QR works only once.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 flex items-center gap-2">
                      <Lock size={14} /> Your QR ticket appears here once the payment is confirmed by the admin.
                    </div>
                  )}

                  <AddToCalendar event={{ id: b.event_id, title: b.event, event_date: b.event_date, event_time: b.event_time, venue: b.venue }} />

                  {/* when & where */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Date &amp; time</p>
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <CalendarDays size={15} className="text-primary" /> {dateLabel(b.event_date)} · {b.event_time}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Venue</p>
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <MapPin size={15} className="text-primary" /> {b.venue}
                      </p>
                      <a href={mapUrl(b.venue)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Get directions</a>
                    </div>
                  </div>

                  {/* who is coming + food */}
                  <EventInfo event={b} />

                  {/* admin / organizer */}
                  <div className="bg-indigo-50 rounded-lg p-3 flex items-center gap-3">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">Organized by {b.organizer_name}</p>
                      <p className="text-xs text-gray-500">
                        Managed by EMS Admin{b.organizer_email ? " · " : ""}{b.organizer_email && <a href={`mailto:${b.organizer_email}`} className="text-primary hover:underline">{b.organizer_email}</a>}
                      </p>
                    </div>
                  </div>

                  {/* my review & comment */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                      <MessageSquare size={15} /> My review &amp; comment
                    </p>
                    {b.my_review && (
                      <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <Stars value={b.my_review.rating} />
                          <span className="text-xs text-gray-400">{b.my_review.created_at}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-line break-words">{b.my_review.comment}</p>
                      </div>
                    )}
                    {b.status === "confirmed" ? (
                      <ReviewForm compact eventId={b.event_id} existing={b.my_review}
                        onSaved={(d) => onReviewSaved(b.event_id, d)} />
                    ) : (
                      <p className="text-xs text-gray-400">
                        {b.my_review ? "" : "You can rate and comment once your booking is confirmed."}
                      </p>
                    )}
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>
      <Footer />

      {qr && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setQr(null)}>
          <div className="relative bg-white rounded-2xl p-6 text-center max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setQr(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            <p className="font-semibold text-gray-900 pr-6">{qr.event}</p>
            <p className="text-xs text-gray-500 mt-0.5">{dateLabel(qr.event_date)} · {qr.event_time}</p>
            <div className="mt-4 flex justify-center"><QRCodeSVG value={qrValue(qr)} size={230} /></div>
            <p className="font-mono font-bold text-gray-800 mt-3">{qr.ticket_code}</p>
            <p className="text-xs text-gray-500">{qr.quantity} {qr.kind === "rsvp" ? "guest" : "ticket"}{qr.quantity > 1 ? "s" : ""} · {qr.venue}</p>
            {qr.checked_in_count > 0 && <p className="text-xs font-semibold text-green-600 mt-2">✔ Entered: {qr.checked_in_count} / {qr.quantity}</p>}
          </div>
        </div>
      )}

      {proof && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setProof(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProof(null)} className="absolute -top-9 right-0 text-white"><X size={22} /></button>
            <img src={proof} alt="Payment screenshot" className="w-full max-h-[85vh] object-contain rounded-xl bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
