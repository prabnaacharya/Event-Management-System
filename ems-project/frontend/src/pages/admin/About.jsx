import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CalendarDays, Users, Award, Target } from "lucide-react";
 
export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
 
      <section className="bg-primary text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">About EMS</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            We make discovering, booking, and managing events simple —
            connecting people with unforgettable experiences across Nepal.
          </p>
        </div>
      </section>
 
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              EMS (Event Management System) was built to solve a simple problem:
              finding and booking great events shouldn't be complicated. Whether
              it's a concert, a conference, a workshop, or a local festival, we
              bring everything into one easy-to-use platform.
            </p>
            <p className="text-gray-600 leading-relaxed">
              From ticket booking to event management for organizers, EMS
              handles the details so you can focus on the experience.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: CalendarDays, label: "Events Hosted", value: "500+" },
              { icon: Users, label: "Happy Users", value: "10K+" },
              { icon: Award, label: "Categories", value: "5+" },
              { icon: Target, label: "Cities Covered", value: "20+" },
            ].map((stat, i) => (
              <div key={i} className="card p-6 text-center">
                <stat.icon className="mx-auto text-primary mb-2" size={28} />
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
 
      <section className="bg-white py-14 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Easy Booking", desc: "Browse and book tickets for any event in just a few clicks." },
              { title: "Secure Payments", desc: "Multiple payment options including eSewa, Khalti, and Cash on Delivery." },
              { title: "Event Management", desc: "Organizers can create, manage, and track events with a dedicated admin dashboard." },
            ].map((item, i) => (
              <div key={i} className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
 
      <Footer />
    </div>
  );
}