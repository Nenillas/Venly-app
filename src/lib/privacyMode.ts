const KEY = 'venly.isPrivacyModeEnabled';

export function readPrivacyMode(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function writePrivacyMode(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}
