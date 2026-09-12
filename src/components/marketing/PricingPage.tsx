import MarketingLayout from './MarketingLayout';
import MkLink, { CheckIcon, HeroOrbs, PriceLine } from './MkLink';
import { APP_PATH, SIGNUP_PATH } from '@/lib/sitePath';

export default function PricingPage({ loggedIn }: { loggedIn: boolean }) {
  const cta = loggedIn ? APP_PATH : SIGNUP_PATH;

  return (
    <MarketingLayout route="price" loggedIn={loggedIn}>
      <section className="hero">
        <HeroOrbs />
        <div className="wrap">
          <div className="hero-copy">
            <h1>Open-Beta.</h1>
            <p className="lede">Venly är gratis under betan. Planera lönen innan månaden börjar — utan bankkoppling och utan kalkylarkskaos.</p>
            <div className="hero-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
              <PriceLine />
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="wrap">
          <article className="price-card">
            <div className="price-numeral-row">
              <span className="price-numeral">Gratis</span>
            </div>
            <p className="price-note">Under beta — ingen kostnad</p>
            <p className="price-card-lede">Allt du behöver för proaktiv löneplanering. Open Beta är gratis — ingen bankkoppling.</p>
            <ul className="checklist">
              <li><CheckIcon /><span>Månadsplan på ~2 minuter före löning</span></li>
              <li><CheckIcon /><span>Inkomster, fasta och rörliga utgifter + saldo som underlag</span></li>
              <li><CheckIcon /><span>AI som beräknar levnadskostnader och synliggör överskott</span></li>
              <li><CheckIcon /><span>Förslag på fördelning (buffert, resor, investeringar) — du beslutar</span></li>
              <li><CheckIcon /><span>Ingen bankkoppling — du behåller kontrollen över dina uppgifter</span></li>
              <li><CheckIcon /><span>Webbapp, tillgänglig där du arbetar med ekonomin</span></li>
            </ul>
            <div className="price-card-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Börja planera gratis →</MkLink>
            </div>
          </article>
        </div>
      </section>

      <section className="why">
        <div className="wrap">
          <div className="why-inner">
            <h2>Kontroll ska inte kräva ett abonnemangsdjungel.</h2>
            <div className="why-body">
        <p>Venly är inte "en ny budgetapp" med tiotals nivåer. Det är verktyget mellan Excel och helautomatiserade bankappar: du planerar nästa lön, AI föreslår, du styr.</p>
              <p><strong>Gratis under beta. En rutin. Smartare kontroll över din ekonomi.</strong></p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="faq-intro">
            <h2>Vanliga frågor</h2>
          </div>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Kostar Venly något under betan?</summary>
              <p className="faq-answer">Nej. Hela betan är gratis. Du kan använda Venly utan kostnad under betaperioden.</p>
            </details>
            <details className="faq-item">
              <summary>Finns det en gratis start?</summary>
              <p className="faq-answer">Ja — hela betan är gratis. Du kommer igång utan kostnad och utan bankkoppling.</p>
            </details>
            <details className="faq-item">
              <summary>Behöver jag koppla banken?</summary>
              <p className="faq-answer">Nej. Venly kräver ingen bankkoppling. Du matar in det som behövs och behåller kontrollen över dina uppgifter.</p>
            </details>
            <details className="faq-item">
              <summary>Vem passar Venly för?</summary>
              <div className="faq-answer">
                <p>Venly passar dig som vill ha proaktiv kontroll över din ekonomi utan krångel. Appen är perfekt om du vill:</p>
                <ul className="faq-list-bullets">
                  <li><strong>Känna din vardagsbudget:</strong> Se exakt vad du har kvar att leva på per dag — anpassat efter din faktiska lönedag.</li>
                  <li><strong>Spara smartare:</strong> Fördela månadens överskott direkt den 25:e till rätt sparmål (buffert, resor, investeringar) innan pengarna rullar iväg.</li>
                  <li><strong>Undvika överraskningar:</strong> Enkelt planera för kvartals- och årsräkningar så att enskilda månader inte spricker.</li>
                  <li><strong>Spara tid:</strong> Sätta upp hela månadens spelregler på bara 2 minuter i en stilren, mörklägesfokuserad app.</li>
                </ul>
                <p>Venly passar dig som föredrar en proaktiv planering av ditt kassaflöde framför att i efterhand kategorisera varje enskilt kaffekvitto.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>Din nästa lön förtjänar en plan.</h2>
          <p className="lede">Två minuter före löning. Sedan vet du vad som ska hända med pengarna.</p>
          <div className="hero-cta">
            <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
