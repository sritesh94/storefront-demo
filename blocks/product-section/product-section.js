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
import { getProductLink } from '../../scripts/commerce.js';

// Initializers
import '../../scripts/initializers/recommendations.js';
import '../../scripts/initializers/wishlist.js';

const isMobile = window.matchMedia('only screen and (max-width: 900px)').matches;

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

  // Mock product data for demonstration
  // In production, this would fetch from the storefront API via the dropins
  const mockProducts = [
    {
      name: 'Becky Platform Sandal',
      sku: 'becky-sandal',
      price: '68.00',
      specialPrice: '',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Becky',
      rating: 4,
      badge: 'NEW',
      swatches: [
        { color: '#d9d9d9', label: 'Gray' },
        { color: '#ff6b81', label: 'Pink' },
        { color: '#0f9d58', label: 'Green' },
      ],
    },
    {
      name: 'Mini Melissa Cloud Sandal + Mickey And Friends Baby',
      sku: 'mini-melissa-cloud',
      price: '98.00',
      specialPrice: '68.00',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Mini+Melissa',
      rating: 4,
      badge: 'SALE',
      swatches: [
        { color: '#d9d9d9', label: 'Light' },
        { color: '#ff6b81', label: 'Pink' },
        { color: '#0f9d58', label: 'Green' },
      ],
    },
    {
      name: 'Free Platform',
      sku: 'free-platform',
      price: '68.00',
      specialPrice: '',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Free+Platform',
      rating: 4,
      badge: 'NEW',
      swatches: [
        { color: '#d9d9d9', label: 'Blue' },
        { color: '#ff6b81', label: 'Red' },
        { color: '#0f9d58', label: 'Green' },
      ],
    },
    {
      name: 'Classic Loafer',
      sku: 'classic-loafer',
      price: '85.00',
      specialPrice: '',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Classic+Loafer',
      rating: 5,
      badge: '',
      swatches: [
        { color: '#d9d9d9', label: 'White' },
        { color: '#333333', label: 'Black' },
      ],
    },
    {
      name: 'Summer Sneaker',
      sku: 'summer-sneaker',
      price: '75.00',
      specialPrice: '55.00',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Summer+Sneaker',
      rating: 4,
      badge: 'SALE',
      swatches: [
        { color: '#ff6b81', label: 'Red' },
        { color: '#0f9d58', label: 'Green' },
      ],
    },
    {
      name: 'Elegant Heel',
      sku: 'elegant-heel',
      price: '95.00',
      specialPrice: '',
      image: 'https://placehold.co/300x400/f5f5f5/000?text=Elegant+Heel',
      rating: 5,
      badge: '',
      swatches: [
        { color: '#000000', label: 'Black' },
        { color: '#800080', label: 'Purple' },
      ],
    },
  ];

  // Filter products based on configuration
  let productsToDisplay = mockProducts.slice(0, pageSize);

  if (productSkus.length > 0) {
    productsToDisplay = mockProducts.filter((p) => productSkus.includes(p.sku));
  }

  // Render products
  productsToDisplay.forEach((product) => {
    renderProductCard(product, container);
  });

  // Setup carousel controls if needed
  setupCarouselControls(container, displayType);

  // Emit event that block has loaded
  events.emit('aem/product-section-loaded', { displayType, pageSize });
}
