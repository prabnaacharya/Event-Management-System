import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trash2, MessageSquare } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Stars, StarInput } from "./StarRating";

const MAX = 1000;
const MIN = 3;

/** Write-a-review form (used on the event page and in My Bookings). */
export function ReviewForm({ eventId, existing, onSaved, compact = false }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");

  useEffect(() => {
    setRating(existing?.rating || 0);
    setComment(existing?.comment || "");
  }, [existing?.id, existing?.rating, existing?.comment]);

  const validate = () => {
    const e = {};
    if (!rating) e.rating = "Please select a star rating.";
    const c = comment.trim();
    if (c.length < MIN) e.comment = `Comment must be at least ${MIN} characters.`;
    if (c.length > MAX) e.comment = `Comment cannot be longer than ${MAX} characters.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerErr(""); setOk("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await api.post(`/events/${eventId}/reviews`, { rating, comment: comment.trim() });
      setOk(existing ? "Your review was updated." : "Thanks! Your review was posted.");
      onSaved?.(res.data);
    } catch (err) {
      setServerErr(err.response?.data?.message || "Could not post your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={compact ? "space-y-2" : "space-y-3"}>
      <StarInput value={rating} onChange={(n) => { setRating(n); setErrors((x) => ({ ...x, rating: undefined })); }} size={compact ? 22 : 26} />
      {errors.rating && <p className="text-xs text-red-500">{errors.rating}</p>}
      <textarea
        value={comment}
        onChange={(e) => { setComment(e.target.value); setErrors((x) => ({ ...x, comment: undefined })); }}
        rows={compact ? 2 : 3}
        maxLength={MAX + 50}
        placeholder="Write your comment about this event..."
        className="input-field"
      />
      <div className="flex items-center justify-between text-xs">
        <span className="text-red-500">{errors.comment}</span>
        <span className={comment.length > MAX ? "text-red-500" : "text-gray-400"}>{comment.length}/{MAX}</span>
      </div>
      {serverErr && <p className="text-xs text-red-500">{serverErr}</p>}
      {ok && <p className="text-xs text-green-600">{ok}</p>}
      <button type="submit" disabled={saving} className="btn-primary text-sm py-2 disabled:opacity-60">
        {saving ? "Posting..." : existing ? "Update review" : "Post review"}
      </button>
    </form>
  );
}

/** Full reviews block for the event details page */
export default function Reviews({ eventId, onSummary }) {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], average: 0, count: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);

  const apply = useCallback((d) => {
    const next = { reviews: d.reviews, average: d.average, count: d.count, breakdown: d.breakdown };
    setData(next);
    onSummary?.(next);
  }, [onSummary]);

  useEffect(() => {
    setLoading(true);
    api.get(`/events/${eventId}/reviews`).then((r) => apply(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = user ? data.reviews.find((r) => r.user_id === user.id) : null;

  const remove = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await api.delete(`/reviews/${id}`);
      apply(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete the review.");
    }
  };

  return (
    <section className="mt-8" id="reviews">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <MessageSquare size={16} /> Reviews &amp; Comments
      </h3>

      {/* summary */}
      <div className="card p-4 flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="text-center sm:w-32">
          <p className="text-4xl font-bold text-gray-900">{data.count ? data.average.toFixed(1) : "–"}</p>
          <Stars value={data.average} size={16} />
          <p className="text-xs text-gray-400 mt-1">{data.count} review{data.count !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = data.breakdown?.[String(n)] || 0;
            const pct = data.count ? (c / data.count) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3">{n}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-5 text-right">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* write review */}
      <div className="card p-4 mt-4">
        <p className="text-sm font-medium text-gray-800 mb-2">{mine ? "Your review" : "Write a review"}</p>
        {user ? (
          user.role === "admin" ? (
            <p className="text-sm text-gray-500">Admins can read and delete reviews, but cannot post one.</p>
          ) : (
            <ReviewForm eventId={eventId} existing={mine} onSaved={apply} />
          )
        ) : (
          <p className="text-sm text-gray-500">
            Please <Link to="/login" state={{ redirectTo: `/events/${eventId}` }} className="text-primary underline">log in</Link> to rate and comment.
          </p>
        )}
      </div>

      {/* list */}
      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-gray-400">Loading reviews...</p>}
        {!loading && data.reviews.length === 0 && (
          <p className="text-sm text-gray-400">No reviews yet. Be the first to comment!</p>
        )}
        {data.reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {r.user_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.user_name}{user && r.user_id === user.id && <span className="text-xs text-primary ml-1">(you)</span>}</p>
                  <p className="text-xs text-gray-400">{r.created_at}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stars value={r.rating} />
                {user && (user.id === r.user_id || user.role === "admin") && (
                  <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-line break-words">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
