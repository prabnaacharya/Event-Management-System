import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEMO_AUTOFILL, ADMIN_DEMO } from "../config/app";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate(location.state?.redirectTo || "/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(form.email, form.password);
  };

  // click -> email + password get filled in, then the admin dashboard opens
  const adminDemo = () => {
    const demo = ADMIN_DEMO;
    setForm(demo);
    setShowPass(true);
    setTimeout(() => doLogin(demo.email, demo.password), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary text-white p-2 rounded-lg"><CalendarDays size={20} /></div>
            <span className="font-bold text-xl text-gray-900">EMS</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Login to your account</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="text-xs font-medium text-gray-500">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onFocus={() => { if (DEMO_AUTOFILL && !form.email && !form.password) setForm(ADMIN_DEMO); }}
            placeholder="Enter your email"
            className="input-field mt-1 mb-4"
          />

          <label className="text-xs font-medium text-gray-500">Password</label>
          <div className="relative mb-2">
            <input
              type={showPass ? "text" : "password"}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              className="input-field mt-1 pr-10"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex items-center justify-between mb-5 text-sm">
            <label className="flex items-center gap-1.5 text-gray-500">
              <input type="checkbox" className="accent-primary" /> Remember me
            </label>
            <span className="text-primary font-medium cursor-pointer">Forgot Password?</span>
          </div>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account? <Link to="/register" className="text-primary font-medium">Register</Link>
        </p>

        <button type="button" onClick={adminDemo} disabled={loading}
          className="w-full mt-4 border border-primary text-primary font-medium py-2.5 rounded-lg hover:bg-purple-50 disabled:opacity-60">
          Login as Admin (demo)
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">admin@ems.com / Admin@123</p>
      </div>
    </div>
  );
}
