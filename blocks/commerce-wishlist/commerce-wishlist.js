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

  const items = wishlist?.items || [];

  if (items.length === 0) {
    return h('div', { className: 'wishlist-empty' }, [
      h('p', {}, 'Your wishlist is empty.'),
      startShoppingURL && h('a', { href: startShoppingURL, className: 'button primary' }, 'Start Shopping'),
    ]);
  }

  const countLabel = items.length === 1 ? '1 Item' : `${items.length} Items`;

  return h('div', { className: 'custom-wishlist-container' }, [
    alert && h('div', { className: `wishlist-alert-banner alert-${alert.type}` }, [
      h('span', { className: 'alert-message' }, alert.message),
      h('button', { className: 'alert-close', onClick: () => setAlert(null) }, '✕'),
    ]),

    h('div', { className: 'wishlist-header-row' }, [
      h('h2', { className: 'wishlist-heading-count' }, countLabel),
    ]),

    h('div', { className: 'wishlist-grid' }, items.map((item) => {
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
                viewBox: '0 0 24 24', width: '14', height: '14', stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
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
                viewBox: '0 0 24 24', width: '14', height: '14', stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
              }, [
                h('polyline', { points: '3 6 5 6 21 6' }),
                h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
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
        h('select', { className: 'per-page-select' }, [
          h('option', { value: '12' }, '12'),
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

  await wishlistRenderer.render(CustomWishlist, {
    startShoppingURL: startShoppingURL ? rootLink(startShoppingURL) : undefined,
  })(block);
}
