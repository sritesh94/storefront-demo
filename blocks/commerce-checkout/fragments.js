// eslint-disable-next-line import/no-unresolved
import { createFragment } from '@dropins/storefront-checkout/lib/utils.js';

import { CHECKOUT_BLOCK, ORDER_CONFIRMATION_BLOCK } from './constants.js';

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Creates a scoped querySelector function bound to a root element.
 * @param {HTMLElement} root - The root element to scope queries to.
 * @returns {Function} - A function that takes a CSS selector and returns an element.
 */
export const createScopedSelector = (root) => (selector) => root.querySelector(selector);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * A frozen, nested object of CSS selectors for multi-step checkout layout.
 * @readonly
 */
export const selectors = Object.freeze({
  checkout: {
    // Layout
    content: '.checkout__content',
    loader: '.checkout__loader',
    header: '.checkout__header',
    emptyCart: '.checkout__empty-cart',

    // Banners
    mergedCartBanner: '.checkout__merged-cart-banner',
    serverError: '.checkout__server-error',
    outOfStock: '.checkout__out-of-stock',

    // Sidebar
    orderSummary: '.checkout__order-summary',
    cartSummary: '.checkout__cart-summary',

    // Step 1: Shipping
    shippingStep: '.checkout__shipping-step',
    loginForm: '.checkout__login-form',
    loginFormSummary: '.checkout__login-form-summary',
    shippingAddressForm: '.checkout__shipping-address-form',
    shippingAddressFormSummary: '.checkout__shipping-address-form-summary',
    shippingStepContinueBtn: '.checkout__shipping-step-continue-btn',

    // Step 2: Shipping Methods
    shippingMethodStep: '.checkout__shipping-method-step',
    shippingMethodStepTitle: '.checkout__shipping-method-step-title',
    shippingMethodList: '.checkout__shipping-method-list',
    shippingMethodSummary: '.checkout__shipping-method-summary',
    shippingMethodContinueBtn: '.checkout__shipping-method-continue-btn',

    // Step 3: Payment
    paymentStep: '.checkout__payment-step',
    paymentStepTitle: '.checkout__payment-step-title',
    paymentMethodsList: '.checkout__payment-methods-list',
    paymentMethodsSummary: '.checkout__payment-methods-summary',
    paymentStepContinueBtn: '.checkout__payment-step-continue-btn',
    billToShipping: '.checkout__bill-to-shipping',

    // Step 4: Billing
    billingStep: '.checkout__billing-step',
    billingStepTitle: '.checkout__billing-step-title',
    billingForm: '.checkout__billing-form',
    billingFormSummary: '.checkout__billing-form-summary',
    billingStepContinueBtn: '.checkout__billing-step-continue-btn',

    // Footer
    termsAndConditions: '.checkout__terms-and-conditions',
    placeOrder: '.checkout__place-order',
  },

  orderConfirmation: {
    header: '.order-confirmation__header',
    orderStatus: '.order-confirmation__order-status',
    shippingStatus: '.order-confirmation__shipping-status',
    customerDetails: '.order-confirmation__customer-details',
    orderCostSummary: '.order-confirmation__order-cost-summary',
    orderProductList: '.order-confirmation__order-product-list',
    continueBtn: '.order-confirmation__continue-btn',
  },
});

// =============================================================================
// CHECKOUT FRAGMENT
// =============================================================================

/**
 * Creates the main multi-step checkout fragment with all step containers.
 * @returns {DocumentFragment} The complete checkout fragment.
 */
export function createCheckoutFragment() {
  return createFragment(`
    <div class="checkout__wrapper">
      <div class="checkout__loader"></div>
      <div class="checkout__content">
        <div class="checkout__merged-cart-banner"></div>
        <div class="checkout__main">
          <div class="checkout__header ${CHECKOUT_BLOCK}"></div>
          <div class="checkout__server-error ${CHECKOUT_BLOCK}"></div>
          <div class="checkout__out-of-stock ${CHECKOUT_BLOCK}"></div>
          <div class="checkout__empty-cart ${CHECKOUT_BLOCK}"></div>

          <!-- Step Progress Bar -->
          <div class="checkout__progress-bar">
            <div class="progress-bar__line">
              <div class="progress-bar__line-fill"></div>
            </div>
            <div class="progress-bar__step progress-bar__step--1" data-step="1">
              <div class="progress-bar__circle">
                <span class="progress-bar__circle-text">1</span>
                <span class="progress-bar__circle-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
              </div>
              <div class="progress-bar__label">Shipping</div>
            </div>
            <div class="progress-bar__step progress-bar__step--2" data-step="2">
              <div class="progress-bar__circle">
                <span class="progress-bar__circle-text">2</span>
                <span class="progress-bar__circle-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
              </div>
              <div class="progress-bar__label">Review & Payments</div>
            </div>
          </div>

          <!-- Step 1: Shipping -->
          <div class="checkout__shipping-step checkout-step">
            <div class="checkout__login-form-summary checkout-step__summary"></div>
            <div class="checkout__shipping-address-form-summary checkout-step__summary"></div>
            <div class="checkout__shipping-method-summary checkout-step__summary"></div>
            <div class="checkout-step__body">
              <div class="checkout__login-form ${CHECKOUT_BLOCK}"></div>
              <div class="checkout__shipping-address-form ${CHECKOUT_BLOCK}"></div>
              <div class="checkout__shipping-method-list ${CHECKOUT_BLOCK}"></div>
              <div class="checkout__shipping-step-continue-btn ${CHECKOUT_BLOCK}"></div>
            </div>
          </div>

          <!-- Step 2: Billing & Payment -->
          <div class="checkout__billing-step checkout-step">
            <div class="checkout__billing-step-title ${CHECKOUT_BLOCK}"></div>
            <div class="checkout__payment-methods-summary checkout-step__summary"></div>
            <div class="checkout__billing-form-summary checkout-step__summary"></div>
            <div class="checkout-step__body">
              <div class="checkout__payment-methods-list ${CHECKOUT_BLOCK}"></div>
              <div class="checkout__bill-to-shipping ${CHECKOUT_BLOCK}"></div>
              <div class="checkout__billing-form ${CHECKOUT_BLOCK}"></div>
            </div>
            <div class="checkout__terms-and-conditions ${CHECKOUT_BLOCK}"></div>
            <div class="checkout__place-order ${CHECKOUT_BLOCK}"></div>
          </div>
        </div>
        <div class="checkout__aside">
          <div class="checkout__aside-summary-card">
            <h2 class="checkout__aside-title">Order Summary</h2>
            <div class="checkout__cart-summary ${CHECKOUT_BLOCK}"></div>
            <div class="checkout__order-summary ${CHECKOUT_BLOCK}"></div>
          </div>
        </div>
      </div>
    </div>
  `);
}

// =============================================================================
// ORDER CONFIRMATION FRAGMENT
// =============================================================================

/**
 * Creates the order confirmation fragment.
 * @returns {DocumentFragment} The complete order confirmation fragment.
 */
export function createOrderConfirmationFragment() {
  return createFragment(`
    <div class="order-confirmation__wrapper">
      <div class="order-confirmation__header ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__order-status ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__shipping-status ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__customer-details ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__order-cost-summary ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__order-product-list ${ORDER_CONFIRMATION_BLOCK}"></div>
      <div class="order-confirmation__continue-btn ${ORDER_CONFIRMATION_BLOCK}"></div>
    </div>
  `);
}

// =============================================================================
// SUMMARY HELPERS
// =============================================================================

/**
 * Creates a summary element displaying a formatted address.
 * @param {Object} address - The address data object.
 * @param {Function|null} onEdit - Optional callback for the edit link.
 * @returns {HTMLElement} The address summary element.
 */
export function createAddressSummary(address, onEdit = null) {
  const el = document.createElement('div');
  el.classList.add('checkout-step__address-summary');

  if (!address) return el;

  let streetLines = [];
  if (Array.isArray(address.street)) {
    streetLines = address.street;
  } else if (typeof address.street === 'string') {
    streetLines = [address.street];
  }

  const parts = [
    [address.firstName, address.lastName].filter(Boolean).join(' '),
    streetLines.filter(Boolean).join(', '),
    [
      address.city,
      typeof address.region === 'object'
        ? address.region?.code || address.region?.regionCode || address.region?.region
        : address.region,
      address.postcode || address.postCode,
    ].filter(Boolean).join(', '),
    address.country?.label || address.countryCode || address.country_id,
  ].filter(Boolean);

  el.innerHTML = `<p class="checkout-step__address-summary-text">${parts.join('<br>')}</p>`;

  if (onEdit) {
    const editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.classList.add('checkout-step__summary-edit-link');
    editLink.textContent = 'Edit';
    editLink.addEventListener('click', onEdit);
    el.appendChild(editLink);
  }

  return el;
}

/**
 * Creates a summary element displaying login/guest email information.
 * @param {string} email - The user's email address.
 * @param {Function|null} onEdit - Optional callback for the edit link.
 * @returns {HTMLElement} The login summary element.
 */
export function createLoginFormSummary(email, onEdit = null) {
  const el = document.createElement('div');
  el.classList.add('checkout-step__login-summary');

  if (!email) return el;

  el.innerHTML = `<p class="checkout-step__login-summary-text">${email}</p>`;

  if (onEdit) {
    const editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.classList.add('checkout-step__summary-edit-link');
    editLink.textContent = 'Edit';
    editLink.addEventListener('click', onEdit);
    el.appendChild(editLink);
  }

  return el;
}

/**
 * Creates a summary element displaying the selected shipping method.
 * @param {{ label: string, description: string }} shippingMethod - Shipping method data.
 * @param {Function|null} onEdit - Optional callback for the edit link.
 * @returns {HTMLElement} The shipping method summary element.
 */
export function createShippingMethodsSummary(shippingMethod, onEdit = null) {
  const el = document.createElement('div');
  el.classList.add('checkout-step__shipping-method-summary');

  if (!shippingMethod) return el;

  const { label = '', description = '' } = shippingMethod;
  el.innerHTML = `
    <p class="checkout-step__shipping-method-summary-label">${label}</p>
    ${description ? `<p class="checkout-step__shipping-method-summary-description">${description}</p>` : ''}
  `;

  if (onEdit) {
    const editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.classList.add('checkout-step__summary-edit-link');
    editLink.textContent = 'Edit';
    editLink.addEventListener('click', onEdit);
    el.appendChild(editLink);
  }

  return el;
}

/**
 * Creates a summary element displaying the selected payment method.
 * @param {{ code: string, title: string }} paymentMethod - Payment method data.
 * @param {Function|null} onEdit - Optional callback for the edit link.
 * @returns {HTMLElement} The payment methods summary element.
 */
export function createPaymentMethodsSummary(paymentMethod, onEdit = null) {
  const el = document.createElement('div');
  el.classList.add('checkout-step__payment-method-summary');

  if (!paymentMethod) return el;

  el.innerHTML = `<p class="checkout-step__payment-method-summary-title">${paymentMethod.title || paymentMethod.code || ''}</p>`;

  if (onEdit) {
    const editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.classList.add('checkout-step__summary-edit-link');
    editLink.textContent = 'Edit';
    editLink.addEventListener('click', onEdit);
    el.appendChild(editLink);
  }

  return el;
}
