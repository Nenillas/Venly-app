export function mapAuthError(message: string | undefined): string {
  const raw = (message ?? '').toLowerCase();

  if (raw.includes('invalid login') || raw.includes('invalid credentials')) {
    return 'Felaktigt lösenord';
  }
  if (raw.includes('already registered') || raw.includes('user already') || raw.includes('already been registered')) {
    return 'E-postadressen finns redan.';
  }
  if (raw.includes('password should be') || raw.includes('password is too short') || raw.includes('at least 6')) {
    return 'Lösenordet måste vara minst 6 tecken.';
  }
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return 'Ange en giltig e-postadress.';
  }
  if (raw.includes('email not confirmed') || raw.includes('not confirmed')) {
    return 'E-postadressen är inte bekräftad. Kolla din inkorg.';
  }
  if (raw.includes('rate limit') || raw.includes('over_email_send')) {
    return 'För många försök. Vänta en stund och försök igen.';
  }
  if (raw.includes('signup is disabled') || raw.includes('signups not allowed')) {
    return 'Nya konton är tillfälligt stängda.';
  }
  if (raw.includes('user not found')) {
    return 'Inget konto med den e-postadressen.';
  }
  if (raw.includes('same password')) {
    return 'Välj ett annat lösenord.';
  }
  if (raw.includes('otp_expired') || raw.includes('flow state') || raw.includes('invalid or has expired') || raw.includes('email link is invalid')) {
    return 'Länken är ogiltig eller har gått ut. Begär en ny från e-posten.';
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'Kunde inte nå servern. Kontrollera din uppkoppling.';
  }

  if (message) {
    console.error(message);
    return `Något gick fel: ${message}`;
  }
  return 'Något gick fel. Försök igen.';
}

/** Avoid showing raw JSON like {"code":403,"error_code":"otp_expired",...} */
export function friendlyAuthCallbackMessage(raw: string | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) return 'Länken är ogiltig eller har gått ut. Begär en ny från e-posten.';
  try {
    const parsed = JSON.parse(text) as { msg?: string; message?: string; error_code?: string; error?: string };
    const combined = [parsed.error_code, parsed.msg, parsed.message, parsed.error].filter(Boolean).join(' ');
    return mapAuthError(combined || text);
  } catch {
    return mapAuthError(text);
  }
}

export function friendlyResetLinkMessage(raw: string | undefined): string {
  const mapped = friendlyAuthCallbackMessage(raw);
  if (
    mapped.includes('ogiltig') ||
    mapped.includes('gått ut') ||
    (raw ?? '').toLowerCase().includes('otp_expired')
  ) {
    return 'Återställningslänken är ogiltig eller har gått ut. Begär en ny.';
  }
  return mapped;
}
