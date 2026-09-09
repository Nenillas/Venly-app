import { useEffect } from 'react';
import MarketingLayout from './MarketingLayout';
import MkLink, { HeroOrbs, PriceLine } from './MkLink';
import { setPageMeta } from '@/lib/documentMeta';
import { SIGNUP_PATH, APP_PATH } from '@/lib/sitePath';

export default function LandingPage({ loggedIn }: { loggedIn: boolean }) {
  useEffect(() => {
    setPageMeta('Venly — Planera lönen innan månaden börjar');
  }, []);

  const cta = loggedIn ? APP_PATH : SIGNUP_PATH;

  return (
    <MarketingLayout route="home" loggedIn={loggedIn}>
      <section className="hero">
        <HeroOrbs />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>Planera lönen innan månaden börjar.</h1>
            <p className="lede">Venly ger dig kalkylarkets kontroll — utan komplexiteten. Två minuter före löning. Sedan vet du vad som ska hända med pengarna.</p>
            <div className="hero-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
              <PriceLine />
            </div>
          </div>

          <div className="preview-shell" aria-hidden="true">
            <div className="preview-ghost" />
            <div className="preview-frame">
              <div className="preview-card">
                <div className="preview-notch" />
                <div className="preview-top">
                  <span className="preview-month">September 2026</span>
                  <span className="preview-chip">Plan klar</span>
                </div>
                <div className="preview-surplus">
                  <div className="preview-surplus-label">Överskott efter plan</div>
                  <div className="preview-surplus-value">+ 4 280 kr</div>
                </div>
                <div className="preview-rows">
                  <div className="preview-row">
                    <div className="preview-row-left">
                      <span className="dot dot-indigo" />
                      <span className="preview-row-name">Inkomst</span>
                    </div>
                    <span className="preview-row-amt">32 400 kr</span>
                  </div>
                  <div className="preview-row">
                    <div className="preview-row-left">
                      <span className="dot dot-teal" />
                      <span className="preview-row-name">Fasta utgifter</span>
                    </div>
                    <span className="preview-row-amt">18 650 kr</span>
                  </div>
                  <div className="preview-row">
                    <div className="preview-row-left">
                      <span className="dot dot-indigo-deep" />
                      <span className="preview-row-name">Rörliga utgifter</span>
                    </div>
                    <span className="preview-row-amt">6 470 kr</span>
                  </div>
                  <div className="preview-row">
                    <div className="preview-row-left">
                      <span className="dot dot-emerald" />
                      <span className="preview-row-name">Sparande</span>
                    </div>
                    <span className="preview-row-amt">3 000 kr</span>
                  </div>
                </div>
                <div className="preview-bar-track">
                  <div className="preview-bar-indigo" />
                  <div className="preview-bar-deep" />
                  <div className="preview-bar-emerald" />
                  <div className="preview-bar-rest" />
                </div>
                <div className="preview-legend">
                  <span><i className="dot dot-indigo" style={{ display: 'inline-block' }} /> Inkomst</span>
                  <span><i className="dot dot-emerald" style={{ display: 'inline-block' }} /> Sparande</span>
                  <span><i className="dot dot-emerald" style={{ display: 'inline-block' }} /> Överskott</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="problem">
        <div className="wrap">
          <div className="problem-inner">
            <h2>Sluta gissa vart pengarna tog vägen.</h2>
            <div className="problem-body">
              <p>Traditionella appar visar vad du redan har spenderat.</p>
              <p>Excel ger kontroll — tills det kostar för mycket tid.</p>
              <p>Bankapparna minskar greppet, inte ökar det.</p>
              <p><strong>Du behöver en plan innan löningen landar</strong> — inte en sammanställning efteråt.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <div className="how-intro">
            <h2>Två minuter. Ta kontroll.</h2>
            <p className="lede">Fyra steg. Sedan vet du exakt hur månaden ska se ut.</p>
          </div>
          <div className="steps">
            <article className="step">
              <span className="step-ghost">1</span>
              <h3>Inkomster</h3>
              <p>Ange lön och övriga intäkter för kommande månad.</p>
            </article>
            <article className="step">
              <span className="step-ghost">2</span>
              <h3>Fasta och rörliga utgifter</h3>
              <p>Boende, abonnemang, mat, transport — det du redan vet.</p>
            </article>
            <article className="step">
              <span className="step-ghost">3</span>
              <h3>Saldo på lönekontot</h3>
              <p>Vad som finns kvar dagen innan löning.</p>
            </article>
            <article className="step">
              <span className="step-ghost">4</span>
              <h3>Venly AI räknar</h3>
              <p>Förslag på fördelning. Du bestämmer vad som gäller.</p>
            </article>
          </div>
          <p className="steps-close">Frågan är: Vad ska hända med pengarna den 25:e?</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="benefits-intro">
            <h2>Kontroll utan komplexitet.</h2>
          </div>
          <div className="benefits-bento">
            <article className="benefit benefit-large">
              <div className="benefit-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h3>Två minuter</h3>
              <p>En snabb plan före löning. Sedan är månaden spikad.</p>
            </article>
            <article className="benefit benefit-a">
              <div className="benefit-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3>Ingen bankkoppling</h3>
              <p>Dina konton stannar hos dig. Du matar in det som behövs.</p>
            </article>
            <article className="benefit benefit-b">
              <div className="benefit-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
              </div>
              <h3>Kalkylarkets grepp</h3>
              <p>Samma precision som Excel — utan formelträsket.</p>
            </article>
            <article className="benefit benefit-c">
              <div className="benefit-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <h3>AI som föreslår</h3>
              <p>Venly räknar. Du godkänner. Inget sker utan ditt beslut.</p>
            </article>
            <article className="benefit benefit-d">
              <div className="benefit-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <h3>Vet innan</h3>
              <p>Överskott och luckor syns före den 25:e — inte efter.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>Din nästa lön förtjänar en plan.</h2>
          <div className="hero-cta">
            <MkLink className="btn btn-primary btn-lg" href={cta}>Börja planera gratis</MkLink>
            <PriceLine />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
