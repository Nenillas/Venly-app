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

export function isRecoveryAuthLocation(href = window.location.href): boolean {
  try {
    const url = new URL(href);
    if (url.searchParams.get('type') === 'recovery') return true;
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    return hash.get('type') === 'recovery';
  } catch {
    return false;
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
  const fromQuery = url.searchParams.get('token_hash');
  const typeQuery = url.searchParams.get('type');
  if (fromQuery && typeQuery) return { token_hash: fromQuery, type: typeQuery };
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const fromHash = hash.get('token_hash');
  const typeHash = hash.get('type');
  if (fromHash && typeHash) return { token_hash: fromHash, type: typeHash };
  return null;
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
  if (isRecoveryAuthLocation(href)) return false;
  if (url.pathname.startsWith('/auth/callback')) return true;
  if (url.searchParams.get('code')) return true;
  if (url.searchParams.get('token_hash')) return true;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return Boolean(hash.get('access_token') || hash.get('type'));
}
