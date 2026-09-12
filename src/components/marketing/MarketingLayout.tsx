import { useEffect, type ReactNode } from 'react';
import './marketing.css';
import MkLink from './MkLink';
import { APP_PATH, GUIDE_PATH, HOME_PATH, HOW_PATH, LOGIN_PATH, PRICE_PATH, SIGNUP_PATH } from '@/lib/sitePath';
import type { MarketingRoute } from '@/lib/sitePath';
import { applySeoForId } from '@/lib/documentMeta';
import type { SeoPageId } from '@/lib/seo';

const LOGO = '/venly-logo.svg';
const ROUTE_SEO: Record<MarketingRoute, SeoPageId> = {
  home: 'home',
  how: 'how',
  price: 'price',
  guide: 'guide',
};

export default function MarketingLayout({
  route,
  loggedIn,
  variant = '',
  children,
}: {
  route: MarketingRoute;
  loggedIn: boolean;
  variant?: string;
  children: ReactNode;
}) {
  const startHref = loggedIn ? APP_PATH : SIGNUP_PATH;
  const startLabel = loggedIn ? 'Öppna appen' : 'Kom igång';
  const loginHref = loggedIn ? APP_PATH : LOGIN_PATH;

  useEffect(() => {
    applySeoForId(ROUTE_SEO[route]);
  }, [route]);

  return (
    <div className={`mk ${variant}`.trim()}>
      <header className="site-header">
        <div className="wrap header-inner">
          <MkLink className="brand" href={HOME_PATH} ariaLabel="Venly startsida">
            <img src={LOGO} alt="" width={32} height={32} />
            <span className="brand-name">Venly</span>
            <span className="beta-badge">BETA</span>
          </MkLink>
          <nav className="header-nav" aria-label="Primär">
            <MkLink href={HOW_PATH} ariaCurrent={route === 'how' ? 'page' : undefined}>Så funkar det</MkLink>
            <MkLink href={GUIDE_PATH} ariaCurrent={route === 'guide' ? 'page' : undefined}>Guide</MkLink>
            <MkLink href={PRICE_PATH} ariaCurrent={route === 'price' ? 'page' : undefined}>Beta</MkLink>
          </nav>
          <div className="header-actions">
            {!loggedIn && (
              <MkLink className="btn btn-ghost btn-sm" href={loginHref}>Logga in</MkLink>
            )}
            <MkLink className="btn btn-primary btn-sm" href={startHref}>{startLabel}</MkLink>
          </div>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <MkLink className="footer-brand" href={HOME_PATH}>
            <img src={LOGO} alt="" width={20} height={20} />
            <span>Venly</span>
          </MkLink>
          <nav className="footer-links" aria-label="Sidfot">
            <MkLink href={HOW_PATH} ariaCurrent={route === 'how' ? 'page' : undefined}>Så funkar det</MkLink>
            <MkLink href={GUIDE_PATH} ariaCurrent={route === 'guide' ? 'page' : undefined}>Guide</MkLink>
            <MkLink href={PRICE_PATH} ariaCurrent={route === 'price' ? 'page' : undefined}>Beta</MkLink>
            <MkLink href={HOME_PATH} ariaCurrent={route === 'home' ? 'page' : undefined}>Startsida</MkLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
