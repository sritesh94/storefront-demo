// Dropin Tools
import { events } from '@dropins/tools/event-bus.js';

// Cart Dropin
import * as cartApi from '@dropins/storefront-cart/api.js';

// Recommendations Dropin
import { publishRecsItemAddToCartClick } from '@dropins/storefront-recommendations/api.js';

// Wishlist Dropin
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';

// Block-level
import { readBlockConfig } from '../../scripts/aem.js';
import { getProductLink, CORE_FETCH_GRAPHQL } from '../../scripts/commerce.js';

// Initializers
import '../../scripts/initializers/recommendations.js';
import '../../scripts/initializers/wishlist.js';

const isMobile = window.matchMedia('only screen and (max-width: 900px)').matches;

/**
 * Fetches products from Adobe Commerce API
 * @param {Array<string>} skus - Product SKUs to fetch
 * @param {number} pageSize - Number of products to fetch
 * @returns {Promise<Array>} Array of product objects
 */
async function fetchProductsFromCommerce(skus = [], pageSize = 6) {
  try {
    const query = skus.length > 0
      ? `
        query GetProductsBySku {
          products(filter: { sku: { in: [${skus.map((sku) => `"${sku}"`).join(', ')}] } }, pageSize: ${pageSize}) {
            items {
              id
              sku
              name
              url_key
              image {
                url
                label
              }
              price_range {
                minimum_price {
                  regular_price {
                    value
                  }
                  final_price {
                    value
                  }
                }
                maximum_price {
                  regular_price {
                    value
                  }
                  final_price {
                    value
                  }
                }
              }
              review_count
              rating_summary
              configurable_options {
                id
                label
                values {
                  label
                  swatch_data {
                    color
                  }
                }
              }
            }
          }
        }
      `
      : `
        query GetProducts {
          products(pageSize: ${pageSize}, currentPage: 1) {
            items {
              id
              sku
              name
              url_key
              image {
                url
                label
              }
              price_range {
                minimum_price {
                  regular_price {
                    value
                  }
                  final_price {
                    value
                  }
                }
                maximum_price {
                  regular_price {
                    value
                  }
                  final_price {
                    value
                  }
                }
              }
              review_count
              rating_summary
              configurable_options {
                id
                label
                values {
                  label
                  swatch_data {
                    color
                  }
                }
              }
            }
          }
        }
      `;

    const response = await CORE_FETCH_GRAPHQL.query({ query });

    if (response.errors) {
      console.error('GraphQL Errors:', response.errors);
      return [];
    }

    const products = response.data?.products?.items || [];

    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price_range?.minimum_price?.regular_price?.value || 0,
      specialPrice: product.price_range?.minimum_price?.final_price?.value,
      image: product.image?.url || 'https://placehold.co/300x400',
      rating: product.rating_summary ? Math.round(product.rating_summary / 20) : 0,
      badge: '',
      swatches: (product.configurable_options || [])
        .flatMap((option) => option.values || [])
        .filter((value) => value.swatch_data?.color)
        .map((value) => ({
          color: value.swatch_data.color,
          label: value.label,
        }))
        .slice(0, 5),
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Renders a product card with image, name, rating, price, and color swatches
 * @param {Object} product - The product object from the dropin
 * @param {HTMLElement} container - Container to append the product card to
 */
function renderProductCard(product, container) {
  const card = document.createElement('div');
  card.className = 'product-section-card';

  // Product image
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'product-section-image-wrapper';

  const img = document.createElement('img');
  img.src = product.image || 'https://placehold.co/300x400';
  img.alt = product.name || 'Product';
  img.loading = 'lazy';
  img.className = 'product-section-image';

  imageWrapper.appendChild(img);

  // Badge (if available)
  if (product.badge) {
    const badge = document.createElement('span');
    badge.className = 'product-section-badge';
    badge.textContent = product.badge;
    imageWrapper.appendChild(badge);
  }

  // Wishlist toggle
  const wishlistContainer = document.createElement('div');
  wishlistContainer.className = 'product-section-wishlist';

  card.appendChild(imageWrapper);
  card.appendChild(wishlistContainer);

  // Product info
  const infoWrapper = document.createElement('div');
  infoWrapper.className = 'product-section-info';

  // Product name (link to product page)
  const nameLink = document.createElement('a');
  nameLink.href = getProductLink(product.sku) || '#';
  nameLink.className = 'product-section-name';
  nameLink.textContent = product.name || 'Product';

  infoWrapper.appendChild(nameLink);

  // Rating
  if (product.rating) {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'product-section-rating';
    ratingDiv.innerHTML = `★★★★☆ <span class="rating-count">${product.rating}</span>`;
    infoWrapper.appendChild(ratingDiv);
  }

  // Price
  const priceDiv = document.createElement('div');
  priceDiv.className = 'product-section-price';

  if (product.specialPrice) {
    const oldPrice = document.createElement('span');
    oldPrice.className = 'old-price';
    oldPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;
    priceDiv.appendChild(oldPrice);

    const newPrice = document.createElement('span');
    newPrice.className = 'special-price';
    newPrice.textContent = `$${parseFloat(product.specialPrice).toFixed(2)}`;
    priceDiv.appendChild(newPrice);
  } else {
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = `$${parseFloat(product.price).toFixed(2)}`;
    priceDiv.appendChild(price);
  }

  infoWrapper.appendChild(priceDiv);

  // Color swatches (if available)
  if (product.swatches && product.swatches.length) {
    const swatchesDiv = document.createElement('div');
    swatchesDiv.className = 'product-section-swatches';

    product.swatches.forEach((swatch) => {
      const swatchSpan = document.createElement('span');
      swatchSpan.className = 'product-section-swatch';
      swatchSpan.style.backgroundColor = swatch.color;
      swatchSpan.title = swatch.label || swatch.color;
      swatchesDiv.appendChild(swatchSpan);
    });

    infoWrapper.appendChild(swatchesDiv);
  }

  // Add to Cart Button
  const addToCartBtn = document.createElement('button');
  addToCartBtn.className = 'product-section-add-to-cart';
  addToCartBtn.textContent = 'Add to Cart';
  addToCartBtn.addEventListener('click', async () => {
    try {
      await cartApi.addProductToCart({
        sku: product.sku,
        quantity: 1,
      });
      publishRecsItemAddToCartClick(product.sku);
      addToCartBtn.textContent = 'Added!';
      setTimeout(() => {
        addToCartBtn.textContent = 'Add to Cart';
      }, 2000);
    } catch (error) {
      console.error('Error adding product to cart:', error);
    }
  });

  infoWrapper.appendChild(addToCartBtn);
  card.appendChild(infoWrapper);

  // Render wishlist toggle after card is in DOM
  wishlistRender(WishlistToggle, { sku: product.sku }, wishlistContainer);

  container.appendChild(card);
}

/**
 * Handles carousel/slider navigation for mobile
 * @param {HTMLElement} container - The container with product cards
 * @param {string} displayType - The display type (carousel or grid)
 */
function setupCarouselControls(container, displayType) {
  if (displayType !== 'carousel') return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'product-section-carousel-control prev';
  prevBtn.setAttribute('aria-label', 'Previous');
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/></svg>';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'product-section-carousel-control next';
  nextBtn.setAttribute('aria-label', 'Next');
  nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

  if (isMobile) {
    container.parentElement.appendChild(prevBtn);
    container.parentElement.appendChild(nextBtn);

    prevBtn.addEventListener('click', () => {
      container.scrollLeft -= 300;
    });

    nextBtn.addEventListener('click', () => {
      container.scrollLeft += 300;
    });
  }
}

/**
 * Main block decoration function
 * Configuration options (set in da.live as key-value pairs):
 * - displaytype: 'grid' | 'carousel' (default: 'grid')
 * - pagesize: number of products to display (default: 6)
 * - productskus: comma-separated product SKUs to display
 * - recommendationtype: type of recommendation (e.g., 'viewed', 'bought-together')
 * - categorypath: category path for filtering (alternative to product SKUs)
 * - sortby: sort order (e.g., 'name', 'price', 'relevance')
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);

  const displayType = (config.displaytype || 'grid').toLowerCase();
  const pageSize = parseInt(config.pagesize, 10) || 6;
  const productSkus = config.productskus
    ? config.productskus.split(',').map((sku) => sku.trim())
    : [];

  // Create container
  const fragment = document.createRange().createContextualFragment(`
    <div class="product-section-wrapper">
      <div class="product-section-container"></div>
    </div>
  `);

  const container = fragment.querySelector('.product-section-container');
  container.className = `product-section-container product-section-${displayType}`;

  block.innerHTML = '';
  block.appendChild(fragment);

  // Show loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'product-section-loading';
  loadingDiv.textContent = 'Loading products...';
  container.appendChild(loadingDiv);

  // Fetch products from Commerce API
  const productsToDisplay = await fetchProductsFromCommerce(productSkus, pageSize);

  // If no products found and no SKUs specified, show message
  if (productsToDisplay.length === 0) {
    loadingDiv.textContent = 'No products available';
    console.warn('No products found for config:', { productSkus, pageSize });
  } else {
    // Clear loading state
    container.innerHTML = '';

    // Render products
    productsToDisplay.forEach((product) => {
      renderProductCard(product, container);
    });

    // Setup carousel controls if needed
    setupCarouselControls(container, displayType);
  }

  // Emit event that block has loaded
  events.emit('aem/product-section-loaded', { displayType, pageSize, productCount: productsToDisplay.length });
}
