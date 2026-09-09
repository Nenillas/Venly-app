import type { MouseEvent, ReactNode } from 'react';
import { navigate } from '@/lib/sitePath';

export default function MkLink({
  href,
  className,
  children,
  ariaCurrent,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaCurrent?: 'page';
  ariaLabel?: string;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} className={className} onClick={onClick} aria-current={ariaCurrent} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

export function PriceLine() {
  return <p className="price-line">Gratis under beta · Ingen bankkoppling</p>;
}

export function HeroOrbs() {
  return (
    <div className="hero-orbs" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

export function CheckIcon() {
  return (
    <span className="check" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}
