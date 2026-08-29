import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { LAST_DAY_OF_MONTH, swedishDayOrdinal, type PaydayDate } from '@/lib/payday';

const DAY_OPTIONS: PaydayDate[] = [LAST_DAY_OF_MONTH, ...Array.from({ length: 31 }, (_, i) => i + 1)];

export default function UserMenu({
  user,
  paydayDate,
  paydaySaving,
  onPaydayDateChange,
  onSignOut,
}: {
  user: AuthUser;
  paydayDate: PaydayDate;
  paydaySaving?: boolean;
  onPaydayDateChange: (day: PaydayDate) => void;
  onSignOut: () => void;
}) {
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
        <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-ink-900 p-2 shadow-xl shadow-black/40 animate-scale-in">
          <div className="truncate px-3 py-2 text-xs text-zinc-300">{email}</div>
          <label className="block px-3 pb-3 pt-1">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-300">
              Löneutbetalning
            </span>
            <select
              value={paydayDate}
              disabled={paydaySaving}
              onChange={(e) => onPaydayDateChange(Number(e.target.value))}
              className="field w-full px-3 py-2 text-sm text-zinc-100 outline-none"
            >
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day} className="bg-ink-900 text-zinc-100">
                  {day === LAST_DAY_OF_MONTH ? 'Sista dagen i månaden' : `Den ${swedishDayOrdinal(day)}`}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-zinc-400">
              Används för Kvar per dag. Helg flyttas till föregående fredag.
            </span>
          </label>
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
