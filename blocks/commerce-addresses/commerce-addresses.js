import { Addresses } from '@dropins/storefront-account/containers/Addresses.js';
import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import { readBlockConfig } from '../../scripts/aem.js';
import {
  CUSTOMER_ADDRESS_PATH,
  CUSTOMER_LOGIN_PATH,
  checkIsAuthenticated,
  rootLink,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

export default async function decorate(block) {
  const {
    'minified-view': minifiedViewConfig = 'false',
  } = readBlockConfig(block);

  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
  } else {
    block.innerHTML = '';

    // Create the section header container to match Figma (Title + Link next to it)
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('commerce-account-section-header-container');

    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = 'Address Book';
    headerContainer.appendChild(headingEl);

    // Render "Manage Address" link if in minified view (Dashboard)
    if (minifiedViewConfig === 'true') {
      const manageAddressLink = document.createElement('a');
      manageAddressLink.classList.add('commerce-account-section-link');
      manageAddressLink.href = rootLink(CUSTOMER_ADDRESS_PATH);
      manageAddressLink.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="pink-svg" style="margin-right: 4px; vertical-align: middle;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
        </svg>Manage Address`;
      headerContainer.appendChild(manageAddressLink);
    }

    block.appendChild(headerContainer);

    // Create container for the Addresses Dropin
    const dropinContainer = document.createElement('div');
    dropinContainer.classList.add('commerce-addresses-dropin');
    block.appendChild(dropinContainer);

    await accountRenderer.render(Addresses, {
      minifiedView: minifiedViewConfig === 'true',
      withActionsInMinifiedView: false,
      withActionsInFullSizeView: true,
      routeAddressesPage: () => rootLink(CUSTOMER_ADDRESS_PATH),
    })(dropinContainer);
  }
}
