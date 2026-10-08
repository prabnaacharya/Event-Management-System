import { CalendarPlus, Download } from "lucide-react";
import { googleCalendarUrl, downloadIcs } from "../utils/calendar";

/** Two small buttons: open Google Calendar, or download an .ics file (works with Apple/Outlook/phone calendars). */
export default function AddToCalendar({ event, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg">
        <CalendarPlus size={14} /> Add to Google Calendar
      </a>
      <button type="button" onClick={() => downloadIcs(event)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
        <Download size={14} /> Download .ics
      </button>
    </div>
  );
}
