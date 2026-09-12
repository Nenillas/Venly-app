import { OG_IMAGE_URL, seoPageById, seoPageByPath, type SeoPage, type SeoPageId } from './seo';

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(page: SeoPage) {
  document.head.querySelectorAll('script[data-venly-jsonld]').forEach((n) => n.remove());
  if (!page.jsonLd) return;
  const blocks = Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd];
  for (const block of blocks) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-venly-jsonld', 'true');
    el.text = JSON.stringify(block);
    document.head.appendChild(el);
  }
}

export function applyPageSeo(page: SeoPage) {
  document.documentElement.lang = 'sv';
  document.title = page.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: page.description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: page.index ? 'index,follow' : 'noindex,nofollow' });
  upsertCanonical(page.canonical);
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'sv_SE' });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Venly' });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: page.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: page.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: page.canonical });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: OG_IMAGE_URL });
  upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
  upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: OG_IMAGE_URL });
  upsertJsonLd(page);
}

export function applySeoForPath(pathname: string) {
  const page = seoPageByPath(pathname);
  if (page) applyPageSeo(page);
}

export function applySeoForId(id: SeoPageId) {
  applyPageSeo(seoPageById(id));
}

/** @deprecated use applySeoForId */
export function setPageMeta(title: string, description?: string) {
  document.title = title;
  document.documentElement.lang = 'sv';
  if (!description) return;
  upsertMeta('meta[name="description"]', { name: 'description', content: description });
}
