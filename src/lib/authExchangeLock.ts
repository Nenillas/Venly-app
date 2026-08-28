/** Survives React Strict Mode remounts so PKCE/OTP codes are only used once. */
const claimed = new Set<string>();
let callbackEffectStarted = false;

export function claimAuthCallbackEffect(): boolean {
  if (callbackEffectStarted) return false;
  callbackEffectStarted = true;
  return true;
}

let resetPasswordEffectStarted = false;

export function claimResetPasswordEffect(): boolean {
  if (resetPasswordEffectStarted) return false;
  resetPasswordEffectStarted = true;
  return true;
}

export function claimAuthExchange(key: string): boolean {
  if (claimed.has(key)) return false;
  claimed.add(key);
  return true;
}
