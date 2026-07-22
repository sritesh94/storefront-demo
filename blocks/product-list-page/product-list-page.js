// Product Discovery Dropins
import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import Facets from '@dropins/storefront-product-discovery/containers/Facets.js';
import SortBy from '@dropins/storefront-product-discovery/containers/SortBy.js';
import Pagination from '@dropins/storefront-product-discovery/containers/Pagination.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { search } from '@dropins/storefront-product-discovery/api.js';
// Wishlist Dropin
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
// Cart Dropin
import * as cartApi from '@dropins/storefront-cart/api.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
// Event Bus
import { events } from '@dropins/tools/event-bus.js';
// AEM
import { readBlockConfig } from '../../scripts/aem.js';
import {
  fetchPlaceholders, getProductLink, rootLink, checkIsAuthenticated, CUSTOMER_LOGIN_PATH,
} from '../../scripts/commerce.js';
import { getSearchStateFromUrl, applySearchStateToUrl } from './search-url.js';
import {
  addCompareProduct,
  removeCompareProduct,
  isCompared,
} from '../../scripts/components/compare/compare.js';

// Initializers
import '../../scripts/initializers/search.js';
import '../../scripts/initializers/wishlist.js';

export default async function decorate(block) {
  const labels = await fetchPlaceholders();

  const config = readBlockConfig(block);
  const pageSize = parseInt(config.pagesize, 10) || 9;

  const fragment = document.createRange().createContextualFragment(`
    <div class="search__wrapper">
      <div class="search__result-info"></div>
      <div class="search__view-facets"></div>
      <div class="search__facets"></div>
      <div class="search__product-sort"></div>
      <div class="search__product-list"></div>
      <div class="search__pagination"></div>
    </div>
  `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $pagination = fragment.querySelector('.search__pagination');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Add url path back to the block for enrichment, incase enrichment block is
  // executed after the plp block and block config is not available
  if (config.urlpath) {
    block.dataset.urlpath = config.urlpath;
  }

  const searchState = getSearchStateFromUrl(new URL(window.location.href));

  // Default visibility filter for all of our requests
  const visibilityFilter = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };
  const userFilters = searchState.filter.filter((f) => f.attribute !== 'visibility');

  // Normalize URL (e.g. pipe-separated filter values)
  const normalizedUrl = new URL(window.location.href);
  applySearchStateToUrl(normalizedUrl, searchState);
  window.history.replaceState({}, '', normalizedUrl.toString());

  // Request search based on the page type on block load
  if (config.urlpath) {
    // If it's a category page...
    await search({
      phrase: '', // search all products in the category
      currentPage: searchState.currentPage,
      pageSize,
      sort: searchState?.sort?.length ? searchState.sort : [{ attribute: 'position', direction: 'DESC' }],
      filter: [
        { attribute: 'categoryPath', eq: config.urlpath }, // Add category filter
        // Always add visibility filter to the request
        visibilityFilter,
        ...userFilters,
      ],
    }).catch(() => {
      console.error('Error searching for products');
    });
  } else {
    // Search page: dropin uses only the request (no URL parsing).
    await search({
      phrase: searchState.phrase,
      currentPage: searchState.currentPage,
      pageSize,
      sort: searchState.sort,
      // Always add visibility filter to the request
      filter: [visibilityFilter, ...userFilters],
    }).catch((e) => {
      console.error('Error searching for products', e);
    });
  }

  const getAddToCartButton = (product) => {
    if (product.typename === 'ComplexProductView') {
      const button = document.createElement('div');
      UI.render(Button, {
        children: labels.Global?.AddProductToCart,
        icon: Icon({ source: 'Cart' }),
        href: getProductLink(product.urlKey, product.sku),
        variant: 'primary',
      })(button);
      return button;
    }
    const button = document.createElement('div');
    UI.render(Button, {
      children: labels.Global?.AddProductToCart,
      icon: Icon({ source: 'Cart' }),
      onClick: () => cartApi.addProductsToCart([{ sku: product.sku, quantity: 1 }]),
      variant: 'primary',
      disabled: !product.inStock,
    })(button);
    return button;
  };

  const mediaQuery = window.matchMedia('(max-width: 899px)');

  const renderFilterButton = (target) => {
    UI.render(Button, {
      children: labels.Global?.Filters,
      icon: Icon({ source: new URL(`${window.hlx.codeBasePath}/icons/filter.svg`, window.location.origin).href }),
      variant: 'secondary',
      onClick: () => {
        $facets.classList.toggle('search__facets--visible');
      },
    })(target);
  };

  const setupMobileToggles = () => {
    $viewFacets.innerHTML = '';

    const $filterBtnContainer = document.createElement('div');
    $filterBtnContainer.className = 'search__filter-btn-container';
    $viewFacets.appendChild($filterBtnContainer);

    const $toggleContainer = document.createElement('div');
    $toggleContainer.className = 'search__layout-toggles';
    $viewFacets.appendChild($toggleContainer);

    $toggleContainer.innerHTML = `
      <button type="button" class="search__layout-toggle search__layout-toggle--grid" aria-label="Grid View">
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2.08333C0 0.93274 0.93274 0 2.08333 0H6.25C7.40059 0 8.33333 0.93274 8.33333 2.08333V6.25C8.33333 7.40059 7.40059 8.33333 6.25 8.33333H2.08333C0.93274 8.33333 0 7.40059 0 6.25V2.08333ZM2.08333 1.66667C1.85321 1.66667 1.66667 1.85321 1.66667 2.08333V6.25C1.66667 6.48012 1.85321 6.66667 2.08333 6.66667H6.25C6.48012 6.66667 6.66667 6.48012 6.66667 6.25V2.08333C6.66667 1.85321 6.48012 1.66667 6.25 1.66667H2.08333Z" fill="currentColor"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 12.0833C0 10.9327 0.93274 10 2.08333 10H6.25C7.40059 10 8.33333 10.9327 8.33333 12.0833V16.25C8.33333 17.4006 7.40059 18.3333 6.25 18.3333H2.08333C0.93274 18.3333 0 17.4006 0 16.25V12.0833ZM2.08333 11.6667C1.85321 11.6667 1.66667 11.8532 1.66667 12.0833V16.25C1.66667 16.4801 1.85321 16.6667 2.08333 16.6667H6.25C6.48012 16.6667 6.66667 16.4801 6.66667 16.25V12.0833C6.66667 11.8532 6.48012 11.6667 6.25 11.6667H2.08333Z" fill="currentColor"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M10 2.08333C10 0.93274 10.9327 0 12.0833 0H16.25C17.4006 0 18.3333 0.93274 18.3333 2.08333V6.25C18.3333 7.40059 17.4006 8.33333 16.25 8.33333H12.0833C10.9327 8.33333 10 7.40059 10 6.25V2.08333ZM12.0833 1.66667C11.8532 1.66667 11.6667 1.85321 11.6667 2.08333V6.25C11.6667 6.48012 11.8532 6.66667 12.0833 6.66667H16.25C16.4801 6.66667 16.6667 6.48012 16.6667 6.25V2.08333C16.6667 1.85321 16.4801 1.66667 16.25 1.66667H12.0833Z" fill="currentColor"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M10 12.0833C10 10.9327 10.9327 10 12.0833 10H16.25C17.4006 10 18.3333 10.9327 18.3333 12.0833V16.25C18.3333 17.4006 17.4006 18.3333 16.25 18.3333H12.0833C10.9327 18.3333 10 17.4006 10 16.25V12.0833ZM12.0833 11.6667C11.8532 11.6667 11.6667 11.8532 11.6667 12.0833V16.25C11.6667 16.4801 11.8532 16.6667 12.0833 16.6667H16.25C16.4801 16.6667 16.6667 16.4801 16.6667 16.25V12.0833C16.6667 11.8532 16.4801 11.6667 16.25 11.6667H12.0833Z" fill="currentColor"/>
        </svg>
      </button>
      <button type="button" class="search__layout-toggle search__layout-toggle--list" aria-label="List View">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M17.5 2.5H2.5V17.5H17.5V2.5ZM1 1V19H19V1H1Z" fill="currentColor"/>
        </svg>
      </button>
    `;

    renderFilterButton($filterBtnContainer);

    const setViewMode = (view) => {
      localStorage.setItem('plp-view-mode', view);
      const gridBtn = $toggleContainer.querySelector('.search__layout-toggle--grid');
      const listBtn = $toggleContainer.querySelector('.search__layout-toggle--list');

      if (view === 'list') {
        block.classList.add('list-view');
        gridBtn?.classList.remove('active');
        listBtn?.classList.add('active');
      } else {
        block.classList.remove('list-view');
        gridBtn?.classList.add('active');
        listBtn?.classList.remove('active');
      }
    };

    const savedView = localStorage.getItem('plp-view-mode') || 'grid';
    setViewMode(savedView);

    $toggleContainer.querySelector('.search__layout-toggle--grid').addEventListener('click', () => setViewMode('grid'));
    $toggleContainer.querySelector('.search__layout-toggle--list').addEventListener('click', () => setViewMode('list'));
  };

  const removeMobileToggles = () => {
    $viewFacets.innerHTML = '';
    block.classList.remove('list-view');
    renderFilterButton($viewFacets);
  };

  const handleMediaChange = (e) => {
    if (e.matches) {
      setupMobileToggles();
    } else {
      removeMobileToggles();
    }
  };

  mediaQuery.addEventListener('change', handleMediaChange);

  if (mediaQuery.matches) {
    setupMobileToggles();
  } else {
    renderFilterButton($viewFacets);
  }

  await Promise.all([
    // Sort By
    provider.render(SortBy, {})($productSort),

    // Pagination
    provider.render(Pagination, {
      onPageChange: () => {
        // scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    })($pagination),

    // Facets
    provider.render(Facets, {})($facets),
    // Product List
    provider.render(SearchResults, {
      routeProduct: (product) => getProductLink(product.urlKey, product.sku),
      slots: {
        ProductImage: (ctx) => {
          const { product, defaultImageProps } = ctx;
          const anchorWrapper = document.createElement('a');
          anchorWrapper.href = getProductLink(product.urlKey, product.sku);

          tryRenderAemAssetsImage(ctx, {
            alias: product.sku,
            imageProps: defaultImageProps,
            wrapper: anchorWrapper,
            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },
        ProductActions: (ctx) => {
          const actionsWrapper = document.createElement('div');
          actionsWrapper.className = 'product-discovery-product-actions';
          // Add to Cart Button
          const addToCartBtn = getAddToCartButton(ctx.product);
          addToCartBtn.classList.add('product-discovery-product-actions__add-to-cart');
          // Wishlist Button
          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('product-discovery-product-actions__wishlist-toggle');
          wishlistRender.render(WishlistToggle, {
            product: ctx.product,
            variant: 'tertiary',
            ...(!checkIsAuthenticated() && {
              onClick: (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                const redirectUrl = encodeURIComponent(
                  window.location.pathname + window.location.search,
                );
                window.location.href = `${rootLink(CUSTOMER_LOGIN_PATH)}?redirect=${redirectUrl}`;
              },
            }),
          })($wishlistToggle);
          // Compare Button
          const compareBtn = document.createElement('button');
          compareBtn.className = 'product-discovery-product-actions__compare-toggle';
          compareBtn.type = 'button';
          compareBtn.innerHTML = `
            <img
              src="../../icons/compare.svg"
              alt="Compare"
              width="24"
              height="24"
            />
          `;
          if (isCompared(ctx.product.sku)) {
            compareBtn.classList.add('active');
          }
          compareBtn.addEventListener('click', () => {
            if (isCompared(ctx.product.sku)) {
              removeCompareProduct(ctx.product.sku);
              compareBtn.classList.remove('active');
            } else {
              const result = addCompareProduct(ctx.product.sku);
              if (!result.success) {
                const error = document.createElement('div');
                error.className = 'compare-error';
                error.textContent = result.message;
                actionsWrapper.append(error);
                return;
              }
              compareBtn.classList.add('active');
            }
          });
          actionsWrapper.appendChild(addToCartBtn);
          actionsWrapper.appendChild($wishlistToggle);
          actionsWrapper.appendChild(compareBtn);
          ctx.replaceWith(actionsWrapper);
        },
      },
    })($productList),
  ]);

  // Listen for search results (event is fired before the block is rendered; eager: true)
  events.on('search/result', (payload) => {
    const totalCount = payload.result?.totalCount || 0;

    block.classList.toggle('product-list-page--empty', totalCount === 0);

    // Results Info
    $resultInfo.innerHTML = payload.request?.phrase
      ? `${totalCount} results found for <strong>"${payload.request.phrase}"</strong>.`
      : `${totalCount} results found.`;

    // Update the view facets button with the number of filters
    if (payload.request.filter.length > 0) {
      $viewFacets.querySelector('button').setAttribute('data-count', payload.request.filter.length);
    } else {
      $viewFacets.querySelector('button').removeAttribute('data-count');
    }
  }, { eager: true });

  // Listen for search results (event is fired after the block is rendered; eager: false)
  // URL is owned by this project; update it when search state changes.
  events.on('search/result', (payload) => {
    const url = new URL(window.location.href);
    applySearchStateToUrl(url, payload.request);
    window.history.pushState({}, '', url.toString());
  }, { eager: false });

  // Facet Accordion State Management
  const openFacets = new Set();
  let initializedOpen = false;

  const updateAccordionStates = () => {
    const facets = $facets.querySelectorAll('.product-discovery-facet');
    facets.forEach((facet) => {
      const header = facet.querySelector('.product-discovery-facet__header');
      if (!header) return;
      const title = header.textContent.trim();

      // Default to open on first load
      if (!initializedOpen) {
        openFacets.add(title);
      }

      if (openFacets.has(title)) {
        facet.classList.add('is-open');
      } else {
        facet.classList.remove('is-open');
      }
    });

    if (facets.length > 0) {
      initializedOpen = true;
    }
  };

  // Toggle open/closed state on click
  $facets.addEventListener('click', (e) => {
    const header = e.target.closest('.product-discovery-facet__header');
    if (header) {
      const facet = header.closest('.product-discovery-facet');
      if (facet) {
        const title = header.textContent.trim();
        if (openFacets.has(title)) {
          openFacets.delete(title);
          facet.classList.remove('is-open');
        } else {
          openFacets.add(title);
          facet.classList.add('is-open');
        }
      }
    }
  });

  // Watch for Preact updates to re-apply the is-open class
  const facetObserver = new MutationObserver(() => {
    updateAccordionStates();
  });
  facetObserver.observe($facets, { childList: true, subtree: true });
}
