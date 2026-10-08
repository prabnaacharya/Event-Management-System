import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Search, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ transparent = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className={`w-full z-20 ${
        transparent ? "absolute top-0 left-0 bg-transparent" : "bg-white border-b border-gray-100"
      }`}ara
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary text-white p-2 rounded-lg">
            <CalendarDays size={20} />
          </div>
          <div className={transparent ? "text-white" : "text-gray-900"}>
            <p className="font-bold text-lg leading-none">EMS</p>
            <p className="text-[11px] opacity-70 leading-none mt-0.5">Event Management System</p>
          </div>
        </Link>

        <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${transparent ? "text-white" : "text-gray-700"}`}>
          <Link to="/" className="hover:text-primary">Home</Link>
          <Link to="/events" className="hover:text-primary">Events</Link>
          <Link to="/categories" className="hover:text-primary">Categories</Link>
          <Link to="/about" className="hover:text-primary">About Us</Link>
          <Link to="/contact" className="hover:text-primary">Contact</Link>
          {user && (
            <>
              <Link to="/my-bookings" className="hover:text-primary font-medium">My Bookings</Link>
              <Link to="/my-bookings?tab=wishlist" className="hover:text-primary font-medium">Wishlist</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <button className={`p-2 rounded-full hover:bg-gray-100 ${transparent ? "text-white hover:bg-white/10" : "text-gray-600"}`}>
            <Search size={18} />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <button onClick={() => navigate("/admin")} className="btn-outline text-sm py-2 px-4">
                  Dashboard
                </button>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <User size={16} /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className={`text-sm font-medium px-3 py-2 ${transparent ? "text-white" : "text-gray-700"}`}>
                Login
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
