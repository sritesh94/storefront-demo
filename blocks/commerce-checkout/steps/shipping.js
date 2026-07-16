/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-vars */
/* eslint-disable import/prefer-default-export */

// Dropin Tools
import { events } from '@dropins/tools/event-bus.js';

// Checkout Dropin
import * as checkoutApi from '@dropins/storefront-checkout/api.js';

// Block-level utils
import {
  getCartAddress,
  getCartShippingMethod,
  isVirtualCart,
  transformAddressFormValues,
  validateForm,
} from '../utils.js';

// Container functions
import {
  CONTAINERS,
  renderCustomerShippingAddresses,
  renderLoginForm,
  renderShippingAddressForm,
  renderShippingMethods,
  unmountContainer,
} from '../containers.js';

// Components
import {
  COMPONENT_IDS,
  renderStepContinueBtn,
} from '../components.js';

// Fragments
import {
  createAddressSummary,
  createLoginFormSummary,
  createShippingMethodsSummary,
  selectors,
} from '../fragments.js';

// Constants
import {
  CHECKOUT_STEP_ACTIVE,
  LOGIN_FORM_NAME,
  SHIPPING_FORM_NAME,
} from '../constants.js';

/**
 * Creates shipping step management functions (Step 1)
 */
export const createShippingStep = ({
  activateStep,
  disablePlaceOrderButton,
  displayBillingStep,
  formRefs,
  getElement,
  isAuthenticated,
  resetProgress,
  withOverlaySpinner,
  updateProgressBar,
}) => {
  // Shipping-specific DOM elements
  const { checkout } = selectors;

  const elements = {
    $loginForm: getElement(checkout.loginForm),
    $loginFormSummary: getElement(checkout.loginFormSummary),
    $shippingAddressForm: getElement(checkout.shippingAddressForm),
    $shippingAddressFormSummary: getElement(checkout.shippingAddressFormSummary),
    $shippingMethodList: getElement(checkout.shippingMethodList),
    $shippingMethodSummary: getElement(checkout.shippingMethodSummary),
    $shippingStep: getElement(checkout.shippingStep),
    $shippingStepContinueBtn: getElement(checkout.shippingStepContinueBtn),
  };

  const isActiveCartVirtual = () => {
    const cart = events.lastPayload('checkout/updated');
    return isVirtualCart(cart);
  };

  const continueFromShippingStep = withOverlaySpinner(async () => {
    const authenticated = isAuthenticated();
    const checkoutValues = events.lastPayload('checkout/values');
    const email = checkoutValues?.email;

    // 1. Contact / Email validation and save
    if (!authenticated) {
      if (!validateForm(LOGIN_FORM_NAME)) return;

      try {
        await checkoutApi.setGuestEmailOnCart(email);
      } catch (error) {
        console.error('Error setting guest email on cart:', error);
        return;
      }
    }

    if (isActiveCartVirtual()) {
      // Virtual products: skip shipping address and shipping methods
      await displayShippingStep(false);
      await displayShippingStepSummary(email, null, null);
      await displayBillingStep(true);
      events.emit('checkout/step/completed', null);
      return;
    }

    // 2. Shipping address validation
    if (!validateForm(SHIPPING_FORM_NAME, formRefs.shippingForm)) return;

    // Get shipping address from form ref first, fall back to events if form is unmounted
    const shippingAddress = formRefs.shippingForm.current?.formData
                           || events.lastPayload('checkout/addresses/shipping')?.data;

    try {
      await checkoutApi.setShippingAddress(transformAddressFormValues(shippingAddress));
    } catch (error) {
      console.error('Failed to set shipping address:', error);
      return;
    }

    // 3. Shipping method validation and save
    const selectedShippingMethod = checkoutValues?.selectedShippingMethod;
    if (!selectedShippingMethod?.carrier?.code || !selectedShippingMethod?.code) {
      // eslint-disable-next-line no-console
      console.warn('Please select a shipping method.');
      return;
    }

    try {
      await checkoutApi.setShippingMethodsOnCart([{
        carrier_code: selectedShippingMethod.carrier.code,
        method_code: selectedShippingMethod.code,
      }]);
    } catch (error) {
      console.error('Failed to set shipping method:', error);
      return;
    }

    // Update Step 1 visibility
    await displayShippingStep(false);
    await displayShippingStepSummary(email, shippingAddress, selectedShippingMethod);
    await displayBillingStep(true);

    // Allow subsequent checkout/updated events to reach handleCheckoutFlow
    // so that PlaceOrder is enabled once the user completes billing/payment.
    resetProgress();

    events.emit('checkout/step/completed', null);
  });

  async function displayShippingStep(active = true, data = null) {
    if (active) {
      updateProgressBar(1);
    }
    activateStep(elements.$shippingStep, active);

    await renderLoginForm(elements.$loginForm, {
      onSuccessCallback: withOverlaySpinner(() => new Promise((resolve) => {
        const listener = events.on('checkout/updated', () => {
          listener.off();
          resolve();
        });
      })),
    });

    if (!isActiveCartVirtual()) {
      if (isAuthenticated()) {
        await renderCustomerShippingAddresses(
          elements.$shippingAddressForm,
          formRefs.shippingForm,
          data,
        );
      } else {
        await renderShippingAddressForm(
          elements.$shippingAddressForm,
          formRefs.shippingForm,
          data,
        );
      }

      // Render shipping methods in Step 1
      await renderShippingMethods(elements.$shippingMethodList);
    } else {
      // For virtual products, unmount shipping address and methods
      unmountContainer(CONTAINERS.SHIPPING_ADDRESS_FORM);
      unmountContainer(CONTAINERS.CUSTOMER_SHIPPING_ADDRESSES);
      unmountContainer(CONTAINERS.SHIPPING_METHODS);
      formRefs.shippingForm.current = null;
      elements.$shippingAddressForm.innerHTML = '';
      elements.$shippingMethodList.innerHTML = '';
    }

    await renderStepContinueBtn(
      elements.$shippingStepContinueBtn,
      COMPONENT_IDS.SHIPPING_STEP_CONTINUE_BTN,
      continueFromShippingStep,
      'Next',
    );
  }

  async function displayShippingStepSummary(email, shippingAddress = null, shippingMethod = null) {
    const handleEdit = async () => {
      disablePlaceOrderButton();
      await displayBillingStep(false);
      await displayShippingStep(true, events.lastPayload('checkout/updated'));
    };

    // 1. Email Summary
    const loginFormSummary = createLoginFormSummary(email, handleEdit);
    elements.$loginFormSummary.innerHTML = '';
    elements.$loginFormSummary.appendChild(loginFormSummary);

    // 2. Shipping Address Summary
    if (shippingAddress) {
      const shippingAddressFormSummary = createAddressSummary(shippingAddress, handleEdit);
      elements.$shippingAddressFormSummary.innerHTML = '';
      elements.$shippingAddressFormSummary.appendChild(shippingAddressFormSummary);
    } else {
      elements.$shippingAddressFormSummary.innerHTML = '';
    }

    // 3. Shipping Method Summary
    if (shippingMethod) {
      const summaryData = {
        label: shippingMethod.carrier?.title || shippingMethod.carrier?.code || 'Unknown Carrier',
        description: shippingMethod.title || shippingMethod.description || '',
      };
      const shippingMethodSummary = createShippingMethodsSummary(summaryData, handleEdit);
      elements.$shippingMethodSummary.innerHTML = '';
      elements.$shippingMethodSummary.appendChild(shippingMethodSummary);
    } else {
      elements.$shippingMethodSummary.innerHTML = '';
    }

    elements.$shippingStep.classList.remove(CHECKOUT_STEP_ACTIVE);
  }

  const isShippingStepComplete = (data) => {
    if (!data) return false;
    if (isVirtualCart(data)) {
      return !!data.email;
    }
    const cartShippingAddress = getCartAddress(data, 'shipping');
    const shippingMethod = getCartShippingMethod(data);
    return !!(data.email && cartShippingAddress && shippingMethod);
  };

  const isShippingStepActive = () => elements.$shippingStep.classList
    .contains(CHECKOUT_STEP_ACTIVE);

  return {
    continue: continueFromShippingStep,
    display: displayShippingStep,
    displaySummary: displayShippingStepSummary,
    isActive: isShippingStepActive,
    isComplete: isShippingStepComplete,
  };
};
