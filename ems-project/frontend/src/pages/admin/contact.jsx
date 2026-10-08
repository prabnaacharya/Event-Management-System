import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Phone, MapPin, Send } from "lucide-react";
 
export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
 
  const handleSubmit = (e) => {
    e.preventDefault();
    // No backend endpoint for contact yet — this just confirms receipt in the UI.
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  };
 
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
 
      <section className="bg-primary text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Have a question or need help with a booking? We'd love to hear from you.
          </p>
        </div>
      </section>
 
      <section className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg"><Mail size={18} /></div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">support@ems.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg"><Phone size={18} /></div>
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p className="text-sm text-gray-600">+977-1-4123456</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg"><MapPin size={18} /></div>
              <div>
                <p className="font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">Kathmandu, Nepal</p>
              </div>
            </div>
          </div>
        </div>
 
        <div className="card p-6">
          {sent && (
            <div className="mb-4 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
              Thanks! Your message has been received.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="input-field mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="input-field mt-1"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                required
                rows={4}
                className="input-field mt-1"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={16} /> Send Message
            </button>
          </form>
        </div>
      </section>
 
      <Footer />
    </div>
  );
}
 