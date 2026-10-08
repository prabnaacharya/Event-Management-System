import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ScanLine, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, Users } from "lucide-react";
import api from "../api/axios";

/**
 * Gate check-in for the admin.
 *  - scan the user's QR with the camera, OR type / paste the ticket code, OR use a USB barcode scanner
 *    (it types the code into the box and presses Enter).
 *  - shows who the ticket belongs to and lets the admin admit the people. A used QR is rejected.
 */
export default function GateCheckin() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null); // response of /admin/checkin/lookup or /admin/checkin
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok" | "err", text }
  const [camera, setCamera] = useState(false);
  const [camErr, setCamErr] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  };
  useEffect(() => stopCamera, []); // stop camera when leaving the page

  const lookup = async (raw) => {
    const c = (raw ?? code).trim();
    if (!c) return;
    setBusy(true); setMsg(null);
    try {
      const res = await api.post("/admin/checkin/lookup", { code: c });
      setResult(res.data);
      setCount(res.data.booking?.remaining || 1);
    } catch (err) {
      setResult(null);
      setMsg({ type: "err", text: err.response?.data?.message || "Could not check this ticket." });
    } finally { setBusy(false); }
  };

  const startCamera = async () => {
    setCamErr(""); setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamera(true);
      requestAnimationFrame(async () => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          const video = videoRef.current;
          if (!video) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(img.data, img.width, img.height);
            if (found?.data) {
              stopCamera();
              setCode(found.data);
              lookup(found.data);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      });
    } catch {
      setCamErr("Camera could not start. Allow camera permission (works on localhost / https), or type the ticket code instead.");
      stopCamera();
    }
  };

  const admit = async (force = false) => {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post("/admin/checkin", { code, count: Number(count), force });
      setResult(res.data);
      setMsg({ type: "ok", text: `Admitted ${res.data.admitted} ${res.data.admitted > 1 ? "people" : "person"}. Let them in!` });
    } catch (err) {
      const d = err.response?.data;
      if (err.response?.status === 409 && d?.needs_force) {
        if (window.confirm(`${d.message}\n\nAdmit anyway?`)) return admit(true);
      } else {
        setMsg({ type: "err", text: d?.message || "Could not admit." });
      }
    } finally { setBusy(false); }
  };

  const b = result?.booking;
  const ok = result?.valid;

  return (
    <div id="checkin" className="bg-white rounded-xl border border-gray-100 p-5 mt-6 scroll-mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-semibold text-[#0B1B5A] text-lg flex items-center gap-2"><ScanLine size={18} /> Gate Check-in</h3>
        <button onClick={camera ? stopCamera : startCamera}
          className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          {camera ? <><CameraOff size={15} /> Stop camera</> : <><Camera size={15} /> Scan QR with camera</>}
        </button>
      </div>

      {camera && (
        <div className="relative max-w-sm mx-auto mb-4 rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} playsInline muted className="w-full" />
          <div className="absolute inset-8 border-2 border-white/80 rounded-lg pointer-events-none" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      {camErr && <p className="text-xs text-red-500 mb-3">{camErr}</p>}

      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
          placeholder="Scan with a barcode scanner, or type the ticket code (e.g. EMS-00012-A1B2C3)"
          className="input-field flex-1 font-mono text-sm" />
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary text-sm px-5 disabled:opacity-50">Check</button>
      </form>

      {msg && (
        <p className={`text-sm mt-3 font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
      )}

      {result && (
        <div className={`mt-4 rounded-xl border-2 p-4 ${ok ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
          <p className={`font-bold flex items-center gap-2 ${ok ? "text-green-700" : "text-red-700"}`}>
            {ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {ok ? "VALID TICKET" : "NOT VALID"}
          </p>
          {!ok && <p className="text-sm text-red-700 mt-1">{result.reason}</p>}

          {b && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Ticket holder</p><p className="font-semibold text-gray-900">{b.holder}</p></div>
              <div><p className="text-xs text-gray-500">Event</p><p className="font-semibold text-gray-900">{b.event}</p></div>
              <div><p className="text-xs text-gray-500">Date &amp; time</p><p className="font-semibold text-gray-900">{b.event_date} · {b.event_time}</p></div>
              <div><p className="text-xs text-gray-500">{b.kind === "rsvp" ? "Guests" : "Tickets"}</p><p className="font-semibold text-gray-900">{b.quantity}</p></div>
              <div><p className="text-xs text-gray-500">Already inside</p><p className="font-semibold text-gray-900">{b.checked_in_count} / {b.quantity}</p></div>
              <div><p className="text-xs text-gray-500">Code</p><p className="font-mono font-semibold text-gray-900">{b.ticket_code}</p></div>
            </div>
          )}

          {ok && !result.date_ok && (
            <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
              <AlertTriangle size={14} /> This ticket is for {b.event_date}, but today is {result.today}.
            </p>
          )}

          {ok && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {b.remaining > 1 && (
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <Users size={15} /> Admit
                  <select value={count} onChange={(e) => setCount(e.target.value)} className="input-field !py-1.5 w-auto">
                    {Array.from({ length: b.remaining }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  of {b.remaining}
                </label>
              )}
              <button onClick={() => admit(false)} disabled={busy}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50">
                Admit &amp; mark entered
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
