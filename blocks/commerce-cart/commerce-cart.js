import { events } from '@dropins/tools/event-bus.js';
import { render as provider } from '@dropins/storefront-cart/render.js';
import * as Cart from '@dropins/storefront-cart/api.js';
import { h } from '@dropins/tools/preact.js';
import {
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';

// Dropin Containers
import CartSummaryList from '@dropins/storefront-cart/containers/CartSummaryList.js';
import OrderSummary from '@dropins/storefront-cart/containers/OrderSummary.js';
import EstimateShipping from '@dropins/storefront-cart/containers/EstimateShipping.js';
import Coupons from '@dropins/storefront-cart/containers/Coupons.js';
import GiftCards from '@dropins/storefront-cart/containers/GiftCards.js';
import GiftOptions from '@dropins/storefront-cart/containers/GiftOptions.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { WishlistAlert } from '@dropins/storefront-wishlist/containers/WishlistAlert.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';

// API
import { publishShoppingCartViewEvent } from '@dropins/storefront-cart/api.js';

// Initializers
import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

import { readBlockConfig } from '../../scripts/aem.js';
import {
  fetchPlaceholders, rootLink, getProductLink, checkIsAuthenticated, CUSTOMER_LOGIN_PATH,
} from '../../scripts/commerce.js';

export default async function decorate(block) {
  // Configuration
  const {
    'hide-heading': hideHeading = 'false',
    'max-items': maxItems,
    'hide-attributes': hideAttributes = '',
    'enable-item-quantity-update': enableUpdateItemQuantity = 'false',
    'enable-item-remove': enableRemoveItem = 'true',
    'enable-estimate-shipping': enableEstimateShipping = 'false',
    'start-shopping-url': startShoppingURL = '',
    'checkout-url': checkoutURL = '',
    'undo-remove-item': undo = 'false',
  } = readBlockConfig(block);

  const placeholders = await fetchPlaceholders();

  const _cart = Cart.getCartDataFromCache();

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="cart__notification"></div>
    <div class="cart__wrapper">
      <div class="cart__left-column">
        <div class="cart__table-headers" hidden>
          <span class="cart__header-col cart__header-products">Products</span>
          <span class="cart__header-col cart__header-price">Unit Price</span>
          <span class="cart__header-col cart__header-quantity">Quantity</span>
          <span class="cart__header-col cart__header-amount">Amount</span>
        </div>
        <div class="cart__list"></div>
        <div class="cart__actions-bottom" hidden>
          <a href="${rootLink(startShoppingURL || '/')}" class="cart__btn-back button">Back to Shop</a>
          <button class="cart__btn-clear button secondary">Clear Shopping Cart</button>
        </div>
      </div>
      <div class="cart__right-column">
        <div class="cart__order-summary"></div>
        <div class="cart__coupons"></div>
        <div class="cart__gift-cards"></div>
        <div class="cart__gift-options"></div>
      </div>
    </div>

    <div class="cart__empty-cart"></div>
  `);

  const $wrapper = fragment.querySelector('.cart__wrapper');
  const $notification = fragment.querySelector('.cart__notification');
  const $headers = fragment.querySelector('.cart__table-headers');
  const $list = fragment.querySelector('.cart__list');
  const $actionsBottom = fragment.querySelector('.cart__actions-bottom');
  const $btnClear = fragment.querySelector('.cart__btn-clear');
  const $summary = fragment.querySelector('.cart__order-summary');
  const $coupons = fragment.querySelector('.cart__coupons');
  const $giftCards = fragment.querySelector('.cart__gift-cards');
  const $emptyCart = fragment.querySelector('.cart__empty-cart');
  const $giftOptions = fragment.querySelector('.cart__gift-options');
  const $rightColumn = fragment.querySelector('.cart__right-column');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Clear cart event
  $btnClear.addEventListener('click', async () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to clear your shopping cart?')) {
      try {
        const cartData = await Cart.getCartData();
        if (cartData && cartData.items && cartData.items.length > 0) {
          const itemsToClear = cartData.items.map((item) => ({
            uid: item.uid,
            quantity: 0,
          }));
          await Cart.updateProductsFromCart(itemsToClear);
        }
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  });

  // Wishlist variables
  const routeToWishlist = rootLink('/wishlist');

  // Toggle Empty Cart
  function toggleEmptyCart(_state) {
    $wrapper.removeAttribute('hidden');
    $emptyCart.setAttribute('hidden', '');
  }
  // Render Containers
  const createProductLink = (product) => getProductLink(product.url.urlKey, product.topLevelSku);
  await Promise.all([
    // Cart List
    provider.render(CartSummaryList, {
      hideHeading: hideHeading === 'true',
      routeProduct: createProductLink,
      routeEmptyCartCTA: startShoppingURL ? () => rootLink(startShoppingURL) : undefined,
      maxItems: parseInt(maxItems, 10) || undefined,
      attributesToHide: hideAttributes
        .split(',')
        .map((attr) => attr.trim().toLowerCase()),
      enableUpdateItemQuantity: enableUpdateItemQuantity === 'true',
      enableRemoveItem: enableRemoveItem === 'true',
      undo: undo === 'true',
      slots: {
        Thumbnail: (ctx) => {
          const { item, defaultImageProps } = ctx;
          const anchorWrapper = document.createElement('a');
          anchorWrapper.href = createProductLink(item);

          tryRenderAemAssetsImage(ctx, {
            alias: item.sku,
            imageProps: defaultImageProps,
            wrapper: anchorWrapper,

            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },

        ItemRemoveAction: (ctx) => {
          const hiddenSpan = document.createElement('span');
          hiddenSpan.style.display = 'none';
          ctx.replaceWith(hiddenSpan);
        },

        Footer: (ctx) => {
          // 1. New Edit Button (Redirects to PDP with existing selected quantity)
          const editBtn = document.createElement('div');
          editBtn.className = 'cart-item-edit-btn-container';

          UI.render(Button, {
            children: placeholders?.Global?.CartEditButton || 'Edit',
            variant: 'tertiary',
            size: 'medium',
            icon: h(Icon, { source: new URL(`${window.hlx.codeBasePath}/icons/edit-cart.svg`, window.location.origin).href }),
            onClick: () => {
              const pdpUrl = createProductLink(ctx.item);
              const qty = ctx.item.quantity || 1;
              window.location.href = `${pdpUrl}?qty=${qty}&quantity=${qty}&itemUid=${ctx.item.uid}`;
            },
          })(editBtn);

          ctx.appendChild(editBtn);

          // 2. Wishlist Button
          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('cart__action--wishlist-toggle');

          wishlistRender.render(WishlistToggle, {
            product: ctx.item,
            size: 'medium',
            labelToWishlist: placeholders?.Global?.CartMoveToWishlist,
            labelWishlisted: placeholders?.Global?.CartRemoveFromWishlist,
            removeProdFromCart: Cart.updateProductsFromCart,
            iconToWishlist: new URL(`${window.hlx.codeBasePath}/icons/wishlist.svg`, window.location.origin).href,
            iconWishlisted: new URL(`${window.hlx.codeBasePath}/icons/wishlist-filled.svg`, window.location.origin).href,
            ...(!checkIsAuthenticated() && {
              onClick: (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                const redirectUrl = encodeURIComponent(
                  window.location.pathname + window.location.search,
                );
                window.location.href = `${rootLink(CUSTOMER_LOGIN_PATH)}?redirect=${redirectUrl}`;
              },
            }),
          })($wishlistToggle);

          ctx.appendChild($wishlistToggle);

          // 3. Remove Button (Rendered directly in the footer container next to wishlist)
          const $removeBtn = document.createElement('div');
          $removeBtn.classList.add('cart__action--remove-btn');

          UI.render(Button, {
            variant: 'tertiary',
            size: 'medium',
            icon: h(Icon, { source: new URL(`${window.hlx.codeBasePath}/icons/trash-cart.svg`, window.location.origin).href }),
            onClick: async () => {
              // eslint-disable-next-line no-alert
              if (window.confirm('Are you sure you want to remove this item?')) {
                try {
                  ctx.handleItemsLoading(ctx.item.uid, true);
                  await Cart.updateProductsFromCart([{ uid: ctx.item.uid, quantity: 0 }]);
                  if (ctx.onItemUpdate) {
                    ctx.onItemUpdate({ item: ctx.item });
                  }
                } catch (error) {
                  ctx.handleItemsError(ctx.item.uid, error.message);
                } finally {
                  ctx.handleItemsLoading(ctx.item.uid, false);
                }
              }
            },
          })($removeBtn);

          ctx.appendChild($removeBtn);

          // 4. Gift Options
          const giftOptions = document.createElement('div');

          provider.render(GiftOptions, {
            item: ctx.item,
            view: 'product',
            dataSource: 'cart',
            handleItemsLoading: ctx.handleItemsLoading,
            handleItemsError: ctx.handleItemsError,
            onItemUpdate: ctx.onItemUpdate,
            slots: {
              SwatchImage: swatchImageSlot,
            },
          })(giftOptions);

          ctx.appendChild(giftOptions);
        },
      },
    })($list),

    // Order Summary
    provider.render(OrderSummary, {
      routeCheckout: checkoutURL ? () => rootLink(checkoutURL) : undefined,
      slots: {
        EstimateShipping: async (ctx) => {
          if (enableEstimateShipping === 'true') {
            const wrapper = document.createElement('div');
            wrapper.className = 'cart-estimate-shipping-wrapper collapsed';

            // Add click listener to toggle collapse state when label is clicked
            wrapper.addEventListener('click', (e) => {
              const label = e.target.closest('.cart-estimate-shipping__label');
              if (label) {
                wrapper.classList.toggle('collapsed');
              }
            });

            await provider.render(EstimateShipping, {})(wrapper);
            ctx.replaceWith(wrapper);
          }
        },
      },
    })($summary),

    // Coupons
    provider.render(Coupons)($coupons),

    // Gift Cards
    provider.render(GiftCards)($giftCards),

    provider.render(GiftOptions, {
      view: 'order',
      dataSource: 'cart',

      slots: {
        SwatchImage: swatchImageSlot,
      },
    })($giftOptions),
  ]);

  let cartViewEventPublished = false;
  // Events
  events.on(
    'cart/data',
    (cartData) => {
      toggleEmptyCart(isCartEmpty(cartData));

      const isEmpty = !cartData || cartData.totalQuantity < 1;
      $giftOptions.style.display = isEmpty ? 'none' : '';
      $rightColumn.style.display = isEmpty ? 'none' : '';

      if (isEmpty) {
        $headers.setAttribute('hidden', '');
        $actionsBottom.setAttribute('hidden', '');
      } else {
        $headers.removeAttribute('hidden');
        $actionsBottom.removeAttribute('hidden');
        // Move headers below the default cart title heading if it exists
        const $headingEl = $list.querySelector('[data-testid="default-cart-heading"]');
        if ($headingEl && $headers) {
          $headingEl.after($headers);
        }
      }

      if (!cartViewEventPublished) {
        cartViewEventPublished = true;
        publishShoppingCartViewEvent();
      }
    },
    { eager: true },
  );

  events.on('wishlist/alert', ({ action, item }) => {
    wishlistRender.render(WishlistAlert, {
      action,
      item,
      routeToWishlist,
    })($notification);

    setTimeout(() => {
      $notification.innerHTML = '';
    }, 5000);
  });

  return Promise.resolve();
}

function isCartEmpty(cart) {
  return cart ? cart.totalQuantity < 1 : true;
}

function swatchImageSlot(ctx) {
  const { imageSwatchContext, defaultImageProps } = ctx;
  tryRenderAemAssetsImage(ctx, {
    alias: imageSwatchContext.label,
    imageProps: defaultImageProps,
    wrapper: document.createElement('span'),

    params: {
      width: defaultImageProps.width,
      height: defaultImageProps.height,
    },
  });
}
