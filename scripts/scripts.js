import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  convertTablesToBlocks,
} from './aem.js';
import {
  loadCommerceEager,
  loadCommerceLazy,
  initializeCommerce,
  applyTemplates,
  decorateLinks,
  loadErrorPage,
  decorateSections,
  IS_UE,
  IS_DA,
  checkAndRenderCategoryPage,
  checkAndRenderProductPage,
  fetchPlaceholders,
} from './commerce.js';
import { showToast } from './lib/toast.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds a breadcrumb block and prepends it to the section containing a product block.
 * Runs for both authored pages (200) and dynamic pages as a safety net.
 * @param {Element} main The container element
 */
function buildBreadcrumbBlock(main) {
  // Skip if breadcrumb is already injected (e.g. by checkAndRenderCategoryPage)
  if (main.querySelector('.breadcrumb')) return;

  // Only add breadcrumb when a product block is present
  const productBlock = main.querySelector('.product-list-page, .product-details');
  if (!productBlock) return;

  // Wrap the breadcrumb in a plain section div and prepend to main.
  // This makes breadcrumb the first section of the page (right below the header),
  // above any authored title or product content.
  // decorateSections will add the .section class and wrap the breadcrumb div
  // giving the correct section > wrapper > block depth for decorateBlocks.
  const sectionDiv = document.createElement('div');
  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'breadcrumb';
  sectionDiv.append(breadcrumb);
  main.prepend(sectionDiv);
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    if (!main.querySelector('.hero')) buildHeroBlock(main);
    buildBreadcrumbBlock(main);
  } catch (error) {
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Converts custom block tables to blocks before standard table conversion.
 * @param {Element} root The container element
 */
function convertCustomTablesToBlocks(root) {
  const CUSTOM_BLOCKS = new Set(['commerce-video', 'commerce-newsletter']);
  Array.from(root.querySelectorAll('table')).reverse().forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return;
    const firstCell = rows[0].querySelector('td, th');
    if (!firstCell) return;
    const blockName = firstCell.textContent
      .trim()
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (CUSTOM_BLOCKS.has(blockName)) {
      const content = [];
      for (let i = 1; i < rows.length; i += 1) {
        const cols = Array.from(rows[i].querySelectorAll('td, th'));
        const colHtml = cols.map((c) => c.innerHTML || '');
        content.push(colHtml);
      }
      const blockEl = buildBlock(blockName, content);
      blockEl.dataset.blockPlaceholder = 'true';
      table.replaceWith(blockEl);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  decorateLinks(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  convertCustomTablesToBlocks(main);
  convertTablesToBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  const main = doc.querySelector('main');
  if (main) {
    try {
      await initializeCommerce();
      await checkAndRenderCategoryPage(main);
      await checkAndRenderProductPage(main);
      decorateMain(main);
      applyTemplates(doc);
      await loadCommerceEager();
    } catch (e) {
      console.error('Error initializing commerce configuration:', e);
      loadErrorPage(418);
    }
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  if (main.querySelector('.homepage-promo-section')) {
    import('./homepage-countdown.js').then(({ initHomepagePromoCountdown }) => {
      initHomepagePromoCountdown(main);
    });
  }

  if (main.querySelector('.homepage-video-sec')) {
    import('./homepage-video-carousel.js').then(({ default: initVideoCarousel }) => {
      initVideoCarousel(main);
    });
  }

  if (main.querySelector('.homepage-commerce-video')) {
    import('./homepage-commerce-video-carousel.js').then(({ default: initCommerceVideoCarousel }) => {
      initCommerceVideoCarousel(main);
    });
  }

  if (main.querySelector('.homepage-spotlight-section')) {
    import('./homepage-spotlight-carousel.js').then(({ default: initSpotlightCarousel }) => {
      initSpotlightCarousel(main);
    });
  }

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCommerceLazy();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // Register a global wishlist toast notification for all pages using WishlistToggle
  const wishlistLabels = await fetchPlaceholders('placeholders/wishlist.json');
  const wishlistMessages = {
    add: wishlistLabels['Wishlist.Alert.addProduct.heading'] || 'Added to wishlist',
    remove: wishlistLabels['Wishlist.Alert.removeProduct.heading'] || 'Removed from wishlist',
    move: wishlistLabels['Wishlist.Alert.moveToCart.heading'] || 'Moved to cart',
    addError: wishlistLabels['Wishlist.Alert.addError.heading'] || 'Could not add to wishlist',
    removeError: wishlistLabels['Wishlist.Alert.removeError.heading'] || 'Could not remove from wishlist',
  };

  // Dynamically import events to avoid loading the event bus before commerce is ready
  const { events } = await import('@dropins/tools/event-bus.js');
  events.on('wishlist/alert', ({ action, item }) => {
    const productName = item?.product?.name || '';
    const messageTemplate = wishlistLabels[`Wishlist.Alert.${action}Product.message`]
      || wishlistLabels[`Wishlist.Alert.${action}.message`]
      || '';
    const message = (productName && messageTemplate)
      ? messageTemplate.replace('{product}', productName)
      : wishlistMessages[action] || 'Wishlist updated';
    const type = (action === 'addError' || action === 'removeError') ? 'error' : 'success';
    showToast(message, type);
  });

  // Register a global cart toast notification site-wide
  events.on('cart/product/added', (items) => {
    const itemArray = Array.isArray(items) ? items : [items];
    const firstItem = itemArray[0];
    const name = firstItem?.name || firstItem?.product?.name;
    const message = name ? `Added "${name}" to cart` : 'Added product to cart';
    showToast(message, 'success');
  });
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

// UE Editor support before page load
if (IS_UE) {
  // eslint-disable-next-line import/no-unresolved
  await import(`${window.hlx.codeBasePath}/scripts/ue.js`).then(({ default: ue }) => ue());
}

loadPage();

(async function loadDa() {
  if (!IS_DA) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());
