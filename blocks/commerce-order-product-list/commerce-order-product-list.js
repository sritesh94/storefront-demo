import { events } from '@dropins/tools/event-bus.js';
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
 * Determines which Magento-style tabs to display based on order data & DOM items.
 */
function getTabAvailability(orderData) {
  const status = (orderData?.status || '').toUpperCase();
  const items = orderData?.items || [];
  const shipments = orderData?.shipments || [];
  const returns = orderData?.returns || [];

  const hasInvoicedQty = items.some((item) => (item.quantityInvoiced ?? 0) > 0);
  const hasShippedQty = items.some((item) => (item.quantityShipped ?? 0) > 0);
  const hasRefundedQty = items.some((item) => (item.quantityRefunded ?? 0) > 0);

  const closedOrComplete = ['CLOSED', 'COMPLETE'].includes(status);
  const processingOrShipped = ['PROCESSING', 'SHIPPED', 'INVOICED'].includes(status);

  const hasInvoices = (orderData?.invoices?.length > 0)
    || hasInvoicedQty
    || closedOrComplete
    || processingOrShipped;

  const hasShipments = (shipments.length > 0)
    || hasShippedQty
    || ['SHIPPED', 'COMPLETE', 'CLOSED'].includes(status);

  const hasRefunds = (returns.length > 0)
    || hasRefundedQty
    || ['CLOSED', 'REFUNDED', 'CREDIT MEMO'].includes(status);

  return { hasInvoices, hasShipments, hasRefunds };
}

/**
 * Extracts options (e.g. Size, Color) from order item.
 */
function extractItemOptions(item) {
  const options = [];
  if (Array.isArray(item.configurableOptions)) {
    item.configurableOptions.forEach((opt) => {
      if (opt.optionLabel && opt.valueLabel) {
        options.push({ label: opt.optionLabel, value: opt.valueLabel });
      }
    });
  } else if (Array.isArray(item.selectedOptions)) {
    item.selectedOptions.forEach((opt) => {
      if (opt.label && opt.value) {
        options.push({ label: opt.label, value: opt.value });
      }
    });
  }
  return options;
}

/**
 * Builds the Magento-style Items / Invoices / Shipments / Refunds tabbed section.
 */
function buildItemsTable(dropinEl, costBlock, currentTab, orderData, onTabChange) {
  const domItems = dropinEl.querySelectorAll('.dropin-cart-item');
  if (!domItems.length && !orderData?.items?.length) return null;

  const { hasInvoices, hasShipments, hasRefunds } = getTabAvailability(orderData);

  const wrapper = document.createElement('div');
  wrapper.classList.add('order-items-table-wrapper');

  // Tab Header Bar
  const tabHeader = document.createElement('div');
  tabHeader.classList.add('order-details-tabs-header');

  const tabs = [
    { id: 'items', label: 'Items Ordered', show: true },
    { id: 'invoices', label: 'Invoices', show: hasInvoices },
    { id: 'shipments', label: 'Order Shipments', show: hasShipments },
    { id: 'refunds', label: 'Refunds', show: hasRefunds },
  ];

  tabs.forEach((tab) => {
    if (!tab.show) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('order-tab-btn');
    if (tab.id === currentTab) btn.classList.add('active');
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      if (currentTab !== tab.id && onTabChange) {
        onTabChange(tab.id);
      }
    });
    tabHeader.appendChild(btn);
  });
  wrapper.appendChild(tabHeader);

  // Inner container wrapping table and totals
  const tablesInner = document.createElement('div');
  tablesInner.classList.add('order-tables-inner');

  // Extract reference numbers
  const searchParams = new URLSearchParams(window.location.search);
  const fallbackNum = searchParams.get('orderRef') || '000000015';
  const orderNum = orderData?.number || orderData?.id || fallbackNum;
  const invoiceNumber = orderData?.invoices?.[0]?.number || orderNum;
  const shipmentNumber = orderData?.shipments?.[0]?.number
    || orderData?.shipments?.[0]?.id
    || orderNum;
  const refundNumber = orderData?.returns?.[0]?.number
    || orderData?.returns?.[0]?.id
    || orderNum;

  // Sub-header for specific tabs (Invoices, Shipments, Refunds)
  let subHeader = null;
  if (currentTab === 'invoices') {
    subHeader = document.createElement('div');
    subHeader.classList.add('order-sub-header');
    subHeader.innerHTML = `
      <div class="action-bar-top">
        <a href="#" class="action print-link">Print All Invoices</a>
      </div>
      <div class="order-title-block">
        <h3 class="order-sub-title">Invoice #${invoiceNumber}</h3>
        <a href="#" class="action print-link-inline">Print Invoice</a>
      </div>
    `;
  } else if (currentTab === 'shipments') {
    subHeader = document.createElement('div');
    subHeader.classList.add('order-sub-header');
    subHeader.innerHTML = `
      <div class="action-bar-top">
        <a href="#" class="action print-link">Print All Shipments</a>
      </div>
      <div class="order-title-block">
        <h3 class="order-sub-title">Shipment #${shipmentNumber}</h3>
        <a href="#" class="action print-link-inline">Print Shipment</a>
        <a href="#" class="action track-shipment-link">Track this shipment</a>
      </div>
    `;
  } else if (currentTab === 'refunds') {
    subHeader = document.createElement('div');
    subHeader.classList.add('order-sub-header');
    subHeader.innerHTML = `
      <div class="action-bar-top">
        <a href="#" class="action print-link">Print All Refunds</a>
      </div>
      <div class="order-title-block">
        <h3 class="order-sub-title">Refund #${refundNumber}</h3>
        <a href="#" class="action print-link-inline">Print Refund</a>
      </div>
    `;
  }

  if (subHeader) {
    subHeader.querySelectorAll('.print-link, .print-link-inline').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    });

    const trackLink = subHeader.querySelector('.track-shipment-link');
    if (trackLink) {
      trackLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }

    tablesInner.appendChild(subHeader);
  }

  // Items Data (from event payload or DOM fallback)
  const itemsData = (orderData?.items && orderData.items.length > 0)
    ? orderData.items.map((item) => {
      const priceVal = item.price?.value !== undefined
        ? item.price.value
        : (item.productSalePrice?.value || 0);
      const formattedPrice = `$${Number(priceVal).toFixed(2)}`;
      const totalVal = item.total?.value !== undefined
        ? item.total.value
        : (priceVal * (item.quantityOrdered || 1));
      const formattedSubtotal = `$${Number(totalVal).toFixed(2)}`;

      return {
        name: item.productName || item.product?.name || '',
        nameHref: item.productUrlKey
          ? getProductLink(item.productUrlKey, item.productSku || item.product?.sku)
          : rootLink('#'),
        sku: item.productSku || item.product?.sku || '',
        price: formattedPrice,
        qtyOrdered: item.quantityOrdered || 1,
        qtyInvoiced: item.quantityInvoiced || item.quantityOrdered || 1,
        qtyShipped: item.quantityShipped || item.quantityOrdered || 1,
        qtyRefunded: item.quantityRefunded || item.quantityOrdered || 1,
        subtotal: formattedSubtotal,
        discount: '$0.00',
        rowTotal: formattedSubtotal,
        options: extractItemOptions(item),
      };
    })
    : Array.from(domItems).map((el) => ({
      ...extractItemData(el),
      qtyOrdered: extractItemData(el).qty,
      qtyInvoiced: extractItemData(el).qty,
      qtyShipped: extractItemData(el).qty,
      qtyRefunded: extractItemData(el).qty,
      discount: '$0.00',
      rowTotal: extractItemData(el).subtotal,
      options: [],
    }));

  // Build <table>
  const table = document.createElement('table');
  table.classList.add('order-items-table');

  const thead = document.createElement('thead');
  if (currentTab === 'items') {
    thead.innerHTML = `
      <tr>
        <th scope="col" class="col-name">Product Name</th>
        <th scope="col" class="col-sku">SKU</th>
        <th scope="col" class="col-price">Price</th>
        <th scope="col" class="col-qty">Qty</th>
        <th scope="col" class="col-subtotal">Subtotal</th>
      </tr>
    `;
  } else if (currentTab === 'invoices') {
    thead.innerHTML = `
      <tr>
        <th scope="col" class="col-name">Product Name</th>
        <th scope="col" class="col-sku">SKU</th>
        <th scope="col" class="col-price">Price</th>
        <th scope="col" class="col-qty">Qty Invoiced</th>
        <th scope="col" class="col-subtotal">Subtotal</th>
      </tr>
    `;
  } else if (currentTab === 'shipments') {
    thead.innerHTML = `
      <tr>
        <th scope="col" class="col-name">Product Name</th>
        <th scope="col" class="col-sku">SKU</th>
        <th scope="col" class="col-qty">Qty Shipped</th>
      </tr>
    `;
  } else if (currentTab === 'refunds') {
    thead.innerHTML = `
      <tr>
        <th scope="col" class="col-name">Product Name</th>
        <th scope="col" class="col-sku">SKU</th>
        <th scope="col" class="col-price">Price</th>
        <th scope="col" class="col-qty">Qty</th>
        <th scope="col" class="col-subtotal">Subtotal</th>
        <th scope="col" class="col-discount">Discount Amount</th>
        <th scope="col" class="col-row-total">Row Total</th>
      </tr>
    `;
  }
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  itemsData.forEach((item) => {
    let optionsHtml = '';
    if (item.options && item.options.length > 0) {
      optionsHtml = `<div class="product-options"><dl class="item-options">${item.options.map((opt) => `<dt>${opt.label}</dt><dd>${opt.value}</dd>`).join('')}</dl></div>`;
    }

    const tr = document.createElement('tr');
    if (currentTab === 'items') {
      tr.innerHTML = `
        <td class="col-name" data-label="Product Name"><a href="${item.nameHref}">${item.name}</a>${optionsHtml}</td>
        <td class="col-sku" data-label="SKU">${item.sku}</td>
        <td class="col-price" data-label="Price">${item.price}</td>
        <td class="col-qty" data-label="Qty"><span class="qty-ordered">${item.qtyOrdered}</span></td>
        <td class="col-subtotal" data-label="Subtotal">${item.subtotal}</td>
      `;
    } else if (currentTab === 'invoices') {
      tr.innerHTML = `
        <td class="col-name" data-label="Product Name"><a href="${item.nameHref}">${item.name}</a>${optionsHtml}</td>
        <td class="col-sku" data-label="SKU">${item.sku}</td>
        <td class="col-price" data-label="Price">${item.price}</td>
        <td class="col-qty" data-label="Qty Invoiced"><span class="qty-invoiced">${item.qtyInvoiced}</span></td>
        <td class="col-subtotal" data-label="Subtotal">${item.subtotal}</td>
      `;
    } else if (currentTab === 'shipments') {
      tr.innerHTML = `
        <td class="col-name" data-label="Product Name"><a href="${item.nameHref}">${item.name}</a>${optionsHtml}</td>
        <td class="col-sku" data-label="SKU">${item.sku}</td>
        <td class="col-qty" data-label="Qty Shipped"><span class="qty-shipped">${item.qtyShipped}</span></td>
      `;
    } else if (currentTab === 'refunds') {
      tr.innerHTML = `
        <td class="col-name" data-label="Product Name"><a href="${item.nameHref}">${item.name}</a>${optionsHtml}</td>
        <td class="col-sku" data-label="SKU">${item.sku}</td>
        <td class="col-price" data-label="Price">${item.price}</td>
        <td class="col-qty" data-label="Qty"><span class="qty-refunded">${item.qtyRefunded}</span></td>
        <td class="col-subtotal" data-label="Subtotal">${item.subtotal}</td>
        <td class="col-discount" data-label="Discount Amount">${item.discount}</td>
        <td class="col-row-total" data-label="Row Total">${item.rowTotal}</td>
      `;
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tablesInner.appendChild(table);

  // Totals Table (for items, invoices, and refunds, NOT shipments)
  if (currentTab !== 'shipments') {
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

  let isRebuilding = false;
  let debounceTimer = null;
  let cachedOrderData = events.lastPayload('order/data') || null;
  let activeTab = 'items';

  const rebuildTable = () => {
    if (isRebuilding) return;
    const items = dropinContainer.querySelectorAll('.dropin-cart-item');
    if (!items.length && !cachedOrderData?.items?.length) return;

    // Fetch the cost summary block from the document
    const costBlock = document.querySelector('.commerce-order-cost-summary');

    isRebuilding = true;
    try {
      const tableWrapper = buildItemsTable(
        dropinContainer,
        costBlock,
        activeTab,
        cachedOrderData,
        (newTab) => {
          activeTab = newTab;
          rebuildTable();
        },
      );
      tableContainer.innerHTML = '';
      if (tableWrapper) {
        tableContainer.appendChild(tableWrapper);
      }
    } finally {
      isRebuilding = false;
    }
  };

  events.on('order/data', (data) => {
    cachedOrderData = data;
    rebuildTable();
  }, { eager: true });

  // Observe ONLY the hidden dropin source container for changes.
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildTable, 80);
  });

  observer.observe(dropinContainer, { childList: true, subtree: true });

  setTimeout(rebuildTable, 800);
  rebuildTable();
}
