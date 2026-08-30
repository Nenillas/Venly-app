import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface Props {
  label: string;
  children: ReactNode;
  className?: string;
}

export default function InfoTip({ label, children, className = 'w-72' }: Props) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 24);
      const left = Math.min(r.left, window.innerWidth - width - 12);
      setPos({ top: r.bottom + 6, left: Math.max(12, left) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || tip.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="relative inline-flex shrink-0">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid h-5 w-5 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-teal-200"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            onMouseLeave={() => setOpen(false)}
            style={{ top: pos.top, left: pos.left }}
            className={`fixed z-50 rounded-xl border border-white/10 bg-ink-850 p-3 text-left text-xs leading-relaxed text-zinc-200 shadow-xl shadow-black/40 ${className}`}
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}
