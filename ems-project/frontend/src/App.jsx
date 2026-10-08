import Categories from "./pages/Categories";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Checkout from "./pages/Checkout";
import PaymentResult from "./pages/PaymentResult";
import MyBookings from "./pages/MyBookings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import { useAuth } from "./context/AuthContext";
import { START_AT_LOGIN } from "./config/app";

// Opening the site (/) goes to the Login page first when nobody is logged in
function StartRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (START_AT_LOGIN && !user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StartRoute><Home /></StartRoute>} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetails />} />
      <Route path="/checkout/:id" element={<Checkout />} />
      <Route path="/payment/result" element={<PaymentResult />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/categories" element={<Categories/>} />
      <Route path="/contact" element={<Contact />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
