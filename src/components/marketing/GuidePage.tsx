import MarketingLayout from './MarketingLayout';
import MkLink, { HeroOrbs, PriceLine } from './MkLink';
import { APP_PATH, HOME_PATH, HOW_PATH, PRICE_PATH, SIGNUP_PATH } from '@/lib/sitePath';

export default function GuidePage({ loggedIn }: { loggedIn: boolean }) {
  const cta = loggedIn ? APP_PATH : SIGNUP_PATH;

  return (
    <MarketingLayout route="guide" loggedIn={loggedIn} variant="mk-guide">
      <section className="hero">
        <HeroOrbs />
        <div className="wrap">
          <div className="hero-copy">
            <span className="hero-eyebrow">Venly Guide</span>
            <h1>Gör en månadsbudget som håller</h1>
            <p className="lede">En budget som håller är enkel, realistisk och klar innan månaden börjar. Så bygger du den — och håller dig till den.</p>
            <div className="hero-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
              <PriceLine />
            </div>
          </div>
        </div>
      </section>

      <section className="meaning">
        <div className="wrap">
          <div className="meaning-inner">
            <h2>Vad ”håller” egentligen betyder</h2>
            <div className="meaning-body">
              <p>En hållbar budget är inte den snyggaste. Den är den du faktiskt följer: tydliga poster, rimliga nivåer och utrymme för det oförutsedda.</p>
              <p>Det handlar om proaktiv kontroll — samma precision som i ett kalkylark, utan att du bygger om arket varje månad. Inte ”en ny budgetapp”. <strong>En plan innan pengarna landar.</strong></p>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <div className="how-intro">
            <h2>Steg för steg</h2>
            <p className="lede">Sju steg till en budget du faktiskt håller dig till — innan månaden börjar.</p>
          </div>
          <div className="steps">
            <article className="step">
              <span className="step-ghost">1</span>
              <h3>Börja i verkligheten</h3>
              <p>Utgå från senaste månadernas faktiska nivåer — inte från ideallägen.</p>
            </article>
            <article className="step">
              <span className="step-ghost">2</span>
              <h3>Dela i tre lager</h3>
              <ul className="step-layers">
                <li><span className="layer-dot" aria-hidden="true" /><span><strong>Måste:</strong> fasta kostnader</span></li>
                <li><span className="layer-dot" aria-hidden="true" /><span><strong>Behöver:</strong> rörliga basutgifter</span></li>
                <li><span className="layer-dot" aria-hidden="true" /><span><strong>Vill:</strong> mål, nöje, extra sparande</span></li>
              </ul>
            </article>
            <article className="step">
              <span className="step-ghost">3</span>
              <h3>Sätt buffert som post — inte som rest</h3>
              <p>Buffert är planerad. Annars äts den upp av det oförutsedda.</p>
            </article>
            <article className="step">
              <span className="step-ghost">4</span>
              <h3>Planera kvartals- och årsräkningar</h3>
              <p>Försäkringar, bil, presenter, resor: fördela dem över månaderna så att enskilda perioder inte spricker.</p>
            </article>
            <article className="step">
              <span className="step-ghost">5</span>
              <h3>Ge överskottet en riktning den 25:e</h3>
              <p>Buffert, resor, investeringar eller amortering. Utan riktning försvinner överskottet i vardagen — fördela det innan pengarna rullar iväg.</p>
            </article>
            <article className="step">
              <span className="step-ghost">6</span>
              <h3>Känn vardagsbudgeten</h3>
              <p>När fasta kostnader och öronmärkt överskott är på plats blir det tydligt vad du har kvar att leva på per dag — anpassat efter din faktiska lönedag.</p>
            </article>
            <article className="step">
              <span className="step-ghost">7</span>
              <h3>Följ upp lätt — planera om före nästa lön</h3>
              <p>Kort avstämning. Sedan ny plan före nästa löning. Mer effektivt än daglig mikroregistrering för många.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bridge">
        <div className="wrap">
          <article className="bridge-card">
            <h2>Från budget till löneplanering</h2>
            <div className="bridge-body">
              <p>En klassisk budget beskriver månaden. Nästa steg är att <strong>planera lönen innan den landar</strong>.</p>
              <p>I Venly tar rutinen ~2 minuter före löning: inkomster, fasta och rörliga utgifter, saldo på lönekontot dagen innan lön. AI beräknar levnadskostnader och föreslår hur överskottet kan fördelas — du behåller kontrollen. Ingen bankkoppling.</p>
              <p><strong>Smartare kontroll över din ekonomi:</strong> proaktivt, tydligt, utan kalkylarkskaos.</p>
            </div>
            <div className="bridge-cta">
              <MkLink className="btn btn-primary btn-lg" href={cta}>Börja planera gratis</MkLink>
            </div>
          </article>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <h2>Din nästa lön förtjänar en plan.</h2>
          <p className="lede">Sätt månadens spelregler på ~2 minuter. Sedan vet du.</p>
          <div className="hero-cta">
            <MkLink className="btn btn-primary btn-lg" href={cta}>Kom igång gratis</MkLink>
          </div>
        </div>
      </section>

      <section className="related">
        <div className="wrap">
          <div className="related-inner">
            <span className="related-label">Relaterat</span>
            <nav className="related-links" aria-label="Relaterade sidor">
              <MkLink href={HOW_PATH}>Så funkar Venly</MkLink>
              <MkLink href={PRICE_PATH}>Beta</MkLink>
              <MkLink href={HOME_PATH}>Startsida</MkLink>
            </nav>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
