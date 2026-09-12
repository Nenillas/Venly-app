import MarketingLayout from './MarketingLayout';
import MkLink, { CheckIcon, HeroOrbs, PriceLine } from './MkLink';
import { APP_PATH, SIGNUP_PATH } from '@/lib/sitePath';

export default function HowItWorksPage({ loggedIn }: { loggedIn: boolean }) {
  const cta = loggedIn ? APP_PATH : SIGNUP_PATH;

  return (
    <MarketingLayout route="how" loggedIn={loggedIn}>
      <section className="hero">
        <HeroOrbs />
        <div className="wrap">
          <div className="hero-copy">
            <h1>Så funkar Venly: din månadsplan på ~2 minuter</h1>
            <p className="lede">En kort rutin före löning. Sedan har du en tydlig plan för vad som ska hända med pengarna — inte bara en lista över vad som redan har hänt.</p>
            <div className="hero-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
              <PriceLine />
            </div>
          </div>
        </div>
      </section>

      <section className="why">
        <div className="wrap">
          <div className="why-inner">
            <h2>Varför en rutin före löning?</h2>
            <div className="why-body">
              <p>De flesta ekonomiverktyg tittar bakåt. Venly är byggt för nästa lön: du ger underlaget, AI:n räknar, du beslutar.</p>
              <p>Målet är <strong>kalkylarkets kontroll</strong> — utan att du bygger om arket varje månad. Proaktiv planering, inte efterhandsanalys. Inte ”en ny budgetapp”.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <div className="how-intro">
            <h2>Steg för steg</h2>
            <p className="lede">Fyra enkla steg. Sedan vet du hur månaden ska se ut.</p>
          </div>
          <div className="steps">
            <article className="step">
              <span className="step-ghost">1</span>
              <h3>Inkomster</h3>
              <p>Lägg in det som kommer in: lön och övriga intäkter. En gång per cykel räcker ofta.</p>
            </article>
            <article className="step">
              <span className="step-ghost">2</span>
              <h3>Fasta och rörliga utgifter</h3>
              <p>Hyra, abonnemang, mat, transport och annat som återkommer eller varierar. Du behöver inte vara perfekt — du behöver vara tillräckligt tydlig för att planen ska hålla.</p>
            </article>
            <article className="step">
              <span className="step-ghost">3</span>
              <h3>Saldo på lönekontot</h3>
              <p>Dagen innan lön: ange saldot. Det ger rätt utgångspunkt för månaden som kommer.</p>
            </article>
            <article className="step">
              <span className="step-ghost">4</span>
              <h3>Venly AI räknar — du styr</h3>
              <p>Venly beräknar levnadskostnader och synliggör överskottet. Sedan får du förslag på fördelning: buffert, resor, investeringar eller det du prioriterar. Förslag är stöd. Beslutet är ditt.</p>
            </article>
          </div>
          <p className="steps-close">
            <span className="muted-q">Frågan är inte ”Vad hände med pengarna?”</span>
            Vad ska hända med pengarna den 25:e?
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="compare-intro">
            <h2>Vad AI gör — och vad du gör</h2>
            <p className="lede">Två roller. En tydlig gräns. Ingen black box som tar över.</p>
          </div>
          <div className="compare-grid">
            <article className="compare-card compare-ai">
              <span className="compare-label">Venly AI</span>
              <h3>Räknar och föreslår</h3>
              <ul className="compare-list">
                <li><span className="compare-dot" aria-hidden="true" /><span>Summerar underlaget</span></li>
                <li><span className="compare-dot" aria-hidden="true" /><span>Beräknar levnadskostnader</span></li>
                <li><span className="compare-dot" aria-hidden="true" /><span>Föreslår överskott till buffert, resor, investeringar</span></li>
              </ul>
            </article>
            <article className="compare-card compare-you">
              <span className="compare-label">Du</span>
              <h3>Sätter ramarna</h3>
              <ul className="compare-list">
                <li><span className="compare-dot" aria-hidden="true" /><span>Sätter ramarna</span></li>
                <li><span className="compare-dot" aria-hidden="true" /><span>Godkänner fördelningen</span></li>
                <li><span className="compare-dot" aria-hidden="true" /><span>Behåller kontrollen</span></li>
              </ul>
            </article>
          </div>
          <p className="compare-close">Ingen black box som tar över. Ingen efterhandsanalys som enda verktyg. <strong>En plan innan månaden börjar.</strong></p>
        </div>
      </section>

      <section className="split-band">
        <div className="wrap">
          <div className="info-grid">
            <div className="info-block">
              <h2>Praktiskt</h2>
              <ul className="bullet-list">
                <li>
                  <CheckIcon />
                  <span className="li-body"><strong>Ingen bankkoppling</strong> — du lägger in inkomster, utgifter och saldo själv.</span>
                </li>
                <li>
                  <CheckIcon />
                  <span className="li-body"><strong>Webbapp</strong> — tillgänglig där du arbetar med ekonomin.</span>
                </li>
                <li>
                  <CheckIcon />
                  <span className="li-body"><strong>Gratis under beta</strong>.</span>
                </li>
              </ul>
            </div>
            <div className="info-block">
              <h2>Resultatet</h2>
              <p className="result-lede">När lönen landar vet du redan:</p>
              <ul className="bullet-list">
                <li><CheckIcon /><span>vad som ska täcka fasta kostnader</span></li>
                <li><CheckIcon /><span>vad som är rörligt utrymme</span></li>
                <li><CheckIcon /><span>vad som kan gå till buffert, mål eller investeringar</span></li>
              </ul>
              <p className="result-close"><strong>Smartare kontroll över din ekonomi</strong> — på ungefär två minuter.</p>
              <div className="info-cta">
                <MkLink className="btn btn-primary btn-lg" href={cta}>Börja planera gratis</MkLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>Planera lönen innan månaden börjar.</h2>
          <p className="lede">Två minuter före löning. Sedan vet du.</p>
          <div className="hero-cta">
            <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
