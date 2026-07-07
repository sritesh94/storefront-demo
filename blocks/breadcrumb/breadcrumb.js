import { Breadcrumbs, provider as UI } from '@dropins/tools/components.js';
import { events } from '@dropins/tools/event-bus.js';
import { h } from '@dropins/tools/preact.js';
import { getRootPath } from '@dropins/tools/lib/aem/configs.js';
import { getCategoryAncestors } from '../../scripts/commerce.js';

/**
 * Returns the current page's category URL path by stripping the root path
 * and the leading slash from window.location.pathname.
 * e.g. "/bags/backpacks" → "bags/backpacks"
 */
function getCurrentCategoryPath() {
  const root = getRootPath() || '';
  let path = window.location.pathname;
  if (root && path.startsWith(root)) {
    path = path.substring(root.length);
  }
  return path.replace(/^\/+|\/+$/g, '');
}

/**
 * Returns true when the page is a PDP (URL pattern: /products/{slug}/{sku})
 */
function isPdpPage() {
  return /\/?products\/[\w|-]+\/[\w|-]+$/.test(window.location.pathname);
}

/**
 * Returns true when the page is a dynamically rendered PLP (404 intercepted)
 */
function isPlpPage() {
  return !isPdpPage();
}

/**
 * Builds an ordered ancestor chain from a product's categories array.
 * Uses the `parents` sub-field already included in the PDP GraphQL fragment.
 * Falls back to resolving via the site's category tree API if parents are missing.
 *
 * @param {Object} product - The product object from the pdp/data event
 * @returns {Promise<Array<{name: string, urlPath: string}>>}
 */
async function buildPdpCategoryChain(product) {
  const { categories } = product;

  if (categories && categories.length > 0) {
    // Pick the deepest (highest level) category
    const deepest = [...categories].sort((a, b) => b.level - a.level)[0];

    if (deepest) {
      // Reconstruct chain: sorted parents + deepest category itself
      const sortedParents = [...(deepest.parents || [])].sort((a, b) => a.level - b.level);
      const chain = [...sortedParents, deepest];

      // Build urlPath incrementally from slugs (slug is the last segment of urlPath)
      let accumulatedPath = '';
      return chain.map((item) => {
        accumulatedPath = accumulatedPath
          ? `${accumulatedPath}/${item.slug}`
          : item.slug;
        return { name: item.name, urlPath: accumulatedPath };
      });
    }
  }

  // Fallback: try to derive category from the referrer URL if it's a same-origin category page
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) {
        const refPath = refUrl.pathname.replace(/^\/+|\/+$/g, '');
        const isPdpRef = /\/?products\/[\w|-]+\/[\w|-]+$/.test(refPath);
        if (!isPdpRef && refPath && !refPath.startsWith('cart') && !refPath.startsWith('checkout')) {
          const ancestors = await getCategoryAncestors(refPath);
          if (ancestors.length) return ancestors;
        }
      }
    } catch {
      // ignore URL parse errors
    }
  }

  return [];
}

/**
 * Renders the Breadcrumbs dropin component into the given container.
 *
 * @param {Element} container - The block element
 * @param {Array<{name: string, urlPath: string}>} categoryChain - Ordered category ancestors
 * @param {string|null} currentLabel - Current page label (product name for PDP, null for PLP leaf)
 */
function renderBreadcrumbs(container, categoryChain, currentLabel) {
  const items = [];

  // Home is always first
  items.push(h('a', { href: '/' }, 'Home'));

  // Category ancestors — each is a clickable link
  categoryChain.forEach(({ name, urlPath }, index) => {
    const isLast = index === categoryChain.length - 1 && !currentLabel;
    if (isLast) {
      // Last segment with no additional label → render as non-link span
      items.push(h('span', {}, name));
    } else {
      items.push(h('a', { href: `/${urlPath}` }, name));
    }
  });

  // If there's a current label (product name on PDP), add it as the final non-link
  if (currentLabel) {
    items.push(h('span', {}, currentLabel));
  }

  UI.render(Breadcrumbs, { categories: items })(container);
}

export default async function decorate(block) {
  block.innerHTML = '';

  if (isPdpPage()) {
    // ── PDP mode: wait for product data from the dropin event bus ──
    events.on('pdp/data', async (product) => {
      if (!product) return;
      const categoryChain = await buildPdpCategoryChain(product);
      renderBreadcrumbs(block, categoryChain, product.name);
    }, { eager: true });
  } else if (isPlpPage()) {
    // ── PLP mode: resolve breadcrumbs from the current URL path ──
    const categoryPath = getCurrentCategoryPath();
    if (categoryPath) {
      const ancestors = await getCategoryAncestors(categoryPath);
      // On PLP the last ancestor IS the current page, so no additional label
      renderBreadcrumbs(block, ancestors, null);
    }
  }
}
