export const SITE_ORIGIN = 'https://www.venly.se';
export const OG_IMAGE_PATH = '/og-image.png';
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}`;

export type SeoPageId = 'home' | 'how' | 'price' | 'guide' | 'login' | 'app';

export interface SeoPage {
  id: SeoPageId;
  path: string;
  title: string;
  description: string;
  canonical: string;
  index: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const FAQ_ENTITIES = [
  {
    '@type': 'Question',
    name: 'Kostar Venly något under betan?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Nej. Hela betan är gratis. Du kan använda Venly utan kostnad under betaperioden.',
    },
  },
  {
    '@type': 'Question',
    name: 'Finns det en gratis start?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Ja — hela betan är gratis. Du kommer igång utan kostnad och utan bankkoppling.',
    },
  },
  {
    '@type': 'Question',
    name: 'Behöver jag koppla banken?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Nej. Venly kräver ingen bankkoppling. Du matar in det som behövs och behåller kontrollen över dina uppgifter.',
    },
  },
  {
    '@type': 'Question',
    name: 'Vem passar Venly för?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Venly passar dig som vill ha proaktiv kontroll över din ekonomi utan krångel: känna vardagsbudgeten, fördela överskott före löning, planera kvartals- och årsräkningar, och sätta månadens spelregler på cirka två minuter. Proaktiv kassaflödesplanering — inte efterhandsanalys av kvitton.',
    },
  },
];

export const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Venly',
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/venly-logo.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Venly',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: `${SITE_ORIGIN}/`,
    description:
      'Planera lönen innan månaden börjar. Venly ger kalkylarkets kontroll utan komplexiteten — cirka två minuter före löning. Open Beta: gratis · ingen bankkoppling.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SEK',
      category: 'Open Beta',
      description: 'Open Beta',
    },
  },
];

export const PRICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ENTITIES,
};

export const SEO_PAGES: SeoPage[] = [
  {
    id: 'home',
    path: '/',
    title: 'Venly — Planera lönen innan månaden börjar',
    description:
      'Planera lönen innan månaden börjar. Venly ger dig kalkylarkets kontroll utan komplexiteten — cirka två minuter före löning. Open Beta: gratis · ingen bankkoppling.',
    canonical: `${SITE_ORIGIN}/`,
    index: true,
    jsonLd: HOME_JSON_LD,
  },
  {
    id: 'how',
    path: '/sa-funkar-det',
    title: 'Så funkar Venly — din månadsplan på ~2 minuter',
    description:
      'Så funkar Venly: två minuter före löning. AI räknar levnadskostnader och föreslår överskott — du styr. Ingen bankkoppling. Open Beta gratis.',
    canonical: `${SITE_ORIGIN}/sa-funkar-det`,
    index: true,
  },
  {
    id: 'price',
    path: '/pris',
    title: 'Open Beta — Venly gratis under betan',
    description:
      'Venly Open Beta är gratis. Planera lönen innan månaden börjar — utan bankkoppling. Proaktiv löneplanering på cirka två minuter.',
    canonical: `${SITE_ORIGIN}/pris`,
    index: true,
    jsonLd: PRICE_JSON_LD,
  },
  {
    id: 'guide',
    path: '/guider/gora-manadsbudget',
    title: 'Gör en månadsbudget som håller | Venly Guide',
    description:
      'Gör en månadsbudget som håller: realistiska poster, buffert och överskott före löning. Proaktiv metod — Open Beta gratis · ingen bankkoppling.',
    canonical: `${SITE_ORIGIN}/guider/gora-manadsbudget`,
    index: true,
  },
  {
    id: 'login',
    path: '/login',
    title: 'Logga in — Venly',
    description: 'Logga in på Venly för att planera nästa lön.',
    canonical: `${SITE_ORIGIN}/login`,
    index: false,
  },
  {
    id: 'app',
    path: '/app',
    title: 'Venly',
    description: 'Venly-appen.',
    canonical: `${SITE_ORIGIN}/app`,
    index: false,
  },
];

export const INDEXABLE_PAGES = SEO_PAGES.filter((p) => p.index);

export function seoPageByPath(pathname: string): SeoPage | null {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname || '/';
  return SEO_PAGES.find((page) => page.path === p) ?? null;
}

export function seoPageById(id: SeoPageId): SeoPage {
  return SEO_PAGES.find((p) => p.id === id)!;
}

export function headSnippet(page: SeoPage): string {
  const robots = page.index ? 'index,follow' : 'noindex,nofollow';
  const jsonLdBlocks = page.jsonLd
    ? (Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd])
        .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
        .join('\n')
    : '';
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeAttr(page.canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="sv_SE" />`,
    `<meta property="og:site_name" content="Venly" />`,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(page.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(OG_IMAGE_URL)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(OG_IMAGE_URL)}" />`,
    jsonLdBlocks,
  ].filter(Boolean).join('\n    ');
}

export function injectSeoHead(html: string, page: SeoPage): string {
  const snippet = headSnippet(page);
  if (html.includes('<!--app-seo-->') && html.includes('<!--/app-seo-->')) {
    return html.replace(/<!--app-seo-->[\s\S]*?<!--\/app-seo-->/, `<!--app-seo-->\n    ${snippet}\n    <!--/app-seo-->`);
  }
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
