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
  getCartPaymentMethod,
  isValidPaymentMethod,
} from '../utils.js';

// Container functions
import {
  CONTAINERS,
  renderPaymentMethods,
  renderBillToShippingAddress,
  renderCustomerBillingAddresses,
  renderBillingAddressForm,
  unmountContainer,
} from '../containers.js';

// Fragments
import {
  createAddressSummary,
  createPaymentMethodsSummary,
  selectors,
} from '../fragments.js';

// Constants
import {
  CHECKOUT_STEP_ACTIVE,
  BILLING_FORM_NAME,
} from '../constants.js';

/**
 * Creates Billing & Payment step management functions (Step 2)
 */
export const createBillingStep = ({
  activateStep,
  disablePlaceOrderButton,
  formRefs,
  getElement,
  isAuthenticated,
  withOverlaySpinner,
  updateProgressBar,
}) => {
  const { checkout } = selectors;

  const elements = {
    $paymentMethodsList: getElement(checkout.paymentMethodsList),
    $paymentMethodsSummary: getElement(checkout.paymentMethodsSummary),
    $billToShipping: getElement(checkout.billToShipping),
    $billingForm: getElement(checkout.billingForm),
    $billingFormSummary: getElement(checkout.billingFormSummary),
    $billingStep: getElement(checkout.billingStep),
  };

  async function displayBillingStep(active = true, data = null) {
    if (active) {
      updateProgressBar(2);
      // 1. Render Payment methods
      await renderPaymentMethods(
        elements.$paymentMethodsList,
        formRefs.creditCardForm,
      );

      // 2. Render Bill to shipping checkbox
      await renderBillToShippingAddress(elements.$billToShipping);

      // 3. Render or unmount Billing address form depending on isBillToShipping toggle
      const checkoutValues = events.lastPayload('checkout/values');
      const isBillToShipping = checkoutValues?.isBillToShipping ?? true;

      if (!isBillToShipping) {
        if (isAuthenticated()) {
          await renderCustomerBillingAddresses(
            elements.$billingForm,
            formRefs.billingForm,
            data,
          );
        } else {
          await renderBillingAddressForm(
            elements.$billingForm,
            formRefs.billingForm,
            data,
          );
        }
      } else {
        unmountContainer(CONTAINERS.BILLING_ADDRESS_FORM);
        unmountContainer(CONTAINERS.CUSTOMER_BILLING_ADDRESSES);
        formRefs.billingForm.current = null;
        elements.$billingForm.innerHTML = '';
      }

      elements.$billingStep.classList.add(CHECKOUT_STEP_ACTIVE);
    } else {
      elements.$billingStep.classList.remove(CHECKOUT_STEP_ACTIVE);
    }
  }

  async function displayBillingStepSummary(
    paymentMethod = null,
    billingAddress = null,
    showEditLink = true,
  ) {
    const handleEdit = showEditLink ? async () => {
      disablePlaceOrderButton();
      await displayBillingStep(true, events.lastPayload('checkout/updated'));
    } : null;

    // 1. Payment Summary
    if (paymentMethod) {
      const paymentSummary = createPaymentMethodsSummary(paymentMethod, handleEdit);
      elements.$paymentMethodsSummary.innerHTML = '';
      elements.$paymentMethodsSummary.appendChild(paymentSummary);
    } else {
      elements.$paymentMethodsSummary.innerHTML = '';
    }

    // 2. Billing Address Summary
    if (billingAddress) {
      const billingSummary = createAddressSummary(billingAddress, handleEdit);
      elements.$billingFormSummary.innerHTML = '';
      elements.$billingFormSummary.appendChild(billingSummary);
    } else {
      elements.$billingFormSummary.innerHTML = '';
    }

    elements.$billingStep.classList.remove(CHECKOUT_STEP_ACTIVE);
  }

  const isBillingStepComplete = (data) => {
    if (!data) return false;
    const paymentMethod = getCartPaymentMethod(data);
    const checkoutValues = events.lastPayload('checkout/values');
    const isBillToShipping = checkoutValues?.isBillToShipping ?? true;

    if (isBillToShipping) {
      return !!paymentMethod;
    }

    const cartBillingAddress = getCartAddress(data, 'billing');
    return !!(paymentMethod && cartBillingAddress);
  };

  const isBillingStepActive = () => elements.$billingStep.classList.contains(CHECKOUT_STEP_ACTIVE);

  return {
    display: displayBillingStep,
    displaySummary: displayBillingStepSummary,
    isActive: isBillingStepActive,
    isComplete: isBillingStepComplete,
  };
};
