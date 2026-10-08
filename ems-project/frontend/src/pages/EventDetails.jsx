import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Clock, CalendarDays, MapPin, Minus, Plus, Facebook, Twitter, MessageCircle, Mail, QrCode, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SafeImg from "../components/SafeImg";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import EventInfo from "../components/EventInfo";
import Reviews from "../components/Reviews";
import { Stars } from "../components/StarRating";
import WishlistButton from "../components/WishlistButton";
import AddToCalendar from "../components/AddToCalendar";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [myBooking, setMyBooking] = useState(null); // holds the user's existing booking for this event, if any
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [rating, setRating] = useState(null); // live summary from the Reviews block
  useEffect(() => {
    api.get(`/events/${id}`).then((res) => setEvent(res.data)).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!user) {
      setCheckingBooking(false);
      return;
    }
    api
      .get("/bookings/my")
      .then((res) => {
        const existing = (res.data || []).find(
          (b) =>
            String(b.event_id) === String(id) &&
            ["confirmed", "pending"].includes((b.status || "").toLowerCase())
        );
        setMyBooking(existing || null);
      })
      .catch(() => {})
      .finally(() => setCheckingBooking(false));
  }, [id, user]);

  const isConfirmed = (myBooking?.status || "").toLowerCase() === "confirmed";

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="text-center text-gray-400 mt-20">Loading event...</p>
      </div>
    );
  }

  const dateLabel = new Date(event.event_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const hasTickets = event.has_tickets !== false;
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const bookingClosed = event.event_date <= todayStr; // today / past events cannot be booked
  const avg = rating ? rating.average : event.avg_rating;
  const cnt = rating ? rating.count : event.review_count;

  const handleBookNow = () => {
    if (!user) {
      navigate("/login", { state: { redirectTo: `/checkout/${id}`, quantity } });
      return;
    }
    navigate(`/checkout/${id}`, { state: { quantity } });
  };

  const checkoutUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkout/${id}`
      : "";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        <p className="text-sm text-gray-400 mb-4">
          <Link to="/" className="hover:text-primary">Home</Link> / <Link to="/events" className="hover:text-primary">Events</Link> / {event.title}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="relative">
              <SafeImg src={event.image_url} alt={event.title} className="w-full h-72 object-cover rounded-xl" />
              <span className="absolute top-3 left-3 bg-primary text-white text-xs font-medium px-2.5 py-1 rounded">
                {event.category}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 mt-5">
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <WishlistButton eventId={event.id} label className="flex-shrink-0" />
            </div>
            <a href="#reviews" className="inline-flex items-center gap-2 mt-1 text-sm text-gray-500">
              <Stars value={avg} size={15} /> {cnt ? `${Number(avg).toFixed(1)} (${cnt} review${cnt > 1 ? "s" : ""})` : "No reviews yet"}
            </a>
            <AddToCalendar event={event} className="mt-3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1"><CalendarDays size={13} /> Date</p>
                <p className="font-bold text-gray-900 mt-1">{dateLabel}</p>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1"><Clock size={13} /> Time</p>
                <p className="font-bold text-gray-900 mt-1">{event.event_time}</p>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1"><MapPin size={13} /> Location</p>
                <p className="font-bold text-gray-900 mt-1 break-words">{event.venue}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`} target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline">Get directions</a>
              </div>
            </div>

            {/* Registration status banner — only shown once we've checked */}
            {!checkingBooking && myBooking && isConfirmed && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} />
                You're registered for this event ({myBooking.quantity} {hasTickets ? "ticket" : "guest"}{myBooking.quantity > 1 ? "s" : ""})
              </div>
            )}
            {!checkingBooking && myBooking && !isConfirmed && (
              <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-lg">
                Your payment is being verified. You'll be registered once it's confirmed.
              </div>
            )}

            <h3 className="font-semibold text-gray-800 mt-6 mb-2">About the Event</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>

            <EventInfo event={event} className="mt-6" />

            <h3 className="font-semibold text-gray-800 mt-6 mb-3">Organizer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {event.organizer_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{event.organizer_name}</p>
                <p className="text-xs text-gray-400">{event.organizer_email}</p>
              </div>
            </div>

            <Reviews eventId={event.id} onSummary={setRating} />
          </div>

          {/* Ticket sidebar */}
          {!hasTickets ? (
            <aside className="card p-5 h-fit sticky top-6">
              <h4 className="font-semibold text-gray-800 mb-1">RSVP</h4>
              <p className="text-sm text-gray-500 mb-3">No tickets for this event. Let the family know you are coming{Number(event.price) > 0 ? "" : ", and send a gift if you wish"}.</p>
              <p className="text-xs text-gray-500">Date &amp; time</p>
              <p className="text-sm font-semibold text-gray-800 mb-3">{dateLabel} · {event.event_time}</p>
              <p className="text-xs text-gray-500">Venue</p>
              <p className="text-sm font-semibold text-gray-800 mb-3">{event.venue}</p>
              {Number(event.price) > 0 && (<>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-bold text-primary mb-3">Rs. {Number(event.price).toLocaleString()} <span className="text-xs font-normal text-gray-400">per guest</span></p>
              </>)}
              {myBooking ? (
                <div className={`text-sm font-medium px-4 py-3 rounded-lg text-center mb-2 flex items-center justify-center gap-2 ${
                  isConfirmed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                }`}>
                  <CheckCircle2 size={16} /> {isConfirmed ? "You have RSVP'd" : "Payment pending approval"}
                </div>
              ) : bookingClosed ? (
                <div className="text-sm font-medium px-4 py-3 rounded-lg text-center mb-2 bg-gray-100 text-gray-500">RSVP closed</div>
              ) : (
                <button onClick={handleBookNow} className="btn-primary w-full mb-2">{Number(event.price) > 0 ? "RSVP & Pay" : "RSVP / Send gift"}</button>
              )}
              <p className="text-xs text-gray-500 mt-3">Contact organizer</p>
              <p className="text-sm font-semibold text-gray-800">{event.organizer_name}</p>
              <p className="text-xs text-gray-400">{event.organizer_email}</p>
            </aside>
          ) : (
          <aside className="card p-5 h-fit sticky top-6">
            <h4 className="font-semibold text-gray-800 mb-1">Ticket Information</h4>
            <p className="text-2xl font-bold text-primary">Rs. {event.price.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mb-4">Per Ticket</p>

            <p className="text-xs text-gray-500">Available Tickets</p>
            <p className="text-sm font-semibold text-gray-800 mb-4">
              {event.available_tickets} / {event.total_tickets}
            </p>

            {myBooking ? (
              <div className={`text-sm font-medium px-4 py-3 rounded-lg text-center mb-2 flex items-center justify-center gap-2 ${
                isConfirmed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}>
                <CheckCircle2 size={16} /> {isConfirmed ? "Already Registered" : "Payment Pending"}
              </div>
            ) : bookingClosed || event.available_tickets <= 0 ? (
              <div className="text-sm font-medium px-4 py-3 rounded-lg text-center mb-2 bg-gray-100 text-gray-500">
                {event.available_tickets <= 0 ? "Sold out" : "Booking closed"}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Quantity</p>
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-medium w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(event.available_tickets, q + 1))}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={handleBookNow} className="btn-primary w-full mb-2">Book Now</button>
              </>
            )}
            <WishlistButton eventId={event.id} label className="w-full justify-center" />

            {/* QR Code section */}
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-2 flex items-center justify-center gap-1">
                <QrCode size={14} /> Scan to Book
              </p>
              <div className="mx-auto w-28 h-28 border border-gray-100 rounded-lg p-1.5 flex items-center justify-center">
                <QRCodeSVG value={checkoutUrl} size={100} />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Share this event</p>
              <div className="flex gap-3 text-gray-400">
                <Facebook size={18} className="hover:text-primary cursor-pointer" />
                <Twitter size={18} className="hover:text-primary cursor-pointer" />
                <MessageCircle size={18} className="hover:text-primary cursor-pointer" />
                <Mail size={18} className="hover:text-primary cursor-pointer" />
              </div>
            </div>
          </aside>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}



