import { getProductsData, setEndpoint } from '@dropins/storefront-pdp/api.js';
import { events } from '@dropins/tools/event-bus.js';
import { CS_FETCH_GRAPHQL, getProductLink, rootLink } from '../../scripts/commerce.js';
import {
  getCompareProducts,
  removeCompareProduct,
  clearCompareProducts,
} from '../../scripts/components/compare/compare.js';

export default async function decorate(block) {
  setEndpoint(CS_FETCH_GRAPHQL);

  const renderEmptyState = () => {
    block.innerHTML = `
      <div class="compare-empty-state">
        <p>No products selected for comparison.</p>
        <a href="${rootLink('/')}" class="compare-back-btn button primary">
          Browse Products
        </a>
      </div>
    `;
  };

  const skus = getCompareProducts().filter(Boolean);

  if (!skus.length) {
    renderEmptyState();
    return;
  }

  block.innerHTML = '<div class="compare-loading">Loading comparison data...</div>';

  try {
    const products = await getProductsData(skus.map((sku) => ({ sku })));

    if (!products?.length) {
      renderEmptyState();
      return;
    }

    // Get all unique custom attribute labels across all compared products
    const uniqueAttributes = [];
    products.forEach((product) => {
      if (product.attributes) {
        product.attributes.forEach((attr) => {
          const isSpecial = attr.id === 'ac_giftcard' || attr.id === 'ac_downloadable';
          if (attr.label && !isSpecial && !uniqueAttributes.includes(attr.label)) {
            uniqueAttributes.push(attr.label);
          }
        });
      }
    });

    const formatPrice = (priceObj) => {
      if (!priceObj || priceObj.amount === undefined) return '';
      const currency = priceObj.currency || 'USD';
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency,
      }).format(priceObj.amount);
    };

    // Build the table structure
    const container = document.createElement('div');
    container.className = 'compare-container';

    const headerContainer = document.createElement('div');
    headerContainer.className = 'compare-header-container';
    headerContainer.innerHTML = `
      <h2>Compare Products</h2>
      <button type="button" class="compare-clear-all compare-action-btn secondary">Clear All</button>
    `;
    container.appendChild(headerContainer);

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'compare-table-wrapper';

    const table = document.createElement('table');
    table.className = 'compare-table';

    // Thead (Product card row with image, name, SKU, price, remove btn)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="compare-feature-col">Feature</th>';

    products.forEach((product) => {
      const th = document.createElement('th');
      th.className = 'compare-product-col';
      const hasImages = product.images && product.images.length > 0;
      const imageUrl = hasImages ? product.images[0].url : '../../icons/compare.svg';
      const link = getProductLink(product.urlKey, product.sku);

      // Price rendering
      let priceHtml = '';
      if (product.prices && product.prices.final) {
        const finalPrice = formatPrice(product.prices.final);
        const regAmount = product.prices.regular?.amount;
        const finalAmount = product.prices.final?.amount;
        if (regAmount && regAmount !== finalAmount) {
          const regularPrice = formatPrice(product.prices.regular);
          priceHtml = `
            <span class="compare-price regular-price strikethrough">${regularPrice}</span>
            <span class="compare-price final-price special-price">${finalPrice}</span>
          `;
        } else {
          priceHtml = `<span class="compare-price final-price">${finalPrice}</span>`;
        }
      }

      th.innerHTML = `
        <div class="compare-card">
          <button type="button" class="compare-remove-btn" data-sku="${product.sku}" aria-label="Remove ${product.name} from comparison">✕</button>
          <a href="${link}" class="compare-card-image-link">
            <img class="compare-card-image" src="${imageUrl}" alt="${product.name}" />
          </a>
          <a href="${link}" class="compare-card-name-link">
            <h3 class="compare-card-name">${product.name}</h3>
          </a>
          <div class="compare-card-price">${priceHtml}</div>
          <div class="compare-card-sku"><span class="compare-label">SKU:</span> ${product.sku}</div>
        </div>
      `;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');

    // 1. Stock Status Row
    const stockRow = document.createElement('tr');
    stockRow.innerHTML = '<td class="compare-feature-name">Stock Status</td>';
    products.forEach((product) => {
      const td = document.createElement('td');
      const inStock = product.inStock !== false;
      td.innerHTML = inStock
        ? '<span class="compare-stock in-stock">In Stock</span>'
        : '<span class="compare-stock out-of-stock">Out of Stock</span>';
      stockRow.appendChild(td);
    });
    tbody.appendChild(stockRow);

    // 2. Custom Attributes Rows
    uniqueAttributes.forEach((label) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.className = 'compare-feature-name';
      nameCell.textContent = label;
      row.appendChild(nameCell);
      products.forEach((product) => {
        const td = document.createElement('td');
        const attrVal = product.attributes?.find((a) => a.label === label);
        td.textContent = attrVal?.value || '—';
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });

    // 3. Description Row
    const descRow = document.createElement('tr');
    descRow.innerHTML = '<td class="compare-feature-name">Description</td>';
    products.forEach((product) => {
      const td = document.createElement('td');
      td.className = 'compare-description-cell';
      const temp = document.createElement('div');
      temp.innerHTML = product.shortDescription || product.description || '';
      td.textContent = temp.textContent || '';
      descRow.appendChild(td);
    });
    tbody.appendChild(descRow);

    // 4. Add to Cart / Actions Row
    const actionsRow = document.createElement('tr');
    actionsRow.innerHTML = '<td class="compare-feature-name">Actions</td>';
    products.forEach((product) => {
      const td = document.createElement('td');
      const isConfigurable = product.options && product.options.length > 0;
      const inStock = product.inStock !== false;

      if (!inStock) {
        td.innerHTML = '<button type="button" class="compare-add-cart disabled" disabled>Out of Stock</button>';
      } else if (isConfigurable) {
        const link = getProductLink(product.urlKey, product.sku);
        td.innerHTML = `<a href="${link}" class="compare-add-cart button primary">Configure Options</a>`;
      } else {
        const cartBtn = document.createElement('button');
        cartBtn.type = 'button';
        cartBtn.className = 'compare-add-cart button primary';
        cartBtn.textContent = 'Add to Cart';
        cartBtn.addEventListener('click', async () => {
          try {
            cartBtn.disabled = true;
            cartBtn.textContent = 'Adding...';
            const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
            const response = await addProductsToCart([
              {
                sku: product.sku,
                quantity: 1,
              },
            ]);

            events.emit('cart/updated', response);

            cartBtn.textContent = 'Added!';

            setTimeout(() => {
              cartBtn.disabled = false;
              cartBtn.textContent = 'Add to Cart';
            }, 2000);
          } catch (err) {
            console.error(err);

            cartBtn.textContent = 'Error';

            setTimeout(() => {
              cartBtn.disabled = false;
              cartBtn.textContent = 'Add to Cart';
            }, 2000);
          }
        });
        td.appendChild(cartBtn);
      }
      actionsRow.appendChild(td);
    });
    tbody.appendChild(actionsRow);

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    block.replaceChildren(container);

    // Event listener for Clear All
    headerContainer.querySelector('.compare-clear-all').addEventListener('click', () => {
      clearCompareProducts();
      renderEmptyState();
    });

    // Event listeners for Remove buttons
    block.querySelectorAll('.compare-remove-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const skuToRemove = e.currentTarget.dataset.sku;
        removeCompareProduct(skuToRemove);
        if (getCompareProducts().length === 0) {
          renderEmptyState();
          return;
        }
        await decorate(block);
      });
    });
  } catch (error) {
    console.error('Compare products error:', error);
    block.innerHTML = `
      <div class="compare-error">
        <p>An error occurred while loading comparison data.</p>
        <button type="button" class="compare-retry-btn button primary">Try Again</button>
      </div>
    `;
    block.querySelector('.compare-retry-btn').addEventListener('click', () => {
      decorate(block);
    });
  }
}
