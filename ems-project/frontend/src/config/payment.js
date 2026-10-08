// ---------------------------------------------------------------------------
// OPTIONAL: tell the app the EXACT file names you put in  src/assets/
// Leave "" to let the app find them automatically by name.
//
//   logo : small icon shown in the "Choose payment method" popup
//   qr   : the photo shown AFTER the user picks eSewa / Fonepay (scan screen)
//
// Example:   esewa: { logo: "esewa-logo.png", qr: "my-esewa-scanner.jpg" }
// ---------------------------------------------------------------------------
export const PAYMENT_IMAGES = {
  esewa:   { logo: "", qr: "" },
  fonepay: { logo: "", qr: "" },
  cod:     { logo: "" },
  defaultQr: "payment-qr.jpg", // used if a wallet has no QR of its own
};
