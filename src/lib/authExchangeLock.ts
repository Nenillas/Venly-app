/** Survives React Strict Mode remounts so PKCE/OTP codes are only used once. */
const claimed = new Set<string>();

export function claimAuthExchange(key: string): boolean {
  if (claimed.has(key)) return false;
  claimed.add(key);
  return true;
}
