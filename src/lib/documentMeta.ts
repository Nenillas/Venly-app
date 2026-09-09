export function setPageMeta(title: string, description?: string) {
  document.title = title;
  document.documentElement.lang = 'sv';
  let el = document.querySelector('meta[name="description"]');
  if (!description) return;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', description);
}
