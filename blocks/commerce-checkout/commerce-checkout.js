/* eslint-disable import/no-unresolved */

// Dropin Tools
import { initReCaptcha } from '@dropins/tools/recaptcha.js';

// Block Utilities
import { setMetaTags } from './utils.js';

// Fragment functions
import { createCheckoutFragment } from './fragments.js';

// Steps manager (multi-step checkout orchestrator)
import createStepsManager from './steps.js';

// Initializers
import '../../scripts/initializers/account.js';
import '../../scripts/initializers/checkout.js';
import '../../scripts/initializers/order.js';
import '../../scripts/initializers/payment-services.js';

// Checkout success block preload
import { preloadCheckoutSuccess } from '../commerce-checkout-success/commerce-checkout-success.js';

preloadCheckoutSuccess();

export default async function decorate(block) {
  setMetaTags('Checkout');
  document.title = 'Checkout';

  // Initialize reCAPTCHA
  await initReCaptcha(0);

  // Build the multi-step checkout DOM
  const checkoutFragment = createCheckoutFragment();
  block.appendChild(checkoutFragment);

  // Initialize the multi-step flow
  const stepsManager = createStepsManager(block);
  await stepsManager.init();
}
