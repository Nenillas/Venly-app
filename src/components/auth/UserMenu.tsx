import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import type { User as AuthUser } from '@supabase/supabase-js';

export default function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const email = user.email ?? 'Konto';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[min(16rem,calc(100vw-2rem))] items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 text-left text-sm text-zinc-300 transition-all duration-200 hover:bg-white/[0.08] sm:max-w-[16rem] sm:px-3"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-400/10 text-teal-300">
          <User className="h-4 w-4" />
        </span>
        <span className="hidden truncate sm:inline">{email}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-300" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-ink-900 p-2 shadow-xl shadow-black/40 animate-scale-in">
          <div className="truncate px-3 py-2 text-xs text-zinc-300">{email}</div>
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 transition-all duration-200 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Logga ut
          </button>
        </div>
      )}
    </div>
  );
}
