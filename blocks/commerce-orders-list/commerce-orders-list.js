import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import { OrdersList } from '@dropins/storefront-account/containers/OrdersList.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import { readBlockConfig } from '../../scripts/aem.js';
import {
  checkIsAuthenticated,
  CUSTOMER_LOGIN_PATH,
  CUSTOMER_ORDER_DETAILS_PATH,
  CUSTOMER_ORDERS_PATH,
  CUSTOMER_RETURN_DETAILS_PATH,
  UPS_TRACKING_URL,
  rootLink,
  getProductLink,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

export default async function decorate(block) {
  const { 'minified-view': minifiedViewConfig = 'false' } = readBlockConfig(block);
  const isMinified = minifiedViewConfig === 'true';

  const createProductLink = (productData) => {
    // If product is null/undefined, it's been deleted from catalog
    if (!productData?.product) {
      return rootLink('#');
    }

    // Product exists in catalog, validate it has the required fields
    const { urlKey, topLevelSku } = productData;
    if (urlKey && topLevelSku) {
      return getProductLink(urlKey, topLevelSku);
    }
    return rootLink('#');
  };

  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
  } else {
    block.innerHTML = '';

    // Create the section header container to match Figma
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('commerce-account-section-header-container');

    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = isMinified ? 'Recent Order' : 'My Orders';
    headerContainer.appendChild(headingEl);

    // Render "View All" link next to Recent Order on dashboard
    if (isMinified) {
      const viewAllLink = document.createElement('a');
      viewAllLink.classList.add('commerce-account-section-link');
      viewAllLink.href = rootLink(CUSTOMER_ORDERS_PATH);
      viewAllLink.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="pink-svg" style="margin-right: 4px; vertical-align: middle;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>View All`;
      headerContainer.appendChild(viewAllLink);
    }

    block.appendChild(headerContainer);

    // Create container for the OrdersList Dropin
    const dropinContainer = document.createElement('div');
    dropinContainer.classList.add('commerce-orders-list-dropin');
    block.appendChild(dropinContainer);

    await accountRenderer.render(OrdersList, {
      minifiedView: isMinified,
      routeTracking: ({ carrier, number }) => {
        if (carrier === 'ups') {
          return `${UPS_TRACKING_URL}?tracknum=${number}`;
        }
        return '';
      },
      routeOrdersList: () => rootLink(CUSTOMER_ORDERS_PATH),
      routeOrderDetails: (orderNumber) => rootLink(`${CUSTOMER_ORDER_DETAILS_PATH}?orderRef=${orderNumber}`),
      routeReturnDetails: ({ orderNumber, returnNumber }) => rootLink(`${CUSTOMER_RETURN_DETAILS_PATH}?orderRef=${orderNumber}&returnRef=${returnNumber}`),
      routeOrderProduct: createProductLink,
      slots: {
        OrderItemImage: (ctx) => {
          const { data, defaultImageProps } = ctx;
          const anchor = document.createElement('a');
          anchor.href = createProductLink(ctx.data);

          tryRenderAemAssetsImage(ctx, {
            alias: data.product.sku,
            imageProps: defaultImageProps,
            wrapper: anchor,

            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },
      },
    })(dropinContainer);
  }
}
