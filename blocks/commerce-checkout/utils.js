/* eslint-disable import/no-unresolved */
import { ProgressSpinner, provider as UI } from '@dropins/tools/components.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import { validateForms } from '@dropins/storefront-checkout/lib/utils.js';
import { ORDER_DETAILS_PATH, rootLink } from '../../scripts/commerce.js';
import { getUserTokenCookie } from '../../scripts/initializers/index.js';
import createModal from '../modal/modal.js';
/**
 * Displays an overlay spinner in the specified container
 * @param {Object} loaderRef - Ref object to store the spinner component
 * @param {HTMLElement} $loader - DOM element to render the spinner in
 */
export const displayOverlaySpinner = async (loaderRef, $loader) => {
  if (loaderRef.current) return;

  loaderRef.current = await UI.render(ProgressSpinner, {
    className: '.checkout__overlay-spinner',
  })($loader);
};

/**
 * Removes the overlay spinner and cleans up references
 * @param {Object} loaderRef - Ref object containing the spinner component
 * @param {HTMLElement} $loader - DOM element containing the spinner
 */
export const removeOverlaySpinner = (loaderRef, $loader) => {
  if (!loaderRef.current) return;

  loaderRef.current.remove();
  loaderRef.current = null;
  $loader.innerHTML = '';
};

// Modal state management
let modal;

/**
 * Shows a modal with the specified content
 * @param {HTMLElement} content - DOM element to display in the modal
 */
export const showModal = async (content) => {
  modal = await createModal([content]);
  modal.showModal();
};

/**
 * Removes the currently displayed modal and cleans up references
 */
export const removeModal = () => {
  if (!modal) return;
  modal.removeModal();
  modal = null;
};

/**
 * Renders AEM asset images for gift option swatches
 * @param {Object} ctx - The context object containing imageSwatchContext and defaultImageProps
 */
export function swatchImageSlot(ctx) {
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

/**
 * Builds the order details URL based on authentication status
 * @param {Object} orderData - Order data containing number and token
 * @param {string} orderDetailsPath - Path to the order details page
 * @returns {string} The constructed order details URL
 */
export function buildOrderDetailsUrl(orderData, orderDetailsPath = ORDER_DETAILS_PATH) {
  const token = getUserTokenCookie();
  const orderRef = token ? orderData.number : orderData.token;
  const orderNumber = orderData.number;
  const encodedOrderRef = encodeURIComponent(orderRef);
  const encodedOrderNumber = encodeURIComponent(orderNumber);

  return token
    ? rootLink(`${orderDetailsPath}?orderRef=${encodedOrderRef}`)
    : rootLink(`${orderDetailsPath}?orderRef=${encodedOrderRef}&orderNumber=${encodedOrderNumber}`);
}

// =============================================================================
// MULTI-STEP CHECKOUT UTILITIES
// =============================================================================

/**
 * Gets a shipping or billing address from cart data.
 * @param {Object} data - Cart data.
 * @param {'shipping'|'billing'} type - Address type.
 * @returns {Object|null}
 */
export const getCartAddress = (data, type) => {
  if (!data) return null;
  if (type === 'billing') return data.billingAddress || null;
  return data.shippingAddresses?.[0] || null;
};

/**
 * Gets the selected shipping method from cart data.
 * @param {Object} data - Cart data.
 * @returns {Object|null}
 */
export const getCartShippingMethod = (data) => {
  if (!data) return null;
  return data.shippingAddresses?.[0]?.selectedShippingMethod || null;
};

/**
 * Gets the selected payment method from cart data.
 * @param {Object} data - Cart data.
 * @returns {Object|null}
 */
export const getCartPaymentMethod = (data) => {
  if (!data) return null;
  return data.selectedPaymentMethod?.code ? data.selectedPaymentMethod : null;
};

/**
 * Determines if the cart contains only virtual/downloadable products.
 * The checkout dropin may expose productType directly on each item.
 * @param {Object} data - Cart data.
 * @returns {boolean}
 */
export const isVirtualCart = (data) => {
  if (!data) return false;
  // Use totalQuantity to confirm there are items first
  if (data.totalQuantity === 0) return false;
  if (!data.items?.length) return false;
  const virtualTypes = ['VirtualProduct', 'DownloadableProduct', 'virtual', 'downloadable'];
  return data.items.every(
    (item) => virtualTypes.includes(item.product?.__typename)
      || virtualTypes.includes(item.product?.productType)
      || virtualTypes.includes(item.productType),
  );
};

/**
 * Checks if cart data is truly empty (no items in the cart).
 * The checkout dropin's data payload uses `totalQuantity` as the
 * canonical indicator — `items` may be absent or differently shaped
 * depending on the event (checkout/initialized vs checkout/updated).
 * @param {Object} data - Checkout cart data.
 * @returns {boolean}
 */
export const isDataEmpty = (data) => {
  if (!data) return true;
  // totalQuantity is the most reliable signal from the checkout dropin
  if (typeof data.totalQuantity === 'number') {
    return data.totalQuantity === 0;
  }
  // Fallback: check items array
  if (Array.isArray(data.items)) {
    return data.items.length === 0;
  }
  // If neither field exists, assume data is still loading — not empty
  return false;
};

/**
 * Checks if a payment method selection is valid.
 * @param {Object} checkoutValues - Current checkout values from event bus.
 * @param {Object} creditCardFormRef - Ref for the credit card form, if any.
 * @returns {boolean}
 */
export const isValidPaymentMethod = (checkoutValues, creditCardFormRef) => {
  const method = checkoutValues?.selectedPaymentMethod;
  if (!method?.code) return false;
  if (method.code === 'payment_services_paypal_hosted_fields') {
    return !!(creditCardFormRef?.current);
  }
  return true;
};

/**
 * Transforms address form values to the format expected by the checkout API.
 * @param {Object} formValues - Address form values.
 * @returns {Object} Transformed address data.
 */
export const transformAddressFormValues = (formValues) => {
  if (!formValues) return {};
  if (formValues.id || formValues.uid) {
    return {
      customerAddressId: formValues.id || formValues.uid,
    };
  }
  const {
    firstName, lastName, street, city, region, postcode, countryCode, telephone,
    saveInAddressBook, saveAddressBook,
  } = formValues;

  let regionVal = '';
  let regionIdVal = null;
  if (region && typeof region === 'object') {
    regionVal = region.code || region.regionCode || '';
    regionIdVal = region.id || region.regionId || null;
  } else if (region) {
    regionVal = region;
  }

  return {
    address: {
      firstName,
      lastName,
      street: Array.isArray(street) ? street : [street].filter(Boolean),
      city,
      region: regionVal,
      regionId: regionIdVal ? Number(regionIdVal) : null,
      postcode: postcode || formValues.postCode,
      countryCode: countryCode || formValues.country?.code || formValues.countryCode,
      telephone,
      saveInAddressBook: saveInAddressBook ?? saveAddressBook ?? false,
    },
  };
};

/**
 * Validates a named form and optionally checks a form ref.
 * @param {string} formName - Name of the form to validate.
 * @param {Object} [formRef] - Optional ref with a validate() method.
 * @returns {boolean}
 */
export const validateForm = (formName, formRef) => {
  const results = validateForms([{ name: formName, ref: formRef }]);
  return results;
};

/**
 * Sets document meta tags for the current page.
 * @param {string} title - The page title to set.
 */
export const setMetaTags = (title) => {
  document.title = title;
};

/**
 * Scrolls the page to a specific element.
 * @param {HTMLElement} element - The element to scroll into view.
 */
export const scrollToElement = (element) => {
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
