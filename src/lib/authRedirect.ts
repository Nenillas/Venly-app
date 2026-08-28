export function authCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function loginUrl(authError?: string, authInfo?: string): string {
  const params = new URLSearchParams();
  if (authError) params.set('authError', authError);
  if (authInfo) params.set('authInfo', authInfo);
  const q = params.toString();
  return q ? `/login?${q}` : '/login';
}

export function readLoginAuthError(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('authError');
  } catch {
    return null;
  }
}

export function readLoginAuthInfo(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('authInfo');
  } catch {
    return null;
  }
}

export function isResetPasswordLocation(href = window.location.href): boolean {
  try {
    return new URL(href).pathname.startsWith('/reset-password');
  } catch {
    return false;
  }
}

export function passwordResetRedirectTo(): string {
  return `${window.location.origin}/reset-password`;
}

export function getAuthCodeFromUrl(href = window.location.href): string | null {
  return new URL(href).searchParams.get('code');
}

export function getTokenHashFromUrl(href = window.location.href): {
  token_hash: string;
  type: string;
} | null {
  const url = new URL(href);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (!token_hash || !type) return null;
  return { token_hash, type };
}

export function getHashSessionFromUrl(href = window.location.href): {
  access_token: string;
  refresh_token: string;
} | null {
  const hash = new URL(href).hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export function getAuthLinkError(href = window.location.href): string | null {
  const url = new URL(href);
  const fromQuery = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (fromQuery) return fromQuery;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return hash.get('error_description') || hash.get('error') || null;
}

export function isAuthCallbackLocation(href = window.location.href): boolean {
  const url = new URL(href);
  if (url.pathname.startsWith('/reset-password')) return false;
  if (url.pathname.startsWith('/login')) return false;
  if (url.pathname.startsWith('/auth/callback')) return true;
  if (url.searchParams.get('code')) return true;
  if (url.searchParams.get('token_hash')) return true;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return Boolean(hash.get('access_token') || hash.get('type'));
}
