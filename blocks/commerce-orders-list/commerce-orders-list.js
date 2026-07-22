import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import { OrdersList } from '@dropins/storefront-account/containers/OrdersList.js';
import { getOrderHistoryList } from '@dropins/storefront-account/api.js';
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

let orderItemsCache = null;
let isFetchingOrderItems = false;

/**
 * Fetches order items (product names & SKUs) for all customer orders
 * and returns a map keyed by order number.
 * @returns {Promise<Map<string, Array<{productName: string, sku: string, topLevelSku: string}>>>}
 */
async function fetchOrderItemsMap() {
  if (orderItemsCache) return orderItemsCache;
  if (isFetchingOrderItems) return new Map();

  isFetchingOrderItems = true;
  try {
    const data = await getOrderHistoryList(100, '{"viewAll":true}', 1);
    const map = new Map();
    if (data?.items) {
      data.items.forEach((order) => {
        const orderNum = String(order.number || order.id || '').trim().toLowerCase();
        const items = (order.items || []).map((item) => ({
          productName: (item.productName || '').toLowerCase(),
          sku: (item.sku || '').toLowerCase(),
          topLevelSku: (item.topLevelSku || '').toLowerCase(),
        }));
        if (orderNum) {
          map.set(orderNum, items);
          const unpadded = orderNum.replace(/^0+/, '');
          if (unpadded && unpadded !== orderNum) {
            map.set(unpadded, items);
          }
        }
      });
    }
    orderItemsCache = map;
  } catch (err) {
    orderItemsCache = new Map();
  } finally {
    isFetchingOrderItems = false;
  }
  return orderItemsCache;
}

/**
 * Reads data from a dropin card element and returns a structured object.
 * @param {Element} card - .account-orders-list-card element
 * @returns {object} Structured card data properties
 */
function extractCardData(card) {
  const content = card.querySelector('.account-orders-list-card__content');
  let orderNumber = '';
  let date = '';
  let total = '';
  let status = '';

  if (content) {
    Array.from(content.children).forEach((el) => {
      const text = el.textContent.trim();

      if (el.tagName === 'P' && text.toLowerCase().includes('order number:')) {
        orderNumber = text.replace(/^order number:\s*/i, '').trim();
      } else if (el.tagName === 'P' && text.toLowerCase().includes('placed on')) {
        date = text.replace(/^placed on\s*/i, '').trim();
      } else if (el.tagName === 'P' && el.querySelector('.dropin-price')) {
        // Grab only the price text (may have a label before it)
        const priceEl = el.querySelector('.dropin-price');
        total = priceEl ? priceEl.textContent.trim() : text;
      } else if (el.tagName === 'DIV') {
        status = text;
      }
    });
  }

  // Build clean action links with proper text labels
  const actionsEl = card.querySelector('.account-orders-list-card__actions');
  let actionsHtml = '';
  if (actionsEl) {
    const actionLinks = actionsEl.querySelectorAll('a.account-orders-list-action, button.account-orders-list-action');
    const parts = [];
    actionLinks.forEach((link, idx) => {
      const href = link.getAttribute('href') || '#';
      // Secondary actions may have descriptive text; primary action only has an SVG
      const labelText = link.textContent.replace(/\s+/g, ' ').trim();
      // Use 'View Order' if no readable text (only SVG rendered)
      const label = labelText || (idx === 0 ? 'View Order' : 'Action');
      parts.push(`<a href="${href}" class="orders-action-link">${label}</a>`);
    });
    actionsHtml = parts.join('<span class="orders-action-sep"> | </span>');
  }

  return {
    orderNumber, date, total, status, actionsHtml,
  };
}

/**
 * Builds a proper HTML <table> from the dropin's rendered card list.
 * Returns the table element, or null if no cards were found.
 * @param {Element} orderList - .account-orders-list element
 * @returns {HTMLTableElement|null}
 */
function buildTable(orderList) {
  const cards = orderList.querySelectorAll('.account-orders-list-card');
  if (!cards.length) return null;

  const table = document.createElement('table');
  table.classList.add('orders-table');

  // <thead>
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th scope="col">Order #</th>
      <th scope="col">Date</th>
      <th scope="col">Order Total</th>
      <th scope="col">Status</th>
      <th scope="col">Action</th>
    </tr>
  `;
  table.appendChild(thead);

  // <tbody>
  const tbody = document.createElement('tbody');

  cards.forEach((card) => {
    const {
      orderNumber, date, total, status, actionsHtml,
    } = extractCardData(card);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="orders-table__order-number" data-label="Order #">${orderNumber}</td>
      <td class="orders-table__date" data-label="Date">${date}</td>
      <td class="orders-table__total" data-label="Order Total">${total}</td>
      <td class="orders-table__status" data-label="Status">${status}</td>
      <td class="orders-table__actions" data-label="Action"></td>
    `;

    // Safely inject actionsHtml into the actions cell
    const actionsTd = tr.querySelector('.orders-table__actions');
    if (actionsHtml) {
      actionsTd.innerHTML = actionsHtml;
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

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

    // Mark block with minified modifier class for CSS scoping
    if (isMinified) {
      block.classList.add('commerce-orders-list--minified');
    }

    // Section header
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('commerce-account-section-header-container');

    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = isMinified ? 'Recent Order' : 'My Orders';
    headerContainer.appendChild(headingEl);

    // "View All" link shown on dashboard (minified view)
    if (isMinified) {
      const viewAllLink = document.createElement('a');
      viewAllLink.classList.add('commerce-account-section-link');
      viewAllLink.href = rootLink(CUSTOMER_ORDERS_PATH);
      viewAllLink.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 4px; vertical-align: middle;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>View All`;
      headerContainer.appendChild(viewAllLink);
    }

    block.appendChild(headerContainer);

    // Search input field (shown on full orders page)
    let searchInput = null;
    if (!isMinified) {
      const searchContainer = document.createElement('div');
      searchContainer.classList.add('orders-search-container');

      const searchBox = document.createElement('div');
      searchBox.classList.add('orders-search-box');

      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.classList.add('orders-search-input');
      searchInput.placeholder = 'Search by SKU or Product Name';
      searchInput.setAttribute('aria-label', 'Search by SKU or Product Name');

      const searchIcon = document.createElement('span');
      searchIcon.classList.add('orders-search-icon');
      searchIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      `;

      searchBox.appendChild(searchInput);
      searchBox.appendChild(searchIcon);
      searchContainer.appendChild(searchBox);
      block.appendChild(searchContainer);
    }

    // Hidden dropin container — the dropin renders here; we read its output
    // and produce a proper <table> in the visible area.
    const dropinContainer = document.createElement('div');
    dropinContainer.classList.add('commerce-orders-list-dropin');
    dropinContainer.setAttribute('aria-hidden', 'true');
    dropinContainer.style.display = 'none';
    block.appendChild(dropinContainer);

    // Visible area: date filter placeholder + table placeholder
    const filterPlaceholder = document.createElement('div');
    filterPlaceholder.classList.add('orders-filter-container');
    block.appendChild(filterPlaceholder);

    const tableContainer = document.createElement('div');
    tableContainer.classList.add('orders-table-container');
    block.appendChild(tableContainer);

    // Render dropin (hidden)
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

    /**
     * Filters displayed orders based on search query matching Order ID, SKU, or Product Name.
     */
    const filterOrders = () => {
      if (!searchInput) return;
      const rawQuery = searchInput.value.trim().toLowerCase();
      const table = tableContainer.querySelector('.orders-table');
      if (!table) return;

      const rows = table.querySelectorAll('tbody tr');
      let visibleCount = 0;

      rows.forEach((tr) => {
        if (!rawQuery) {
          tr.style.display = '';
          visibleCount += 1;
          return;
        }

        const orderNumEl = tr.querySelector('.orders-table__order-number');
        const orderNum = orderNumEl ? orderNumEl.textContent.trim().toLowerCase() : '';
        const unpaddedOrderNum = orderNum.replace(/^0+/, '');
        const unpaddedQuery = rawQuery.replace(/^0+/, '');
        const rowText = tr.textContent.toLowerCase();

        // 1. Check Order ID & row text match
        let matches = orderNum.includes(rawQuery)
          || (unpaddedOrderNum && unpaddedQuery && unpaddedOrderNum.includes(unpaddedQuery))
          || rowText.includes(rawQuery);

        // 2. Check SKU & Product Name match from order items cache
        if (!matches && orderItemsCache) {
          const items = orderItemsCache.get(orderNum)
            || (unpaddedOrderNum ? orderItemsCache.get(unpaddedOrderNum) : null);
          if (items && items.length > 0) {
            matches = items.some(
              (item) => item.productName.includes(rawQuery)
                || item.sku.includes(rawQuery)
                || item.topLevelSku.includes(rawQuery),
            );
          }
        }

        if (matches) {
          tr.style.display = '';
          visibleCount += 1;
        } else {
          tr.style.display = 'none';
        }
      });

      let emptyMsg = tableContainer.querySelector('.orders-search-empty');
      if (visibleCount === 0 && rawQuery !== '') {
        table.style.display = 'none';
        if (!emptyMsg) {
          emptyMsg = document.createElement('p');
          emptyMsg.classList.add('orders-empty', 'orders-search-empty');
          emptyMsg.textContent = 'No orders found matching your search.';
          tableContainer.appendChild(emptyMsg);
        } else {
          emptyMsg.style.display = '';
        }
      } else {
        table.style.display = '';
        if (emptyMsg) {
          emptyMsg.style.display = 'none';
        }
      }
    };

    /**
     * Moves the date filter from the dropin container to the visible filter area,
     * then rebuilds the HTML table from the dropin's rendered cards.
     */
    const rebuildTable = () => {
      const orderList = dropinContainer.querySelector('.account-orders-list');
      if (!orderList) return;

      // Move the date filter above the table (only on full orders page)
      if (!isMinified) {
        const filterEl = orderList.querySelector('.account-orders-list__date-select');
        if (filterEl && !filterPlaceholder.contains(filterEl)) {
          filterPlaceholder.innerHTML = '';
          filterPlaceholder.appendChild(filterEl);
        }
      }

      // Build the table
      const table = buildTable(orderList);

      // Preserve the dropin's own "View all orders" footer link (minified view)
      const footerLink = orderList.querySelector('.account-orders-list-action--minifiedView');

      // Repaint the table container
      tableContainer.innerHTML = '';

      if (table) {
        tableContainer.appendChild(table);
      } else {
        // Render empty state from dropin if no orders
        const emptyState = dropinContainer.querySelector('.account-orders-list__empty');
        if (emptyState) {
          tableContainer.appendChild(emptyState.cloneNode(true));
        } else {
          tableContainer.innerHTML = '<p class="orders-empty">You have placed no orders.</p>';
        }
      }

      // Re-attach the dropin's footer link for minified view
      if (isMinified && footerLink) {
        const footerWrapper = document.createElement('div');
        footerWrapper.classList.add('orders-footer-link');
        footerWrapper.appendChild(footerLink.cloneNode(true));
        tableContainer.appendChild(footerWrapper);
      }

      if (searchInput) {
        filterOrders();
        fetchOrderItemsMap().then(() => {
          filterOrders();
        });
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', filterOrders);
    }

    // Observe dropin for initial render and any re-renders (filter change, pagination)
    let rebuildTimer = null;
    const observer = new MutationObserver(() => {
      // Debounce rapid mutations during render
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(rebuildTable, 50);
    });
    observer.observe(dropinContainer, { childList: true, subtree: true });

    // Attempt immediate rebuild in case dropin already rendered synchronously
    rebuildTable();
  }
}
