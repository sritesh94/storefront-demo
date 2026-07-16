import * as authApi from '@dropins/storefront-auth/api.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import * as wishlistApi from '@dropins/storefront-wishlist/api.js';
import * as cartApi from '@dropins/storefront-cart/api.js';
import { events } from '@dropins/tools/event-bus.js';
import { rootLink, CS_FETCH_GRAPHQL } from '../../scripts/commerce.js';

// Initialize wishlist and other dropins
import '../../scripts/initializers/wishlist.js';

pdpApi.setEndpoint(CS_FETCH_GRAPHQL);

export default async function decorate(block) {
  // Navigation items
  const menuItems = [
    { title: 'My Account', link: '/customer/account', iconName: 'user' },
    { title: 'My orders', link: '/customer/orders', iconName: 'order' },
    {
      title: 'My Wishlist', link: '/wishlist', iconName: 'heart', badge: 0,
    },
    { title: 'Address Book', link: '/customer/address', iconName: 'address-book' },
    { title: 'Newsletter Subscriptions', link: '/customer/newsletter', iconName: 'newsletter' },
    { title: 'Sign out', link: '#', iconName: 'sign-out' },
  ];

  // SVG Icons definition matching Figma design
  const icons = {
    user: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    order: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line><path d="M12 2v2"></path><path d="M12 17v2"></path></svg>',
    heart: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    'address-book': '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    newsletter: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
    'sign-out': '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
  };

  const navContainer = document.createElement('nav');
  navContainer.classList.add('commerce-account-sidebar-nav');

  // Fetch initial wishlist data to show the correct badge count immediately
  const initialWishlistData = wishlistApi.getPersistedWishlistData();
  const initialCount = initialWishlistData?.items_count ?? initialWishlistData?.items?.length ?? 0;

  menuItems.forEach((item) => {
    const menuItemEl = document.createElement('a');
    menuItemEl.classList.add('commerce-account-sidebar-item');
    menuItemEl.href = item.link === '#' ? '#' : rootLink(item.link);

    // Active item detection
    const isItemActive = item.link !== '#' && window.location.pathname.includes(item.link);
    if (isItemActive) {
      menuItemEl.classList.add('commerce-account-sidebar-item-active');
    }

    // Icon
    const iconEl = document.createElement('span');
    iconEl.classList.add('commerce-account-sidebar-item-icon');
    iconEl.innerHTML = icons[item.iconName] || '';

    // Title
    const titleEl = document.createElement('span');
    titleEl.classList.add('commerce-account-sidebar-item-title');
    titleEl.innerText = item.title;

    menuItemEl.appendChild(iconEl);
    menuItemEl.appendChild(titleEl);

    // Wishlist Badge
    if (item.title === 'My Wishlist') {
      const badgeEl = document.createElement('span');
      badgeEl.classList.add('commerce-account-sidebar-item-badge');
      badgeEl.innerText = initialCount.toString();
      badgeEl.style.display = initialCount > 0 ? 'inline-block' : 'none';
      menuItemEl.appendChild(badgeEl);
    }

    // Handle logout action
    if (item.iconName === 'sign-out') {
      menuItemEl.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await authApi.revokeCustomerToken();
        } catch (err) {
          console.error('Logout error:', err);
        }
        window.location.href = rootLink('/customer/login');
      });
    }

    navContainer.appendChild(menuItemEl);
  });

  block.innerHTML = '';
  block.appendChild(navContainer);

  // Function to render or update the Wishlist section in the sidebar
  const renderWishlistSection = async (wishlistData) => {
    const count = wishlistData?.items_count ?? wishlistData?.items?.length ?? 0;

    // 1. Update Wishlist Badge
    const badgeEl = navContainer.querySelector('[href*="/wishlist"] .commerce-account-sidebar-item-badge');
    if (badgeEl) {
      badgeEl.innerText = count.toString();
      badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // 2. Render Sidebar Wishlist Widget
    if (count > 0 && wishlistData.items && wishlistData.items.length > 0) {
      let wishlistSection = block.querySelector('.commerce-account-sidebar-wishlist-section');
      if (!wishlistSection) {
        wishlistSection = document.createElement('div');
        wishlistSection.classList.add('commerce-account-sidebar-wishlist-section');
        block.appendChild(wishlistSection);
      }
      wishlistSection.innerHTML = '';

      const wishlistTitle = document.createElement('h3');
      wishlistTitle.classList.add('commerce-account-sidebar-wishlist-title');
      wishlistTitle.style.cursor = 'pointer';
      wishlistTitle.innerHTML = `My Wishlists <span class="commerce-account-sidebar-wishlist-count">(${count} items)</span>`;
      wishlistTitle.addEventListener('click', () => {
        window.location.href = rootLink('/wishlist');
      });
      wishlistSection.appendChild(wishlistTitle);

      const wishlistList = document.createElement('div');
      wishlistList.classList.add('commerce-account-sidebar-wishlist-list');

      try {
        if (pdpApi && pdpApi.getProductsData) {
          const skuParams = wishlistData.items
            .map((item) => ({ sku: item.product?.sku }))
            .filter((p) => p.sku);

          const enrichedProducts = await pdpApi.getProductsData(skuParams);
          if (enrichedProducts) {
            wishlistData.items.forEach((item) => {
              const sku = item.product?.sku;
              const product = enrichedProducts.find((p) => p.sku === sku);
              if (!product) return;

              const wishlistItem = document.createElement('div');
              wishlistItem.classList.add('commerce-account-sidebar-wishlist-item');
              wishlistItem.setAttribute('data-id', item.id);

              const imageUrl = product.images?.[0]?.url || '';
              const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: product.prices?.final?.currency || 'USD',
              });
              const priceString = formatter.format(product.prices?.final?.amount ?? 0);

              const imageHtml = imageUrl
                ? `<img src="${imageUrl}" alt="${product.name}" />`
                : '<div class="commerce-account-sidebar-wishlist-item-placeholder"></div>';

              wishlistItem.innerHTML = `
                <div class="commerce-account-sidebar-wishlist-item-img">
                  ${imageHtml}
                </div>
                <div class="commerce-account-sidebar-wishlist-item-info">
                  <p class="commerce-account-sidebar-wishlist-item-name">${product.name}</p>
                  <p class="commerce-account-sidebar-wishlist-item-price">${priceString}</p>
                  <button class="commerce-account-sidebar-wishlist-add-to-cart">ADD TO CART</button>
                </div>
                <button class="commerce-account-sidebar-wishlist-remove">✕</button>
              `;

              // Remove click handler
              const removeBtn = wishlistItem.querySelector('.commerce-account-sidebar-wishlist-remove');
              removeBtn.addEventListener('click', async () => {
                try {
                  if (wishlistApi && wishlistApi.removeProductsFromWishlist) {
                    await wishlistApi.removeProductsFromWishlist([item]);
                    wishlistItem.remove();
                  }
                } catch (err) {
                  console.error('Failed to remove item:', err);
                }
              });

              // Add to cart click handler
              const addToCartBtn = wishlistItem.querySelector('.commerce-account-sidebar-wishlist-add-to-cart');
              addToCartBtn.addEventListener('click', async () => {
                try {
                  if (cartApi && cartApi.addProductsToCart) {
                    const response = await cartApi.addProductsToCart([
                      { sku: product.sku, quantity: 1 },
                    ]);
                    events.emit('cart/updated', response);
                    // eslint-disable-next-line no-alert
                    alert(`${product.name} added to cart!`);
                  }
                } catch (err) {
                  console.error('Failed to add to cart:', err);
                }
              });

              wishlistList.appendChild(wishlistItem);
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err);
      }

      wishlistSection.appendChild(wishlistList);
    } else {
      const wishlistSection = block.querySelector('.commerce-account-sidebar-wishlist-section');
      if (wishlistSection) {
        wishlistSection.remove();
      }
    }
  };

  // Initial render
  if (initialCount > 0) {
    await renderWishlistSection(initialWishlistData);
  }

  // Listen to wishlist/data event to dynamically update badge and render items
  events.on('wishlist/data', async (wishlistData) => {
    await renderWishlistSection(wishlistData);
  }, { eager: true });
}
