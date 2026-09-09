export const APP_PATH = '/app';
export const LOGIN_PATH = '/login';
export const SIGNUP_PATH = '/login?mode=signup';
export const HOME_PATH = '/';
export const HOW_PATH = '/sa-funkar-det';
export const PRICE_PATH = '/pris';
export const GUIDE_PATH = '/guider/gora-manadsbudget';

export const PRICE_LINE = 'Gratis under beta · Ingen bankkoppling';

export type MarketingRoute = 'home' | 'how' | 'price' | 'guide';

export function normalizePath(pathname = window.location.pathname): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname || '/';
}

export function isAppPath(pathname?: string): boolean {
  const p = normalizePath(pathname);
  return p === APP_PATH || p.startsWith(`${APP_PATH}/`);
}

export function isLoginPath(pathname?: string): boolean {
  return normalizePath(pathname) === LOGIN_PATH;
}

export function marketingRoute(pathname?: string): MarketingRoute | null {
  switch (normalizePath(pathname)) {
    case HOME_PATH:
      return 'home';
    case HOW_PATH:
      return 'how';
    case PRICE_PATH:
      return 'price';
    case GUIDE_PATH:
      return 'guide';
    default:
      return null;
  }
}

export function navigate(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.pathname === window.location.pathname && url.search === window.location.search) return;
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function replacePath(path: string) {
  const url = new URL(path, window.location.origin);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function signupUrl(): string {
  return SIGNUP_PATH;
}

export function appUrl(): string {
  return APP_PATH;
}
