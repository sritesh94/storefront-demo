/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
/* eslint-disable no-use-before-define */
/* eslint-disable prefer-const */
/* eslint-disable max-len */

// Dropin Tools
import { events } from '@dropins/tools/event-bus.js';
import { initializers } from '@dropins/tools/initializer.js';

// Order Dropin
import * as orderApi from '@dropins/storefront-order/api.js';

// Initializers
import '../../scripts/initializers/account.js';
import '../../scripts/initializers/checkout.js';
import '../../scripts/initializers/order.js';

// Scripts
import { PaymentMethodCode } from '@dropins/storefront-payment-services/api.js';
import { fetchPlaceholders } from '../../scripts/commerce.js';
import { getUserTokenCookie } from '../../scripts/initializers/index.js';

// Block-level utils
import {
  getCartAddress,
  getCartPaymentMethod,
  getCartShippingMethod,
  isDataEmpty,
  isVirtualCart,
  removeModal,
  scrollToElement,
  setMetaTags,
  validateForm,
} from './utils.js';

// Container functions
import {
  renderCartSummaryList,
  renderCustomerBillingAddresses,
  renderCustomerDetails,
  renderCustomerShippingAddresses,
  renderEmptyCart,
  renderMergedCartBanner,
  renderOrderCostSummary,
  renderOrderHeader,
  renderOrderProductList,
  renderOrderStatus,
  renderOrderSummary,
  renderOutOfStock,
  renderPlaceOrder,
  renderServerError,
  renderShippingStatus,
  renderTermsAndConditions,
  unmountContainer,
  unmountEmptyCart,
  updatePlaceOrder,
  CONTAINERS,
} from './containers.js';

// Components
import {
  COMPONENT_IDS,
  removeComponent,
  renderBillingStepTitle,
  renderCheckoutHeader,
  renderOrderConfirmationContinueBtn,
  renderSpinner,
} from './components.js';

// Constants
import {
  BILLING_ADDRESS_DATA_KEY,
  BILLING_FORM_NAME,
  CHECKOUT_EMPTY_CLASS,
  CHECKOUT_STEP_ACTIVE,
  SHIPPING_ADDRESS_DATA_KEY,
  TERMS_AND_CONDITIONS_FORM_NAME,
} from './constants.js';

// Fragments
import {
  createOrderConfirmationFragment,
  createScopedSelector,
  selectors,
} from './fragments.js';

// Step modules
import { createShippingStep } from './steps/shipping.js';
import { createBillingStep } from './steps/billing.js';

const createStepsManager = (block) => {
  // Global state
  let isInProgress = false;
  // Tracks whether the billing step is currently being shown (active).
  // When true, checkout/updated events skip the shipping display/summary calls
  // and jump straight to re-evaluating billing completion.
  let isBillingStepShown = false;
  let isInitialLoad = true;
  let latestCheckoutData = null;

  // Create a scoped selector for the block
  const getElement = createScopedSelector(block);

  // Form references
  const formRefs = {
    shippingForm: { current: null },
    billingForm: { current: null },
    creditCardForm: { current: null },
  };

  const { checkout, orderConfirmation } = selectors;

  // Get block elements using the checkout selectors
  const elements = {
    $content: getElement(checkout.content),
    $emptyCart: getElement(checkout.emptyCart),
    $loader: getElement(checkout.loader),
    $header: getElement(checkout.header),
    $cartSummary: getElement(checkout.cartSummary),
    $orderSummary: getElement(checkout.orderSummary),
    $shippingAddressForm: getElement(checkout.shippingAddressForm),
    $billingStepTitle: getElement(checkout.billingStepTitle),
    $billingForm: getElement(checkout.billingForm),
    $mergedCartBanner: getElement(checkout.mergedCartBanner),
    $outOfStock: getElement(checkout.outOfStock),
    $placeOrder: getElement(checkout.placeOrder),
    $serverError: getElement(checkout.serverError),
    $termsAndConditions: getElement(checkout.termsAndConditions),
  };

  // Helper methods
  const isAuthenticated = () => !!getUserTokenCookie();

  const withOverlaySpinner = (callback) => async (...args) => {
    elements.$loader.innerHTML = '';
    await renderSpinner(elements.$loader, COMPONENT_IDS.CHECKOUT_LOADER);

    try {
      return await callback(...args);
    } finally {
      removeComponent(COMPONENT_IDS.CHECKOUT_LOADER);
    }
  };

  const activateStep = (stepElement, active = true) => {
    stepElement.classList.toggle(CHECKOUT_STEP_ACTIVE, active);
  };

  const disablePlaceOrderButton = () => {
    updatePlaceOrder({ disabled: true });
  };

  const togglePlaceOrderButton = (show) => {
    elements.$placeOrder?.classList.toggle('hidden', !show);
    elements.$termsAndConditions?.classList.toggle('hidden', !show);
  };

  // Steps
  const displayEmptyCart = async () => {
    renderEmptyCart(elements.$emptyCart);
    elements.$content.classList.add(CHECKOUT_EMPTY_CLASS);
    togglePlaceOrderButton(false);
  };

  const hideEmptyCart = () => {
    unmountEmptyCart(elements.$emptyCart);
    elements.$content.classList.remove(CHECKOUT_EMPTY_CLASS);
  };

  const updateProgressBar = (stepNumber) => {
    const $progressBar = getElement('.checkout__progress-bar');
    if (!$progressBar) return;

    $progressBar.classList.toggle('checkout__progress-bar--step-1', stepNumber === 1);
    $progressBar.classList.toggle('checkout__progress-bar--step-2', stepNumber === 2);

    const $step1 = $progressBar.querySelector('.progress-bar__step--1');
    const $step2 = $progressBar.querySelector('.progress-bar__step--2');
    const $lineFill = $progressBar.querySelector('.progress-bar__line-fill');

    if (stepNumber === 1) {
      $step1?.classList.add('progress-bar__step--active');
      $step1?.classList.remove('progress-bar__step--completed');
      $step2?.classList.remove('progress-bar__step--active', 'progress-bar__step--completed');
      if ($lineFill) $lineFill.style.width = '0%';
    } else if (stepNumber === 2) {
      $step1?.classList.remove('progress-bar__step--active');
      $step1?.classList.add('progress-bar__step--completed');
      $step2?.classList.add('progress-bar__step--active');
      $step2?.classList.remove('progress-bar__step--completed');
      if ($lineFill) $lineFill.style.width = '100%';
    }
  };

  // Initialize step modules with their dependencies
  const sharedDependencies = {
    activateStep,
    disablePlaceOrderButton,
    formRefs,
    getElement,
    isAuthenticated,
    withOverlaySpinner,
    updateProgressBar,
  };

  // Create step modules (2 Steps: Shipping and Billing)
  const steps = {
    shipping: createShippingStep({
      ...sharedDependencies,
      displayBillingStep: (active, data) => steps.billing.display(active, data),
      // Resets the isInProgress gate so checkout/updated events can flow through
      // handleCheckoutFlow again after the user transitions to step 2.
      resetProgress: () => {
        isInProgress = false;
        isBillingStepShown = true;
      },
    }),
    billing: createBillingStep(sharedDependencies),
  };

  const displayOrderConfirmation = async (orderData) => {
    setMetaTags('Order Confirmation');
    document.title = 'Order Confirmation';

    const labels = await fetchPlaceholders();
    const langDefinitions = { default: { ...labels } };

    await initializers.mountImmediately(orderApi.initialize, { orderData, langDefinitions });

    // Scroll to the top of the page
    window.scrollTo(0, 0);

    block.replaceChildren(createOrderConfirmationFragment());

    const getElement = createScopedSelector(block);

    // Order confirmation elements
    const $header = getElement(orderConfirmation.header);
    const $orderStatus = getElement(orderConfirmation.orderStatus);
    const $shippingStatus = getElement(orderConfirmation.shippingStatus);
    const $customerDetails = getElement(orderConfirmation.customerDetails);
    const $orderCostSummary = getElement(orderConfirmation.orderCostSummary);
    const $orderProductList = getElement(orderConfirmation.orderProductList);
    const $footerContinueBtn = getElement(orderConfirmation.continueBtn);

    await renderOrderHeader($header, { orderData });
    await renderOrderStatus($orderStatus);
    await renderShippingStatus($shippingStatus);
    await renderCustomerDetails($customerDetails);
    await renderOrderCostSummary($orderCostSummary);
    await renderOrderProductList($orderProductList);
    await renderOrderConfirmationContinueBtn($footerContinueBtn);
  };

  // Container props and handlers
  const handleValidation = () => {
    let success = true;
    const checkoutValues = events.lastPayload('checkout/values');
    const isBillToShipping = checkoutValues?.isBillToShipping ?? true;

    if (!isBillToShipping) {
      success = validateForm(BILLING_FORM_NAME, formRefs.billingForm);
    }

    if (success) {
      success = validateForm(TERMS_AND_CONDITIONS_FORM_NAME);
      if (!success) scrollToElement(elements.$termsAndConditions);
    }

    return success;
  };

  const handlePlaceOrder = withOverlaySpinner(async ({ cartId, code }) => {
    try {
      // Payment Services credit card submission
      if (code === PaymentMethodCode.CREDIT_CARD) {
        if (!formRefs.creditCardForm.current) {
          console.error('Credit card form not rendered.');
          return;
        }
        // Validation already done in payment step, just submit
        await formRefs.creditCardForm.current.submit();
      }
      // Place order
      await orderApi.placeOrder(cartId);
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  });

  // Track auth state to detect changes
  let wasAuthenticated = isAuthenticated();

  const handleAuthenticated = async (authenticated) => {
    if (!authenticated) return;
    removeModal();
  };

  // Unified checkout flow handler for 2-step checkout (Shipping & Billing)
  const handleCheckoutFlow = async (data) => {
    // If it's the initial page load or revisit, always force Step 1 (Shipping)
    if (isInitialLoad) {
      isInitialLoad = false;
      isBillingStepShown = false;
      await steps.shipping.display(true, data);
      await steps.billing.display(false, data);
      isInProgress = false;
      return;
    }

    // While the user is actively on Step 1, do not automatically transition them to Step 2
    // even if shipping is complete on the cart. They must click "Next" to transition.
    if (steps.shipping.isActive()) {
      isInProgress = false;
      return;
    }

    // Step 1: Shipping
    if (!steps.shipping.isComplete(data)) {
      isBillingStepShown = false;
      await steps.shipping.display(true, data);
      await steps.billing.display(false, data);
      return;
    }

    // Only re-render shipping summary if we aren't already showing billing.
    // This avoids redundant DOM updates on every checkout/updated while
    // the user is filling out the billing form.
    const cartShippingAddress = getCartAddress(data, 'shipping');
    if (!isBillingStepShown) {
      const shippingMethod = getCartShippingMethod(data);
      await steps.shipping.display(false, data);
      await steps.shipping.displaySummary(data.email, cartShippingAddress, shippingMethod);
    }

    // Step 2: Billing & Payment
    const paymentMethod = getCartPaymentMethod(data);
    const cartBillingAddress = getCartAddress(data, 'billing');
    const sameAsBilling = data?.shippingAddresses?.[0]?.sameAsBilling;

    // If the billing step is currently shown (user is viewing/editing Step 2),
    // do not collapse it into a summary. Simply update the Place Order button's
    // enabled/disabled state depending on whether the billing details are complete.
    if (isBillingStepShown) {
      // Re-evaluate and toggle the billing address form (mount/unmount) depending
      // on the latest isBillToShipping value.
      await steps.billing.display(true, data);

      if (steps.billing.isComplete(data)) {
        togglePlaceOrderButton(true);
        updatePlaceOrder({ disabled: false });
      } else {
        updatePlaceOrder({ disabled: true });
      }
      isInProgress = false;
      return;
    }

    if (!steps.billing.isComplete(data)) {
      // Billing not yet complete — show billing step (e.g. on page refresh at step 2
      // or after the user clicks "Next" for the first time).
      // Reset isInProgress so that subsequent checkout/updated events (fired by
      // payment/address dropins) can re-evaluate whether PlaceOrder should be enabled.
      isBillingStepShown = true;
      await steps.billing.display(true, data);
      isInProgress = false;
      return;
    }

    // All steps complete (e.g. page refresh with fully-filled cart, or after
    // user selects payment method while on step 2).
    // Display summaries and ensure Place Order button is enabled.
    isBillingStepShown = false;
    await steps.billing.displaySummary(
      paymentMethod,
      cartBillingAddress || (sameAsBilling ? cartShippingAddress : null),
      true, // Always show Edit link so user can change payment options
    );

    // Enable Place Order — checkout/step/completed is only emitted by the manual
    // "Next" button so we must enable it here when data is already complete.
    togglePlaceOrderButton(true);
    updatePlaceOrder({ disabled: false });
  };

  const handleCheckoutUpdate = async (data) => {
    latestCheckoutData = data;
    if (isDataEmpty(data)) {
      isInProgress = false;
      displayEmptyCart();
      return;
    }

    hideEmptyCart();

    // Handle authentication status changes
    const currentAuthState = isAuthenticated();
    if (wasAuthenticated !== currentAuthState && currentAuthState) {
      formRefs.shippingForm.current = null;
      formRefs.billingForm.current = null;

      // User logged in - switch to customer address forms
      unmountContainer(CONTAINERS.SHIPPING_ADDRESS_FORM);
      await renderCustomerShippingAddresses(elements.$shippingAddressForm, formRefs.shippingForm, data);

      unmountContainer(CONTAINERS.BILLING_ADDRESS_FORM);
      await renderCustomerBillingAddresses(elements.$billingForm, formRefs.billingForm, data);
    }
    wasAuthenticated = currentAuthState;

    if (isInProgress) {
      // During checkout progress, only update existing containers if needed
      // Don't show new steps - that's handled by handleCheckoutFlow
      return;
    }

    isInProgress = true;

    // Execute unified checkout flow
    await handleCheckoutFlow(data);
  };

  const handleCheckoutStepCompleted = () => {
    const checkoutSteps = Object.values(steps);

    if (checkoutSteps.some((step) => step.isActive())) return;

    const data = latestCheckoutData;

    const areAllStepsCompleted = checkoutSteps
      .every((step) => step.isComplete(data));

    if (areAllStepsCompleted) {
      updatePlaceOrder({ disabled: false });
    }
  };

  const handleOrderPlaced = async (orderData) => {
    // Clear address form data
    sessionStorage.removeItem(SHIPPING_ADDRESS_DATA_KEY);
    sessionStorage.removeItem(BILLING_ADDRESS_DATA_KEY);

    const token = getUserTokenCookie();
    const orderRef = token ? orderData.number : orderData.token;
    const orderNumber = orderData.number;
    const encodedOrderRef = encodeURIComponent(orderRef);
    const encodedOrderNumber = encodeURIComponent(orderNumber);

    const url = token
      ? `/order-details?orderRef=${encodedOrderRef}`
      : `/order-details?orderRef=${encodedOrderRef}&orderNumber=${encodedOrderNumber}`;

    window.history.pushState({}, '', url);

    await displayOrderConfirmation(orderData);
  };

  async function init() {
    // Render all static containers FIRST before registering event listeners.
    await Promise.all([
      renderMergedCartBanner(elements.$mergedCartBanner),
      renderOutOfStock(elements.$outOfStock),
      renderServerError(elements.$serverError, block),
      renderCheckoutHeader(elements.$header),
      renderBillingStepTitle(elements.$billingStepTitle),
      renderOrderSummary(elements.$orderSummary),
      renderCartSummaryList(elements.$cartSummary),
      renderTermsAndConditions(elements.$termsAndConditions),
      renderPlaceOrder(elements.$placeOrder, { handleValidation, handlePlaceOrder }),
    ]);

    // Now register event listeners (eager checkout/initialized will replay safely)
    events.on('authenticated', handleAuthenticated);
    events.on('checkout/initialized', handleCheckoutUpdate, { eager: true });
    events.on('checkout/updated', handleCheckoutUpdate);
    events.on('order/placed', handleOrderPlaced);
    events.on('checkout/step/completed', handleCheckoutStepCompleted);
    events.on('checkout/values', async () => {
      if (isBillingStepShown && latestCheckoutData) {
        await handleCheckoutFlow(latestCheckoutData);
      }
    });
  }

  return { init };
};

export default createStepsManager;
