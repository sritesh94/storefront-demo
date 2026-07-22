import { render as orderRenderer } from '@dropins/storefront-order/render.js';
import { OrderProductList } from '@dropins/storefront-order/containers/OrderProductList.js';
import GiftOptions from '@dropins/storefront-cart/containers/GiftOptions.js';
import { render as CartProvider } from '@dropins/storefront-cart/render.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';

// Initialize
import '../../scripts/initializers/order.js';
import { getProductLink, rootLink } from '../../scripts/commerce.js';

/**
 * Reads data from a dropin cart-item element.
 * @param {Element} item - .dropin-cart-item element
 * @returns {object} Extracted item data
 */
function extractItemData(item) {
  const nameEl = item.querySelector('.dropin-cart-item__title, .cart-summary-item__title');
  const name = nameEl ? nameEl.textContent.trim() : '';
  const nameHref = nameEl ? nameEl.getAttribute('href') : '#';

  const skuEl = item.querySelector('.dropin-cart-item__sku');
  const sku = skuEl ? skuEl.textContent.trim().replace(/^SKU:\s*/i, '').trim() : '';

  // Price: may contain "N x $price" — extract just the unit price
  const priceEl = item.querySelector('.dropin-cart-item__price .dropin-price');
  let price = priceEl ? priceEl.textContent.trim() : '';
  // If price text is like "1 x $26.00", extract the dollar amount
  const priceMatch = price.match(/\$[\d,.]+/);
  if (priceMatch) [price] = priceMatch;

  // Quantity: try from the price text "N x" format or quantity element
  const qtyEl = item.querySelector('.dropin-cart-item__quantity');
  let qty = qtyEl ? qtyEl.textContent.trim() : '';
  if (!qty) {
    const rawPrice = item.querySelector('.dropin-cart-item__price')?.textContent?.trim() || '';
    const qtyMatch = rawPrice.match(/^(\d+)\s*x/i);
    if (qtyMatch) [, qty] = qtyMatch;
  }
  // Also try from the price container's own text if it says "N x $price"
  if (!qty) {
    const priceContainer = item.querySelector('.dropin-cart-item__price');
    const rawText = priceContainer ? priceContainer.textContent.trim() : '';
    const qtyMatch2 = rawText.match(/^(\d+)\s*x/i);
    if (qtyMatch2) [, qty] = qtyMatch2;
  }
  // Default to 1 if no quantity is found (e.g. for single item orders)
  if (!qty) {
    qty = '1';
  }

  // Row total (subtotal for the row)
  const totalEl = item.querySelector('.dropin-cart-item__row-total .dropin-price, .dropin-cart-item__total .dropin-price');
  const subtotal = totalEl ? totalEl.textContent.trim() : '';

  return {
    name, nameHref, sku, price, qty, subtotal,
  };
}

/**
 * Reads data from the dropin's cost summary section.
 * @param {Element} costEl - .order-cost-summary-content__wrapper element
 * @returns {{ subtotal: string, shipping: string, tax: string, grandTotal: string }}
 */
function extractCostData(costEl) {
  // Subtotal row: grab just the price span
  const getPrice = (selector) => {
    const row = costEl.querySelector(selector);
    if (!row) return '';
    const price = row.querySelector('.dropin-price, .order-cost-summary-content__price');
    return price ? price.textContent.trim() : row.textContent.trim();
  };

  return {
    subtotal: getPrice('[class*="subtotal"]'),
    shipping: getPrice('[class*="shipping"]'),
    tax: getPrice('[class*="tax"]'),
    grandTotal: getPrice('[class*="total"]:not([class*="subtotal"])'),
  };
}

/**
 * Builds the Magento-style Items Ordered table.
 */
function buildItemsTable(dropinEl, costBlock) {
  // Find all product items
  const items = dropinEl.querySelectorAll('.dropin-cart-item');
  if (!items.length) return null;

  const wrapper = document.createElement('div');
  wrapper.classList.add('order-items-table-wrapper');

  // Section heading
  const heading = document.createElement('h2');
  heading.classList.add('order-details-items-heading');
  heading.textContent = 'Items Ordered';
  wrapper.appendChild(heading);

  // ── Inner container wrapping both tables ──
  const tablesInner = document.createElement('div');
  tablesInner.classList.add('order-tables-inner');

  // Build <table>
  const table = document.createElement('table');
  table.classList.add('order-items-table');

  // <thead>
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th scope="col" class="col-name">Product Name</th>
      <th scope="col" class="col-sku">SKU</th>
      <th scope="col" class="col-price">Price</th>
      <th scope="col" class="col-qty">Qty</th>
      <th scope="col" class="col-subtotal">Subtotal</th>
    </tr>
  `;
  table.appendChild(thead);

  // <tbody>
  const tbody = document.createElement('tbody');
  items.forEach((item) => {
    const {
      name, nameHref, sku, price, qty, subtotal,
    } = extractItemData(item);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-name" data-label="Product Name"><a href="${nameHref}">${name}</a></td>
      <td class="col-sku" data-label="SKU">${sku}</td>
      <td class="col-price" data-label="Price">${price}</td>
      <td class="col-qty" data-label="Qty"><span class="qty-ordered">${qty}</span></td>
      <td class="col-subtotal" data-label="Subtotal">${subtotal}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tablesInner.appendChild(table);

  // ── Order Totals ──
  const costWrapper = costBlock ? costBlock.querySelector('.order-cost-summary-content__wrapper') : null;
  if (costWrapper) {
    const {
      subtotal, shipping, tax, grandTotal,
    } = extractCostData(costWrapper);

    const totalsTable = document.createElement('table');
    totalsTable.classList.add('order-totals-table');
    totalsTable.innerHTML = `
      <tbody>
        <tr class="totals-subtotal">
          <td class="totals-label">Subtotal</td>
          <td class="totals-value">${subtotal}</td>
        </tr>
        <tr class="totals-shipping">
          <td class="totals-label">Shipping &amp; Handling</td>
          <td class="totals-value">${shipping}</td>
        </tr>
        <tr class="totals-tax">
          <td class="totals-label">Tax</td>
          <td class="totals-value">${tax}</td>
        </tr>
        <tr class="totals-grand-total">
          <td class="totals-label">Grand Total</td>
          <td class="totals-value">${grandTotal}</td>
        </tr>
      </tbody>
    `;
    tablesInner.appendChild(totalsTable);
  }

  wrapper.appendChild(tablesInner);

  return wrapper;
}

export default async function decorate(block) {
  const createProductLink = (productData) => {
    if (!productData) {
      return rootLink('#');
    }
    const { product, productUrlKey } = productData;
    if (!product || !productUrlKey || !product.sku) {
      return rootLink('#');
    }
    return getProductLink(productUrlKey, product.sku);
  };

  // Hidden dropin container (data source)
  const dropinContainer = document.createElement('div');
  dropinContainer.classList.add('order-product-list-dropin-source');
  dropinContainer.style.display = 'none';
  block.appendChild(dropinContainer);

  // Visible table container
  const tableContainer = document.createElement('div');
  tableContainer.classList.add('order-product-list-table-container');
  block.appendChild(tableContainer);

  await orderRenderer.render(OrderProductList, {
    slots: {
      CartSummaryItemImage: (ctx) => {
        const { data, defaultImageProps } = ctx;
        const anchor = document.createElement('a');
        anchor.href = createProductLink(data);

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
      Footer: (ctx) => {
        const giftOptions = document.createElement('div');

        CartProvider.render(GiftOptions, {
          item: ctx.item,
          view: 'product',
          dataSource: 'order',
          isEditable: false,
          slots: {
            SwatchImage: (swatchCtx) => {
              const { defaultImageProps, imageSwatchContext } = swatchCtx;
              tryRenderAemAssetsImage(swatchCtx, {
                alias: imageSwatchContext.label,
                imageProps: defaultImageProps,
                wrapper: document.createElement('span'),

                params: {
                  width: defaultImageProps.width,
                  height: defaultImageProps.height,
                },
              });
            },
          },
        })(giftOptions);

        ctx.appendChild(giftOptions);
      },
    },
    routeProductDetails: createProductLink,
  })(dropinContainer);

  /**
   * Rebuilds the visible table from the dropin's rendered items.
   * Guard flag prevents re-entrant calls triggered by the observer
   * seeing its own DOM writes to tableContainer.
   */
  let isRebuilding = false;
  let debounceTimer = null;

  const rebuildTable = () => {
    if (isRebuilding) return;
    const items = dropinContainer.querySelectorAll('.dropin-cart-item');
    if (!items.length) return;

    // Fetch the cost summary block from the document
    const costBlock = document.querySelector('.commerce-order-cost-summary');

    isRebuilding = true;
    try {
      const tableWrapper = buildItemsTable(dropinContainer, costBlock);
      tableContainer.innerHTML = '';
      if (tableWrapper) {
        tableContainer.appendChild(tableWrapper);
      }
    } finally {
      isRebuilding = false;
    }
  };

  // Observe ONLY the hidden dropin source container for changes.
  // Do NOT observe block.parentElement — that scope includes tableContainer,
  // causing the observer to fire on its own DOM writes (infinite loop).
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildTable, 80);
  });

  observer.observe(dropinContainer, { childList: true, subtree: true });

  // One-time fallback: rebuild after 800ms to pick up any late-rendering
  // sibling blocks (e.g. commerce-order-cost-summary) that may not have
  // been in the DOM at initial render time.
  setTimeout(rebuildTable, 800);

  // Attempt immediate rebuild
  rebuildTable();
}
