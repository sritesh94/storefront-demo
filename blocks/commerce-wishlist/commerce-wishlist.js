import * as cartApi from '@dropins/storefront-cart/api.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import * as wishlistApi from '@dropins/storefront-wishlist/api.js';
import { render as wishlistRenderer } from '@dropins/storefront-wishlist/render.js';
import { events } from '@dropins/tools/event-bus.js';
import { useState, useEffect } from '@dropins/tools/preact-compat.js';
import { h } from '@dropins/tools/preact.js';
import {
  rootLink,
  getProductLink,
  checkIsAuthenticated,
  CUSTOMER_LOGIN_PATH,
} from '../../scripts/commerce.js';
import { readBlockConfig } from '../../scripts/aem.js';

import '../../scripts/initializers/wishlist.js';

function CustomWishlist({ startShoppingURL }) {
  const [wishlist, setWishlist] = useState(null);
  const [products, setProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [perPage, setPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = wishlistApi.getPersistedWishlistData()
          || await wishlistApi.initializeWishlist();
        if (isMounted && data) {
          setWishlist(data);
          setLoading(false);
          if (data.items && data.items.length > 0) {
            const skuParams = data.items.map((item) => ({ sku: item.product.sku }));
            const enriched = await pdpApi.getProductsData(skuParams);
            if (isMounted && enriched) {
              const map = {};
              enriched.forEach((p) => {
                map[p.sku] = p;
              });
              setProducts(map);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load wishlist details:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    const handleWishlistUpdate = async (data) => {
      if (!isMounted) return;
      setWishlist(data);
      if (data && data.items) {
        const skuParams = data.items.map((item) => ({ sku: item.product.sku }));
        try {
          const enriched = await pdpApi.getProductsData(skuParams);
          if (isMounted && enriched) {
            const map = {};
            enriched.forEach((p) => {
              map[p.sku] = p;
            });
            setProducts(map);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };

    const unbind = events.on('wishlist/data', handleWishlistUpdate);
    return () => {
      isMounted = false;
      unbind();
    };
  }, []);

  const handleQtyChange = (itemId, val) => {
    const qty = parseInt(val, 10);
    if (!Number.isNaN(qty) && qty > 0) {
      setQuantities((prev) => ({ ...prev, [itemId]: qty }));
    }
  };

  const handleUpdateWishlist = async () => {
    if (!wishlist || !wishlist.items) return;
    const itemsToUpdate = [];
    wishlist.items.forEach((item) => {
      const newQty = quantities[item.id];
      if (newQty !== undefined && newQty !== item.quantity) {
        itemsToUpdate.push({
          wishlistItemId: item.id,
          quantity: newQty,
          selectedOptions: item.selectedOptions?.map((opt) => opt.uid) || [],
          enteredOptions: item.enteredOptions || [],
        });
      }
    });

    if (itemsToUpdate.length === 0) {
      setAlert({ type: 'info', message: 'No changes to update.' });
      return;
    }

    try {
      setLoading(true);
      await wishlistApi.updateProductsInWishlist(itemsToUpdate);
      setAlert({ type: 'success', message: 'Wishlist updated successfully!' });
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to update wishlist.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToCart = async () => {
    if (!wishlist || !wishlist.items || wishlist.items.length === 0) return;
    const itemsToAdd = wishlist.items.map((item) => {
      const qty = quantities[item.id] ?? item.quantity;
      return {
        sku: item.product.sku,
        quantity: qty,
        optionsUIDs: item.selectedOptions?.map((opt) => opt.uid) || [],
        enteredOptions: item.enteredOptions || [],
      };
    });

    try {
      setLoading(true);
      await cartApi.addProductsToCart(itemsToAdd);
      await wishlistApi.removeProductsFromWishlist(wishlist.items);
      setAlert({ type: 'success', message: 'All items added to cart!' });
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to add all items to cart.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item) => {
    const qty = quantities[item.id] ?? item.quantity;
    try {
      setLoading(true);
      await cartApi.addProductsToCart([{
        sku: item.product.sku,
        quantity: qty,
        optionsUIDs: item.selectedOptions?.map((opt) => opt.uid) || [],
        enteredOptions: item.enteredOptions || [],
      }]);
      await wishlistApi.removeProductsFromWishlist([item]);
      setAlert({ type: 'success', message: 'Product added to cart!' });
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to add item to cart.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      setLoading(true);
      await wishlistApi.removeProductsFromWishlist([item]);
      setAlert({ type: 'success', message: 'Item removed from wishlist.' });
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to remove item.' });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setAlert({ type: 'success', message: 'Wishlist URL copied to clipboard!' });
      })
      .catch(() => {
        setAlert({ type: 'error', message: 'Could not copy link to clipboard.' });
      });
  };

  if (loading && !wishlist) {
    return h('div', { className: 'wishlist-loading' }, 'Loading Wishlist...');
  }

  const allItems = wishlist?.items || [];

  if (allItems.length === 0) {
    return h('div', { className: 'wishlist-empty' }, [
      h('p', {}, 'Your wishlist is empty.'),
      startShoppingURL && h('a', { href: startShoppingURL, className: 'button primary' }, 'Start Shopping'),
    ]);
  }

  // ── Pagination logic ──
  const totalPages = Math.ceil(allItems.length / perPage);
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pagedItems = allItems.slice(startIdx, startIdx + perPage);

  const countLabel = allItems.length === 1 ? '1 Item' : `${allItems.length} Items`;

  return h('div', { className: 'custom-wishlist-container' }, [
    alert && h('div', { className: `wishlist-alert-banner alert-${alert.type}` }, [
      h('span', { className: 'alert-message' }, alert.message),
      h('button', { className: 'alert-close', onClick: () => setAlert(null) }, '✕'),
    ]),

    h('div', { className: 'wishlist-header-row' }, [
      h('h2', { className: 'wishlist-heading-count' }, countLabel),
    ]),

    h('div', { className: 'wishlist-grid' }, pagedItems.map((item) => {
      const prod = products[item.product.sku] || item.product;
      const qty = quantities[item.id] ?? item.quantity;
      const imageUrl = prod.images?.[0]?.url || 'https://placehold.co/288x288';
      const pdpLink = getProductLink(prod.urlKey || prod.sku, prod.sku);

      const priceString = prod.prices?.final?.amount !== undefined
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: prod.prices.final.currency || 'USD' }).format(prod.prices.final.amount)
        : '$0.00';

      return h('div', { className: 'wishlist-card', key: item.id }, [
        h('a', { href: pdpLink, className: 'wishlist-card-image-link' }, [
          h('img', { src: imageUrl, alt: prod.name, className: 'wishlist-card-image' }),
        ]),

        h('a', { href: pdpLink, className: 'wishlist-card-title' }, prod.name || 'Product Name'),

        h('div', { className: 'wishlist-card-price' }, priceString),

        h('div', { className: 'wishlist-card-qty-row' }, [
          h('div', { className: 'qty-input-wrapper' }, [
            h('label', { className: 'qty-label' }, 'Qty'),
            h('input', {
              type: 'number',
              min: '1',
              value: qty,
              className: 'qty-input',
              onChange: (e) => handleQtyChange(item.id, e.target.value),
            }),
          ]),
          h('button', {
            className: 'wishlist-card-add-to-cart',
            onClick: () => handleAddToCart(item),
          }, 'ADD TO CART'),
        ]),

        h('div', { className: 'wishlist-card-actions-row' }, [
          h('a', { href: pdpLink, className: 'wishlist-card-action-btn edit-action' }, [
            h('span', { className: 'action-icon edit-icon' }, [
              h('svg', {
                viewBox: '0 0 24 24', width: '24', height: '24', stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
              }, [
                h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
                h('path', { d: 'M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z' }),
              ]),
            ]),
            'Edit',
          ]),
          h('button', {
            className: 'wishlist-card-action-btn delete-action',
            onClick: () => handleDelete(item),
          }, [
            h('span', { className: 'action-icon delete-icon' }, [
              h('svg', {
                width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg',
              }, [
                h('path', {
                  'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M3 7.00004C3 6.44775 3.44772 6.00004 4 6.00004H20C20.5523 6.00004 21 6.44775 21 7.00004C21 7.55232 20.5523 8.00004 20 8.00004H4C3.44772 8.00004 3 7.55232 3 7.00004Z', fill: '#FA1792',
                }),
                h('path', {
                  'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M10 9.99996C10.5523 9.99996 11 10.4477 11 11V17C11 17.5522 10.5523 18 10 18C9.44772 18 9 17.5522 9 17V11C9 10.4477 9.44772 9.99996 10 9.99996Z', fill: '#FA1792',
                }),
                h('path', {
                  'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M14 9.99996C14.5523 9.99996 15 10.4477 15 11V17C15 17.5522 14.5523 18 14 18C13.4478 18 13 17.5522 13 17V11C13 10.4477 13.4478 9.99996 14 9.99996Z', fill: '#FA1792',
                }),
                h('path', {
                  'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M4.91699 6.00349C5.46737 5.95763 5.95072 6.36661 5.99658 6.91699L6.99658 18.917C6.99888 18.9446 7.00004 18.9723 7.00004 19C7.00004 19.2653 7.10539 19.5196 7.29293 19.7071C7.48047 19.8947 7.73482 20 8.00004 20H16C16.2653 20 16.5196 19.8947 16.7071 19.7071C16.8947 19.5196 17 19.2653 17 19C17 18.9723 17.0012 18.9446 17.0035 18.917L18.0035 6.91699C18.0494 6.36661 18.5327 5.95763 19.0831 6.00349C19.6335 6.04936 20.0424 6.53271 19.9966 7.08308L18.9997 19.0458C18.9878 19.8249 18.6732 20.5695 18.1214 21.1214C17.5587 21.684 16.7957 22 16 22H8.00004C7.20439 22 6.44132 21.684 5.87872 21.1214C5.32691 20.5695 5.01226 19.8249 5.00039 19.0458L4.00349 7.08308C3.95763 6.53271 4.36661 6.04936 4.91699 6.00349Z', fill: '#FA1792',
                }),
                h('path', {
                  'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M8.5858 2.58579C8.96088 2.21071 9.46959 2 10 2H14C14.5305 2 15.0392 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V7C16 7.55229 15.5523 8 15 8C14.4477 8 14 7.55229 14 7V4H10L10 7C10 7.55229 9.5523 8 9.00002 8C8.44773 8 8.00002 7.55229 8.00002 7V4C8.00002 3.46957 8.21073 2.96086 8.5858 2.58579Z', fill: '#FA1792',
                }),
              ]),
            ]),
            'Delete',
          ]),
        ]),

      ]);
    })),

    h('div', { className: 'wishlist-footer-row' }, [
      h('div', { className: 'wishlist-footer-buttons' }, [
        h('button', { className: 'footer-btn update-btn', onClick: handleUpdateWishlist }, 'UPDATE WISHLIST'),
        h('button', { className: 'footer-btn share-btn', onClick: handleShare }, 'SHARE WISHLIST'),
        h('button', { className: 'footer-btn add-all-btn', onClick: handleAddAllToCart }, 'ADD ALL TO CART'),
      ]),
      h('div', { className: 'wishlist-footer-per-page' }, [
        h('span', {}, 'Show '),
        h('select', {
          className: 'per-page-select',
          value: perPage,
          onChange: (e) => {
            setPerPage(Number(e.target.value));
            setCurrentPage(1);
          },
        }, [
          h('option', { value: '12' }, '12'),
          h('option', { value: '24' }, '24'),
          h('option', { value: '36' }, '36'),
        ]),
        h('span', {}, ' Product Per Page'),
      ]),
    ]),
  ]);
}

export default async function decorate(block) {
  if (!checkIsAuthenticated()) {
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${rootLink(CUSTOMER_LOGIN_PATH)}?redirect=${redirectUrl}`;
    return;
  }

  const {
    'start-shopping-url': startShoppingURL = '',
  } = readBlockConfig(block);

  // Prepend a header container inside the block
  const headerContainer = document.createElement('div');
  headerContainer.classList.add('commerce-account-section-header-container');

  const headingEl = document.createElement('h2');
  headingEl.classList.add('commerce-account-section-heading');
  headingEl.innerText = 'My Wishlist';
  headerContainer.appendChild(headingEl);

  block.innerHTML = '';
  block.appendChild(headerContainer);

  // Create a separate div for the wishlist renderer to mount into
  const wishlistContainer = document.createElement('div');
  wishlistContainer.classList.add('wishlist-container-el');
  block.appendChild(wishlistContainer);

  await wishlistRenderer.render(CustomWishlist, {
    startShoppingURL: startShoppingURL ? rootLink(startShoppingURL) : undefined,
  })(wishlistContainer);
}
