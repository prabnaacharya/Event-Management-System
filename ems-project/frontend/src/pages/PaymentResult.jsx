import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const CONTENT = {
  success: {
    Icon: CheckCircle2,
    color: "text-green-600",
    title: "Payment successful",
    text: "You're registered for this event.",
  },
  cod: {
    Icon: Clock,
    color: "text-amber-600",
    title: "Order placed",
    text: "You'll be registered once we confirm your cash payment.",
  },
  qr: {
    Icon: Clock,
    color: "text-amber-600",
    title: "Payment submitted",
    text: "We'll verify your payment. You'll be registered once it's confirmed.",
  },
  pending: {
    Icon: Clock,
    color: "text-amber-600",
    title: "Payment being verified",
    text: "We couldn't confirm your payment yet. This page updates once it's verified.",
  },
  failed: {
    Icon: XCircle,
    color: "text-red-600",
    title: "Payment failed",
    text: "No money was booked for this event. You can try again.",
  },
};

export default function PaymentResult() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const status = params.get("status");
  const eventId = params.get("event");
  const { Icon, color, title, text } = CONTENT[status] || CONTENT.failed;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-sm">
          <Icon size={48} className={`mx-auto ${color}`} />
          <h1 className="text-xl font-bold text-gray-900 mt-4">{title}</h1>
          <p className="text-sm text-gray-500 mt-2">{text}</p>
          <div className="flex gap-3 justify-center mt-6">
            {status !== "failed" ? (
              <Link to="/my-bookings" className="btn-primary">My Bookings</Link>
            ) : (
              eventId && <Link to={`/events/${eventId}`} className="btn-primary">Try again</Link>
            )}
            {user?.role === "admin" ? (
              <Link to="/admin" className="btn-outline">Go to Dashboard</Link>
            ) : (
              <Link to="/events" className="btn-outline">All events</Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
 
 