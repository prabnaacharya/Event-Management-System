import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Ticket, Wallet, LogOut, User, ChevronDown, MessageSquare, ScanLine } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// id = section id inside Dashboard.jsx (clicking scrolls to it)
const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, id: "top" },
  { label: "Events", icon: CalendarDays, id: "events" },
  { label: "Gate Check-in", icon: ScanLine, id: "checkin" },
  { label: "Bookings", icon: Ticket, id: "bookings" },
  { label: "Payments", icon: Wallet, id: "payments" },
  { label: "Reviews", icon: MessageSquare, id: "reviews" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("top");

  const go = (id) => {
    setActive(id);
    if (id === "top") document.getElementById("admin-main")?.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="h-screen flex bg-[#F5F7FF] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0B1B5A] text-white flex flex-col flex-shrink-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="bg-indigo-500 text-white p-2 rounded-lg"><CalendarDays size={20} /></div>
          {/* Brand name: change "Eventify" here */}
          <p className="text-xl font-bold">EMS</p>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1.5">
          {NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active === item.id ? "bg-indigo-500 text-white" : "text-indigo-100/80 hover:bg-white/10"
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-3 px-6 py-5 text-sm text-indigo-100/80 hover:text-white"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
              <User size={18} />
            </div>
            <span className="text-sm font-medium text-gray-800">{user?.full_name || "Admin"}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </div>
        </header>
        <main id="admin-main" className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
