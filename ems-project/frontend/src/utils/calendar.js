// Helpers for "Add to Calendar" (Google Calendar link + downloadable .ics file)
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

/** ev = { id, title, event_date: "YYYY-MM-DD", event_time: "6:00 PM", venue, description } */
export function eventTimes(ev, hours = 3) {
  const [y, m, d] = String(ev.event_date).split("-").map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((ev.event_time || "").trim());
  let h = 9, min = 0;
  if (t) {
    h = Number(t[1]); min = Number(t[2]);
    const ap = (t[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
  }
  const start = new Date(y, m - 1, d, h, min);
  return { start, end: new Date(start.getTime() + hours * 3600 * 1000) };
}

export function googleCalendarUrl(ev) {
  const { start, end } = eventTimes(ev);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${ev.description || ev.title}\n\nBooked via EMS`,
    location: ev.venue || "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function downloadIcs(ev) {
  const { start, end } = eventTimes(ev);
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EMS//Event Management System//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:ems-event-${ev.id}@ems.local`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(ev.venue)}`,
    `DESCRIPTION:${esc((ev.description || ev.title) + "\nBooked via EMS")}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(ev.title)} is tomorrow`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(ev.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
