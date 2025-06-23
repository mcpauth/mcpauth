import { createHmac, timingSafeEqual } from "crypto";

/** 32+ random bytes, base64url. Load from env or secret manager. */
const SECRET = process.env.INTERNAL_STATE_SECRET!;
if (!SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("INTERNAL_STATE_SECRET must be set in production for security.");
  }
  // To prevent a hard crash in development when the secret is not yet set,
  // we'll log a prominent warning. The flow will be insecure.
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! WARNING: INTERNAL_STATE_SECRET is not set.               !!!");
  console.warn("!!! The OAuth flow is INSECURE and vulnerable to tampering.  !!!");
  console.warn("!!! This is NOT safe for production.                       !!!");
  console.warn("!!! Generate a secret with:                                !!!");
  console.warn("!!! node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\" !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

export function sign(payload: string): string {
  // If the secret is missing in a non-production environment, return the payload unsigned.
  // This allows the app to run, but the flow is insecure.
  if (!SECRET) return payload;

  const mac = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`; // payload.base64url.sig
}

export function verify(s: string): string {
  // If the secret is missing, we must assume the payload was not signed.
  if (!SECRET) return s;

  const idx = s.lastIndexOf(".");
  if (idx < 0) throw new Error("State is not signed or has a bad format.");

  const payload = s.slice(0, idx);
  const sig = s.slice(idx + 1);

  const expectedMac = createHmac("sha256", SECRET).update(payload).digest();
  const receivedMac = Buffer.from(sig, "base64url");

  if (
    expectedMac.length !== receivedMac.length ||
    !timingSafeEqual(expectedMac, receivedMac)
  ) {
    throw new Error("Signature mismatch. The state may have been tampered with.");
  }

  return payload; // still base64url, caller will decode
}
