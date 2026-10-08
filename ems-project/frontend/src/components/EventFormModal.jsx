import { useState } from "react";
import { X } from "lucide-react";
import api from "../api/axios";

// tomorrow in the user's own time zone (YYYY-MM-DD). Today and past dates are NOT allowed.
export const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "6:00 PM" -> "18:00" (for <input type="time">)
const to24 = (t) => {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(t || "");
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};

const EMPTY = {
  title: "", description: "", image_url: "", category_id: "", venue: "",
  event_date: "", event_time: "", price: "", total_tickets: 100, has_tickets: true,
  organizer_name: "", organizer_email: "", performers: "", food_details: "",
};

const LINEUP_LABEL = {
  Concerts: "Who is coming? (singers / bands) — one per line",
  Conferences: "Speakers & sessions — one per line",
  Workshops: "Who is guiding? — one per line",
  Sports: "Teams / players — one per line",
  Festivals: "Who is performing? — one per line",
  Weddings: "Family / bride & groom / music — one per line",
};

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/** Create / edit event form used by the admin Dashboard and the Events page. */
export default function EventFormModal({ event, categories, onClose, onSaved }) {
  const editing = !!event;
  const [form, setForm] = useState(
    editing
      ? {
          title: event.title || "", description: event.description || "", image_url: event.image_url || "",
          category_id: event.category_id || "", venue: event.venue || "", event_date: event.event_date || "",
          event_time: to24(event.event_time), price: event.price ?? "", total_tickets: event.total_tickets || 100,
          has_tickets: event.has_tickets !== false, organizer_name: event.organizer_name || "",
          organizer_email: event.organizer_email || "", performers: event.performers || "",
          food_details: event.food_details || "",
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);

  const catName = categories.find((c) => String(c.id) === String(form.category_id))?.name;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const onCategory = (e) => {
    const id = e.target.value;
    const name = categories.find((c) => String(c.id) === String(id))?.name;
    setForm((f) => ({ ...f, category_id: id, has_tickets: name === "Weddings" ? false : f.has_tickets }));
    setErrors((x) => ({ ...x, category_id: undefined }));
  };

  const validate = () => {
    const e = {};
    const t = form.title.trim();
    if (t.length < 3) e.title = "Title must be at least 3 characters.";
    if (t.length > 150) e.title = "Title cannot be longer than 150 characters.";
    if (!form.category_id) e.category_id = "Please select a category.";
    if (form.venue.trim().length < 3) e.venue = "Please enter the venue.";

    const dateChanged = !editing || form.event_date !== event.event_date;
    if (!form.event_date) e.event_date = "Please choose a date.";
    else if (dateChanged && form.event_date < tomorrow())
      e.event_date = "Choose a future date. Today's and past dates are not allowed.";

    if (!form.event_time) e.event_time = "Please choose the event time.";

    if (!form.has_tickets && form.price !== "" && (Number.isNaN(Number(form.price)) || Number(form.price) < 0)) e.price = "Enter a valid amount (0 or more).";
    if (form.has_tickets) {
      const p = Number(form.price);
      if (form.price === "" || Number.isNaN(p) || p < 0) e.price = "Enter a valid price (0 or more).";
      const n = Number(form.total_tickets);
      if (!Number.isInteger(n) || n < 1) e.total_tickets = "Tickets must be at least 1.";
      if (editing && Number.isInteger(n)) {
        const sold = event.total_tickets - event.available_tickets;
        if (n < sold) e.total_tickets = `Cannot be less than ${sold} (already sold/reserved).`;
      }
    }
    if (form.organizer_email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.organizer_email.trim()))
      e.organizer_email = "Enter a valid email address.";
    if (form.performers.length > 2000) e.performers = "Too long (max 2000 characters).";
    if (form.food_details.length > 2000) e.food_details = "Too long (max 2000 characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerErr("");
    if (!validate()) return;
    const payload = {
      ...form,
      title: form.title.trim(),
      venue: form.venue.trim(),
      category_id: Number(form.category_id),
      price: Number(form.price) || 0,
      total_tickets: form.has_tickets ? Number(form.total_tickets) : 0,
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/events/${event.id}`, payload);
      else await api.post("/admin/events", payload);
      onSaved(editing ? "Event updated successfully!" : "Event added successfully!");
    } catch (err) {
      setServerErr(err.response?.data?.message || "Could not save event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0B1B5A] text-lg">{editing ? "Edit Event" : "Create New Event"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-3">
          <Field label="Event Name *" error={errors.title}>
            <input name="title" value={form.title} onChange={handleChange} className="input-field" placeholder="e.g. Kathmandu Food Festival" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *" error={errors.category_id}>
              <select name="category_id" value={form.category_id} onChange={onCategory} className="input-field">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Venue *" error={errors.venue}>
              <input name="venue" value={form.venue} onChange={handleChange} className="input-field" placeholder="e.g. Dashrath Stadium" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date * (from tomorrow)" error={errors.event_date}>
              <input name="event_date" type="date" value={form.event_date} onChange={handleChange} min={tomorrow()} className="input-field" />
            </Field>
            <Field label="Time *" error={errors.event_time}>
              <input name="event_time" type="time" value={form.event_time} onChange={handleChange} className="input-field" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={form.has_tickets} onChange={(e) => set("has_tickets", e.target.checked)} />
            Sell tickets for this event
            <span className="text-xs text-gray-400">(untick for wedding / invitation events)</span>
          </label>

          {!form.has_tickets && (
            <Field label="Amount per guest (Rs.) — optional, 0 = guest decides the gift" error={errors.price}>
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} className="input-field" placeholder="0" />
            </Field>
          )}

          {form.has_tickets && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (Rs.) *" error={errors.price}>
                <input name="price" type="number" min="0" value={form.price} onChange={handleChange} className="input-field" placeholder="1500" />
              </Field>
              <Field label="Total Tickets *" error={errors.total_tickets}>
                <input name="total_tickets" type="number" min="1" value={form.total_tickets} onChange={handleChange} className="input-field" />
              </Field>
            </div>
          )}

          <Field label="Image URL / asset file name">
            <input name="image_url" value={form.image_url} onChange={handleChange} className="input-field" placeholder="rock.jpg or https://..." />
          </Field>

          <Field label="Description">
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="input-field" placeholder="Short description" />
          </Field>

          <Field label={LINEUP_LABEL[catName] || "Who is coming? (artists / speakers / guests) — one per line"} error={errors.performers}>
            <textarea name="performers" value={form.performers} onChange={handleChange} rows={3} className="input-field"
              placeholder={"Nepathya\nThe Edge Band\nDJ Sanjay"} />
          </Field>

          <Field label="Food & drinks available — one per line" error={errors.food_details}>
            <textarea name="food_details" value={form.food_details} onChange={handleChange} rows={3} className="input-field"
              placeholder={"Momo stall\nBBQ & sekuwa\nTea & coffee"} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Organizer Name">
              <input name="organizer_name" value={form.organizer_name} onChange={handleChange} className="input-field" />
            </Field>
            <Field label="Organizer Email" error={errors.organizer_email}>
              <input name="organizer_email" value={form.organizer_email} onChange={handleChange} className="input-field" />
            </Field>
          </div>

          {serverErr && <p className="text-sm text-red-500">{serverErr}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg disabled:opacity-60">
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
