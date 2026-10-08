import { useEffect, useState } from "react";
export default function WalletQr({ src, color, alt = "QR", className = "" }) {
  const [out, setOut] = useState(src);

  useEffect(() => {
    let dead = false;
    setOut(src);
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      try {
        const max = 640;
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        // cut 2.5% off every edge: removes scan/border lines that some QR photos have
        const cx = Math.round(img.naturalWidth * 0.025), cy = Math.round(img.naturalHeight * 0.025);
        const sw = img.naturalWidth - cx * 2, sh = img.naturalHeight - cy * 2;
        const w = Math.round(sw * k), h = Math.round(sh * k);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, cx, cy, sw, sh, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;

        // is the picture already coloured?  count clearly-coloured pixels
        let inked = 0, coloured = 0;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx < 235) {                       // not white paper
            inked++;
            if (mx - mn > 40) coloured++;       // has real colour
          }
        }
        if (inked > 0 && coloured / inked > 0.25) return; // already coloured -> keep original

        const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
        for (let i = 0; i < px.length; i += 4) {
          const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
          const t = Math.min(1, Math.max(0, (lum - 0.3) / 0.4)); // 0 = ink, 1 = paper
          px[i] = rgb[0] * (1 - t) + 255 * t;
          px[i + 1] = rgb[1] * (1 - t) + 255 * t;
          px[i + 2] = rgb[2] * (1 - t) + 255 * t;
        }
        ctx.putImageData(data, 0, 0);
        if (!dead) setOut(c.toDataURL("image/png"));
      } catch {
        /* keep original picture */
      }
    };
    img.src = src;
    return () => { dead = true; };
  }, [src, color]);

  return <img src={out} alt={alt} className={className} />;
}
