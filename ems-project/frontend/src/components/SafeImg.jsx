import { useState, useEffect } from "react";
import { resolveImage, PLACEHOLDER } from "../utils/images";

/** <img> that understands asset file names + never shows a broken-image icon */
export default function SafeImg({ src, alt = "", className = "", ...rest }) {
  const [url, setUrl] = useState(() => resolveImage(src));
  useEffect(() => setUrl(resolveImage(src)), [src]);
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => url !== PLACEHOLDER && setUrl(PLACEHOLDER)}
      {...rest}
    />
  );
}
