import CustomerInformation from '@dropins/storefront-account/containers/CustomerInformation.js';
import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import {
  CUSTOMER_LOGIN_PATH,
  checkIsAuthenticated,
  rootLink,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

export default async function decorate(block) {
  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
  } else {
    block.innerHTML = '';

    // Create the section heading to match Figma design
    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = 'Account Information';
    block.appendChild(headingEl);

    // Create container for the customer information Dropin
    const dropinContainer = document.createElement('div');
    dropinContainer.classList.add('commerce-customer-information-dropin');
    block.appendChild(dropinContainer);

    await accountRenderer.render(CustomerInformation, {})(dropinContainer);
  }
}
