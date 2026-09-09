import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';

export const FEEDBACK_EMAIL = 'hello@venly.se';

interface Props {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export default function FeedbackModal({ open, onClose, userEmail }: Props) {
  const titleId = useId();
  const fieldId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    const lines = [
      text,
      '',
      '—',
      userEmail ? `Från: ${userEmail}` : 'Från: (ej inloggad)',
      `Sidan: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    ];
    const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Venly beta-feedback')}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = href;
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md card p-5 sm:p-6 animate-scale-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
          aria-label="Stäng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-400/10 text-teal-300">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold text-zinc-50">Lämna feedback</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Venly är i gratis open beta. Berätta vad som fungerar, vad som saknas eller vad som strular — det hjälper oss prioritera.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-teal-400/20 bg-teal-400/[0.08] px-4 py-3 text-sm text-teal-100">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
            <p>
              Tack! Om e-postklienten inte öppnades kan du skicka till{' '}
              <a className="font-medium text-teal-200 underline decoration-teal-400/40 underline-offset-2" href={`mailto:${FEEDBACK_EMAIL}`}>
                {FEEDBACK_EMAIL}
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label htmlFor={fieldId} className="block text-xs font-medium text-zinc-300">
              Ditt meddelande
            </label>
            <textarea
              ref={inputRef}
              id={fieldId}
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="T.ex. en bugg, en idé eller något som är otydligt…"
              className="field w-full resize-y px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            <button type="submit" className="btn-primary w-full py-2.5">
              Skicka feedback
            </button>
            <p className="text-center text-[11px] text-zinc-400">
              Öppnar din e-post till {FEEDBACK_EMAIL}. Inga betalväggar — hela appen är öppen under betan.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export function FeedbackButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09] hover:text-zinc-50 sm:px-3 sm:text-sm ${className}`}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Lämna feedback</span>
      <span className="sm:hidden">Feedback</span>
    </button>
  );
}

export function BetaBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400 rounded-full ${className}`}
    >
      BETA
    </span>
  );
}
