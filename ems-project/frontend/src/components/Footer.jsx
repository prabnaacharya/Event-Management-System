import { CalendarDays, Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-primary text-white p-2 rounded-lg">
              <CalendarDays size={18} />
            </div>
            <span className="text-white font-bold text-lg">EMS</span>
          </div>
          <p className="text-sm text-gray-400">
            Discover, book, and enjoy the best events happening around Kathmandu.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-primary">Home</a></li>
            <li><a href="/events" className="hover:text-primary">Events</a></li>
            <li><a href="#about" className="hover:text-primary">About Us</a></li>
            <li><a href="#contact" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Categories</h4>
          <ul className="space-y-2 text-sm">
            <li>Concerts</li>
            <li>Conferences</li>
            <li>Workshops</li>
            <li>Sports</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Follow Us</h4>
          <div className="flex gap-3">
            <Facebook size={18} className="hover:text-primary cursor-pointer" />
            <Twitter size={18} className="hover:text-primary cursor-pointer" />
            <Instagram size={18} className="hover:text-primary cursor-pointer" />
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center text-xs text-gray-500 py-4">
        © {new Date().getFullYear()} EMS - Event Management System. All rights reserved.
      </div>
    </footer>
  );
}
