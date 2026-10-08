// ---------------------------------------------------------------------------
// All local photos live in  src/assets/  (png, jpg, jpeg, webp, svg, gif, avif)
// Vite bundles whatever is in that folder, so just drop files there.
//
//   Wallet logos : any file with "esewa" / "fonepay" (or "phonepay") in the name
//                  e.g.  esewa.png   fonepay.png   Esewa-logo.jpg
//   Wallet QR    : same but with "qr" too, e.g. esewa-qr.jpg  fonepay-qr.png
//                  (if missing, payment-qr.jpg is used for both)
//   Event photos : in the DB set  image_url = 'rock.jpg'  (just the file name)
//                  or a normal https:// link.
// ---------------------------------------------------------------------------
const modules = import.meta.glob("../assets/**/*.{png,jpg,jpeg,webp,svg,gif,avif,PNG,JPG,JPEG,WEBP}", {
  eager: true,
  query: "?url",
  import: "default",
});

const files = Object.entries(modules).map(([path, url]) => {
  const name = path.split("/").pop();
  return { name, lower: name.toLowerCase(), base: name.replace(/\.[^.]+$/, "").toLowerCase(), url };
});

export const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#EDE9FE"/>
      <g fill="none" stroke="#7C3AED" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".55">
        <rect x="300" y="170" width="200" height="170" rx="22"/><path d="M300 225h200M350 140v50M450 140v50"/>
      </g></svg>`
  );

/** find a bundled asset whose file name has ANY of `include` words and NONE of `exclude` words */
export function findAsset(include = [], exclude = []) {
  const hit = files.find(
    (f) => include.some((w) => f.lower.includes(w)) && !exclude.some((w) => f.lower.includes(w))
  );
  return hit ? hit.url : null;
}

/** turn a DB value (https link, /path, or a file name from src/assets) into a usable src */
export function resolveImage(value) {
  if (!value) return PLACEHOLDER;
  const v = String(value).trim();
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:")) return v;

  const want = v.split("/").pop().toLowerCase();
  const wantBase = want.replace(/\.[^.]+$/, "");
  const hit = files.find((f) => f.lower === want) || files.find((f) => f.base === wantBase);
  if (hit) return hit.url;

  if (v.startsWith("/")) return v; // file served from /public
  if (import.meta.env.DEV) {
    console.warn(`[images] "${v}" not found in src/assets. Available:`, files.map((f) => f.name));
  }
  return PLACEHOLDER;
}

import { PAYMENT_IMAGES } from "../config/payment";

// ---------------------------------------------------------------------------
// Payment pictures (eSewa / Fonepay / COD)
//   1. exact names in  src/config/payment.js  win
//   2. else auto-detect by file name:
//        name has "qr" / "scan" / "code"  -> the scan photo
//        name has "logo" / "icon"         -> the small logo
//        only ONE picture for a wallet    -> it is the scan photo
//   3. no scan photo for that wallet     -> payment-qr.jpg (shown green / blue)
// ---------------------------------------------------------------------------
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""); // "Phone-Pay_QR.JPG" -> "phonepayqrjpg"
const WALLET_WORDS = {
  esewa: ["esewa"],
  fonepay: ["fonepay", "phonepay", "fone", "phone"],
  cod: ["cod", "cash"],
};
const QR_WORDS = ["qr", "scan", "code"];
const LOGO_WORDS = ["logo", "icon"];

const hasAny = (f, words) => words.some((w) => norm(f.name).includes(w));
const isQr = (f) => hasAny(f, QR_WORDS);
const isLogo = (f) => hasAny(f, LOGO_WORDS);

function byExactName(name) {
  if (!name) return null;
  const w = name.trim().toLowerCase();
  const wb = w.replace(/\.[^.]+$/, "");
  const hit = files.find((f) => f.lower === w || f.base === wb);
  if (!hit && import.meta.env.DEV) {
    console.warn(`[payment config] "${name}" not found in src/assets. Available:`, files.map((f) => f.name));
  }
  return hit ? hit.url : null;
}

/** { logo, qr } urls for "esewa" | "fonepay" | "cod" (null when there is no such picture) */
export function getWalletImages(kind) {
  const cfg = PAYMENT_IMAGES[kind] || {};
  const mine = files.filter((f) => hasAny(f, WALLET_WORDS[kind] || []));

  let qrFile = mine.find(isQr) || null;
  let logoFile = mine.find((f) => f !== qrFile && isLogo(f) && !isQr(f)) || null;
  const rest = mine.filter((f) => f !== qrFile && f !== logoFile);

  if (kind !== "cod") {
    if (!qrFile && rest.length === 1 && !logoFile) { qrFile = rest[0]; }       // single picture = scan photo
    else if (!qrFile && rest.length >= 1) { qrFile = rest[rest.length - 1]; }
    if (!logoFile) logoFile = rest.find((f) => f !== qrFile) || null;
  } else if (!logoFile) {
    logoFile = rest[0] || null;
  }

  return {
    logo: byExactName(cfg.logo) || logoFile?.url || null,
    qr: byExactName(cfg.qr) || qrFile?.url || null,
  };
}

/** merchant QR used when a wallet has no scan photo of its own */
export function defaultQr() {
  const named = byExactName(PAYMENT_IMAGES.defaultQr);
  if (named) return named;
  const all = Object.values(WALLET_WORDS).flat();
  const hit = files.find((f) => isQr(f) && !hasAny(f, all));
  return hit ? hit.url : null;
}

if (import.meta.env.DEV) {
  console.info("[images] assets found:", files.map((f) => f.name));
}
