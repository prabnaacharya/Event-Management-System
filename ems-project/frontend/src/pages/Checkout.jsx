import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  X, ImagePlus, ArrowLeft, Banknote, Minus, Plus, CalendarDays, MapPin, CheckCircle2, Clock,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import SafeImg from "../components/SafeImg";
import WalletQr from "../components/WalletQr";
import { getWalletImages, defaultQr } from "../utils/images";
import { useAuth } from "../context/AuthContext";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^9[678]\d{8}$/;  // Nepal mobile: 10 digits, starts 96 / 97 / 98

// Wallet logo from src/assets (esewa.png / fonepay.png ...). Colored badge if no file.
function Logo({ kind, label, color, children }) {
  const [failed, setFailed] = useState(false);
  const url = getWalletImages(kind).logo;
  if (!url || failed) {
    return (
      <span className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: color }}>
        {children || label[0]}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={label}
      onError={() => setFailed(true)}
      className="w-12 h-12 object-contain rounded-lg bg-white border border-gray-100 p-1 flex-shrink-0"
    />
  );
}

const WALLETS = {
  // color = scan-screen theme.  eSewa -> green, Fonepay -> blue
  esewa: { label: "eSewa", color: "#16A34A", qrColor: "#15803D", tint: "#F0FDF4", method: "esewa_qr" },
  fonepay: { label: "Fonepay", color: "#2563EB", qrColor: "#1D4ED8", tint: "#EFF6FF", method: "fonepay_qr" },
};

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(Number(location.state?.quantity) || 1);
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  // popup state: closed | method | scan | upload | cod
  const [step, setStep] = useState("closed");
  const [wallet, setWallet] = useState(null); // "esewa" | "fonepay"
  const [proof, setProof] = useState(null);
  const [preview, setPreview] = useState(null);
  const [modalError, setModalError] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [gift, setGift] = useState("");
  const [payRef, setPayRef] = useState("");
  const [addr, setAddr] = useState({ address: "", city: "", landmark: "" });
  const [fe, setFe] = useState({}); // field errors inside the payment popup
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { redirectTo: `/checkout/${id}`, quantity } });
    }
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get(`/events/${id}`).then((res) => setEvent(res.data)).catch(() => setError("Event not found."));
  }, [id]);

  useEffect(() => {
    if (user) {
      setBuyer((b) => ({
        name: b.name || user.full_name || "",
        email: b.email || user.email || "",
        phone: b.phone || (user.phone || "").replace(/\D/g, "").slice(-10),
      }));
    }
  }, [user]);

  // free the preview URL when it changes / on unmount
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <p className="text-center text-gray-400 mt-20">{error || "Loading checkout..."}</p>
      </div>
    );
  }

  const isRsvp = event.has_tickets === false; // wedding-type event: RSVP (+ optional payment) instead of tickets
  const fixedAmt = Number(event.price) || 0;
  const maxQty = isRsvp ? 10 : Math.max(1, Math.min(10, event.available_tickets));
  const total = isRsvp ? (fixedAmt > 0 ? fixedAmt * quantity : Math.max(0, Number(gift) || 0)) : event.price * quantity;
  const noPay = isRsvp && total === 0;
  const dateLabel = new Date(event.event_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const openPay = (e) => {
    e.preventDefault();
    setError("");
    let bad = false;
    if (!buyer.name.trim()) { setNameError("Full name is required."); bad = true; }
    if (!buyer.email.trim()) { setEmailError("Email is required."); bad = true; }
    else if (!EMAIL_RE.test(buyer.email.trim())) { setEmailError("Enter a valid email address."); bad = true; }
    if (!PHONE_RE.test(buyer.phone)) {
      setPhoneError(buyer.phone ? "Enter a valid 10-digit mobile number (e.g. 98XXXXXXXX)." : "Mobile number is required to continue.");
      bad = true;
    }
    if (bad) {
      setError("Please fill in your name, email and mobile number to continue.");
      return;
    }
    if (!isRsvp && event.available_tickets < 1) {
      setError("Sorry, this event is sold out.");
      return;
    }
    if (isRsvp && fixedAmt === 0 && gift !== "" && (Number.isNaN(Number(gift)) || Number(gift) < 0)) {
      setError("Please enter a valid amount, or leave it empty to RSVP only.");
      return;
    }
    setModalError("");
    setStep("method");
  };

  const closeModal = () => {
    if (submitting) return;
    setStep("closed");
    setWallet(null);
    setProof(null);
    setPreview(null);
    setModalError("");
    setPaidAmount("");
    setPayRef("");
    setFe({});
  };

  const chooseWallet = (key) => {
    setWallet(key);
    setModalError("");
    setStep("scan");
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setModalError("Please choose an image (screenshot) file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setModalError("Image is too large. Maximum size is 5 MB.");
      return;
    }
    setModalError("");
    setProof(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (method) => {
    setModalError("");
    const e = {};
    if (method === "none") {
      // RSVP only, nothing to pay
    } else if (method !== "cod") {
      if (!proof) e.proof = "Not paid yet — please upload your payment screenshot first.";
      const amt = Number(paidAmount);
      if (paidAmount === "" || Number.isNaN(amt)) e.amount = "Enter the amount you paid.";
      else if (amt !== total) e.amount = `You must pay the full amount: Rs. ${total.toLocaleString()}. Partial payment is not accepted.`;
      if (!/^[A-Za-z0-9\-_]{6,40}$/.test(payRef.trim())) e.ref = "Enter the transaction / reference ID from your payment receipt (6-40 letters or digits).";
    } else {
      if (addr.address.trim().length < 5) e.address = "Please enter your full delivery address (street / tole / house no.).";
      if (addr.city.trim().length < 2) e.city = "Please enter your city / district.";
    }
    setFe(e);
    if (Object.keys(e).length) {
      setModalError(e.proof || "Please fix the highlighted fields.");
      return;
    }
    const fd = new FormData();
    fd.append("event_id", event.id);
    fd.append("quantity", quantity);
    fd.append("method", method);
    fd.append("buyer_name", buyer.name.trim());
    fd.append("buyer_email", buyer.email.trim());
    fd.append("buyer_phone", buyer.phone.trim());
    if (isRsvp && fixedAmt === 0) fd.append("amount", total);
    if (method === "none") {
      // nothing else to send
    } else if (method !== "cod") {
      fd.append("payment_proof", proof);
      fd.append("paid_amount", paidAmount);
      fd.append("payment_ref", payRef.trim());
    } else {
      fd.append("delivery_address", addr.address.trim());
      fd.append("delivery_city", addr.city.trim());
      fd.append("delivery_landmark", addr.landmark.trim());
    }

    setSubmitting(true);
    try {
      await api.post(isRsvp ? "/payments/rsvp" : "/payments/checkout", fd); // axios sets the multipart header itself
      if (isRsvp) navigate("/my-bookings");
      else navigate(`/payment/result?status=${method === "cod" ? "cod" : "qr"}&event=${event.id}`);
    } catch (err) {
      setModalError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <p className="text-sm text-gray-400 mb-4">
          <Link to="/" className="hover:text-primary">Home</Link> /{" "}
          <Link to={`/events/${event.id}`} className="hover:text-primary">{event.title}</Link> / Checkout
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{isRsvp ? "RSVP" : "Checkout"}</h1>

        <form onSubmit={openPay} noValidate className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Buyer info */}
          <div className="md:col-span-3 card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Buyer Information</h3>
            <label className="text-xs font-medium text-gray-500">Full Name *</label>
            <input
              className={`input-field mt-1 ${nameError ? "border-red-400" : "mb-4"}`} value={buyer.name}
              onChange={(e) => { setBuyer({ ...buyer, name: e.target.value }); setNameError(""); }}
            />
            {nameError && <p className="text-xs text-red-500 mt-1 mb-3">{nameError}</p>}
            <label className="text-xs font-medium text-gray-500">Email *</label>
            <input
              type="email" className={`input-field mt-1 ${emailError ? "border-red-400" : "mb-4"}`} value={buyer.email}
              onChange={(e) => { setBuyer({ ...buyer, email: e.target.value }); setEmailError(""); }}
            />
            {emailError && <p className="text-xs text-red-500 mt-1 mb-3">{emailError}</p>}
            <label className="text-xs font-medium text-gray-500">Mobile Number *</label>
            <input
              id="buyer-phone" type="tel" inputMode="numeric" placeholder="98XXXXXXXX"
              className={`input-field mt-1 ${phoneError ? "border-red-400 focus:ring-red-200" : ""}`}
              value={buyer.phone}
              onChange={(e) => {
                let digits = e.target.value.replace(/\D/g, "");          // keep digits only
                if (digits.startsWith("977") && digits.length > 10) digits = digits.slice(3); // +977 prefix
                digits = digits.slice(0, 10);
                setBuyer({ ...buyer, phone: digits });
                setPhoneError("");
              }}
            />
            {phoneError ? (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Required — we use it to contact you about your payment.</p>
            )}
          </div>

          {/* Order summary */}
          <aside className="md:col-span-2 card p-5 h-fit">
            <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
            <SafeImg src={event.image_url} alt={event.title} className="w-full h-32 object-cover rounded-lg" />
            <p className="font-medium text-gray-900 mt-3">{event.title}</p>
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-1"><CalendarDays size={12} /> {dateLabel} · {event.event_time}</p>
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {event.venue}</p>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600">{isRsvp ? "Guests" : "Tickets"}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50">
                  <Minus size={13} />
                </button>
                <span className="font-medium w-5 text-center">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50">
                  <Plus size={13} />
                </button>
              </div>
            </div>
            {isRsvp && fixedAmt === 0 && (
              <div className="mt-4">
                <label className="text-xs font-medium text-gray-500">Gift / contribution (Rs.) — optional</label>
                <input type="number" min="0" value={gift} onChange={(e) => setGift(e.target.value)}
                  className="input-field mt-1" placeholder="0 = RSVP only, no payment" />
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                {isRsvp ? (fixedAmt > 0 ? `Rs. ${fixedAmt.toLocaleString()} × ${quantity} guests` : "Amount") : `Rs. ${event.price.toLocaleString()} × ${quantity}`}
              </span>
              <span className="text-lg font-bold text-primary">Rs. {total.toLocaleString()}</span>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            <button type="submit" className="btn-primary w-full mt-4">{noPay ? "Confirm RSVP" : isRsvp ? `RSVP & Pay Rs. ${total.toLocaleString()}` : `Pay Rs. ${total.toLocaleString()}`}</button>
          </aside>
        </form>
      </div>
      <Footer />

      {/* ------------------------- PAYMENT POPUP ------------------------- */}
      {step !== "closed" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
              <X size={20} />
            </button>

            {/* STEP 1 — choose payment option */}
            {step === "method" && (
              <>
                {noPay ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900">Confirm your RSVP</h3>
                    <p className="text-sm text-gray-500 mt-1">{quantity} guest{quantity > 1 ? "s" : ""} · no payment needed. You can also go back and add a gift amount.</p>
                    <button onClick={() => submit("none")} disabled={submitting} className="btn-primary w-full mt-5 disabled:opacity-50">
                      {submitting ? "Submitting..." : "Confirm RSVP"}
                    </button>
                  </>
                ) : (<>
                <h3 className="text-lg font-semibold text-gray-900">Choose payment method</h3>
                <p className="text-sm text-gray-500 mb-5">Total to pay: <b>Rs. {total.toLocaleString()}</b></p>
                <div className="space-y-3">
                  {Object.entries(WALLETS).map(([key, w]) => (
                    <button key={key} onClick={() => chooseWallet(key)}
                      className="w-full flex items-center gap-4 border border-gray-200 hover:border-primary rounded-xl p-4 text-left transition-colors">
                      <Logo kind={key} label={w.label} color={w.color} />
                      <span>
                        <span className="block font-medium text-gray-900">{w.label}</span>
                        <span className="block text-xs text-gray-500">Scan QR &amp; upload screenshot</span>
                      </span>
                    </button>
                  ))}
                  {!isRsvp && <button onClick={() => { setModalError(""); setStep("cod"); }}
                    className="w-full flex items-center gap-4 border border-gray-200 hover:border-primary rounded-xl p-4 text-left transition-colors">
                    <Logo kind="cod" label="Cash on Delivery" color="#F59E0B"><Banknote size={22} /></Logo>
                    <span>
                      <span className="block font-medium text-gray-900">Cash on Delivery</span>
                      <span className="block text-xs text-gray-500">Pay in cash, we confirm your booking</span>
                    </span>
                  </button>}
                </div>
                </>)}
              </>
            )}

            {/* STEP 2 — scan the QR (green for eSewa, blue for Fonepay) */}
            {step === "scan" && wallet && (() => {
              const w = WALLETS[wallet];
              const qrSrc = getWalletImages(wallet).qr || defaultQr();
              return (
                <>
                  <button onClick={() => setStep("method")} className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 mb-3">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: w.color, background: w.tint }}>
                    <div className="text-center text-white py-3 px-4" style={{ background: w.color }}>
                      <p className="font-semibold">Scan with your {w.label} app to pay</p>
                      <p className="text-xs opacity-90">Merchant: EMS Event Management</p>
                    </div>
                    <div className="p-4">
                      <div className="mx-auto w-60 h-60 bg-white rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
                        {qrSrc ? (
                          <WalletQr src={qrSrc} color={w.qrColor} alt={`${w.label} payment QR`} className="w-full h-full object-contain" />
                        ) : (
                          <p className="text-sm text-red-500 text-center px-4">
                            QR image not found. Put your QR photo in <b>src/assets</b> (name it e.g. <b>{wallet}-qr.jpg</b>).
                          </p>
                        )}
                      </div>
                      <p className="text-center text-xs text-gray-500 mt-3">Amount to pay</p>
                      <p className="text-center text-2xl font-bold text-gray-900">Rs. {total.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setModalError(""); setStep("upload"); }}
                    className="w-full mt-5 text-white font-medium py-3 rounded-lg hover:opacity-90"
                    style={{ background: w.color }}
                  >
                    I have paid — upload screenshot
                  </button>
                </>
              );
            })()}

            {/* STEP 3 — upload screenshot from gallery */}
            {step === "upload" && wallet && (
              <>
                <button onClick={() => setStep("scan")} disabled={submitting} className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 mb-3">
                  <ArrowLeft size={14} /> Back to QR
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Upload payment screenshot</h3>
                <p className="text-sm text-gray-500 mb-3">Choose the screenshot of your {WALLETS[wallet].label} payment from your gallery.</p>

                {proof ? (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    <CheckCircle2 size={16} /> Screenshot added — you can submit now.
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-2">
                    <Clock size={16} /> <b>Not paid yet</b> — upload your payment screenshot to continue.
                  </div>
                )}

                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />

                {preview ? (
                  <div className="border border-gray-200 rounded-xl p-2 text-center">
                    <img src={preview} alt="Screenshot preview" className="mx-auto max-h-64 rounded-lg object-contain" />
                    <p className="text-xs text-gray-500 mt-2 truncate flex items-center justify-center gap-1">
                      <CheckCircle2 size={13} className="text-green-600" /> {proof?.name}
                    </p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-primary font-medium mt-1">
                      Change image
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-primary rounded-xl py-10 flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors">
                    <ImagePlus size={30} />
                    <span className="text-sm font-medium">Select from gallery</span>
                    <span className="text-xs text-gray-400">PNG, JPG or WEBP · max 5 MB</span>
                  </button>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Amount you paid (Rs.) * — must be Rs. {total.toLocaleString()}</label>
                    <input type="number" min="0" value={paidAmount} onChange={(e) => { setPaidAmount(e.target.value); setFe((x) => ({ ...x, amount: undefined })); }}
                      className="input-field mt-1" placeholder={`${total}`} />
                    {fe.amount && <p className="text-xs text-red-500 mt-1">{fe.amount}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Transaction / Reference ID * (from your {WALLETS[wallet].label} receipt)</label>
                    <input value={payRef} onChange={(e) => { setPayRef(e.target.value); setFe((x) => ({ ...x, ref: undefined })); }}
                      className="input-field mt-1" placeholder="e.g. 0LD6CD2" />
                    {fe.ref && <p className="text-xs text-red-500 mt-1">{fe.ref}</p>}
                  </div>
                </div>

                <button onClick={() => submit(WALLETS[wallet].method)} disabled={submitting}
                  className={`w-full mt-5 text-white font-medium py-3 rounded-lg transition-opacity ${proof ? "hover:opacity-90" : "opacity-60"}`}
                  style={{ background: proof ? WALLETS[wallet].color : "#9CA3AF" }}>
                  {submitting ? "Submitting..." : proof ? "Submit payment" : "Upload screenshot to submit"}
                </button>
              </>
            )}

            {/* Cash on delivery confirm */}
            {step === "cod" && (
              <>
                <button onClick={() => setStep("method")} disabled={submitting} className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 mb-3">
                  <ArrowLeft size={14} /> Back
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Cash on Delivery</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You will pay <b>Rs. {total.toLocaleString()}</b> in cash. Your tickets are confirmed once our team verifies the order.
                </p>
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500">Delivery details — we will call you on <b>{buyer.phone}</b> to arrange delivery.</p>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Full address * (street / tole / house no.)</label>
                    <input value={addr.address} onChange={(e) => { setAddr({ ...addr, address: e.target.value }); setFe((x) => ({ ...x, address: undefined })); }}
                      className="input-field mt-1" placeholder="e.g. Baneshwor, house no. 12" />
                    {fe.address && <p className="text-xs text-red-500 mt-1">{fe.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500">City / District *</label>
                      <input value={addr.city} onChange={(e) => { setAddr({ ...addr, city: e.target.value }); setFe((x) => ({ ...x, city: undefined })); }}
                        className="input-field mt-1" placeholder="Kathmandu" />
                      {fe.city && <p className="text-xs text-red-500 mt-1">{fe.city}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Landmark (optional)</label>
                      <input value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })}
                        className="input-field mt-1" placeholder="Near ..." />
                    </div>
                  </div>
                </div>
                <button onClick={() => submit("cod")} disabled={submitting} className="btn-primary w-full mt-5 disabled:opacity-50">
                  {submitting ? "Placing order..." : "Place order"}
                </button>
              </>
            )}

            {modalError && <p className="text-sm text-red-500 mt-3">{modalError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
