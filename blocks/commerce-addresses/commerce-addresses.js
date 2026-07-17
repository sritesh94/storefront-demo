import AddressForm from '@dropins/storefront-account/containers/AddressForm.js';
import { getCustomerAddress, removeCustomerAddress } from '@dropins/storefront-account/api.js';
import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import { readBlockConfig } from '../../scripts/aem.js';
import {
  CUSTOMER_ADDRESS_PATH,
  CUSTOMER_LOGIN_PATH,
  checkIsAuthenticated,
  rootLink,
  CORE_FETCH_GRAPHQL,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

const countryNames = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
};

function getCountryName(code) {
  return countryNames[code?.toUpperCase()] || code || '';
}

async function getAddresses() {
  try {
    const response = await CORE_FETCH_GRAPHQL.fetchGraphQl(`
      query GetCustomerAddresses {
        customer {
          addresses {
            id
            firstname
            lastname
            street
            city
            region {
              region
              region_code
            }
            postcode
            country_code
            telephone
            default_shipping
            default_billing
          }
        }
      }
    `);
    return response?.data?.customer?.addresses || [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching addresses:', err);
    return [];
  }
}

export default async function decorate(block) {
  const {
    'minified-view': minifiedViewConfig = 'false',
  } = readBlockConfig(block);

  const isMinified = minifiedViewConfig === 'true';

  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
    return;
  }

  // Robust route detection that supports localized prefix URLs
  const CUSTOMER_ADDRESS_EDIT_PATH = `${CUSTOMER_ADDRESS_PATH}/edit`;
  const editPath = rootLink(CUSTOMER_ADDRESS_EDIT_PATH);
  const isEditPage = window.location.pathname === editPath || window.location.pathname === `${editPath}/`;

  block.innerHTML = '';

  if (isEditPage) {
    // Render Edit/Add Address Page
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('commerce-account-section-header-container');

    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = 'Edit Address';
    headerContainer.appendChild(headingEl);
    block.appendChild(headerContainer);

    const formContainer = document.createElement('div');
    formContainer.classList.add('commerce-address-form-container');
    block.appendChild(formContainer);

    const urlParams = new URLSearchParams(window.location.search);
    const addressId = urlParams.get('id');

    let addressData = null;
    if (addressId) {
      headingEl.innerText = 'Edit Address';
      // Load selected address using the storefront-account API
      const addresses = await getCustomerAddress();
      addressData = addresses.find((addr) => String(addr.id) === String(addressId));
    } else {
      headingEl.innerText = 'Add New Address';
    }

    await accountRenderer.render(AddressForm, {
      inputsDefaultValueSet: addressData,
      hideActionFormButtons: false,
      onSuccess: () => {
        window.location.href = rootLink(CUSTOMER_ADDRESS_PATH);
      },
      onCloseBtnClick: () => {
        window.location.href = rootLink(CUSTOMER_ADDRESS_PATH);
      },
    })(formContainer);

    return;
  }

  // Render Address Book List View
  const headerContainer = document.createElement('div');
  headerContainer.classList.add('commerce-account-section-header-container');

  const headingEl = document.createElement('h2');
  headingEl.classList.add('commerce-account-section-heading');
  headingEl.innerText = 'Address Book';
  headerContainer.appendChild(headingEl);

  // Render "Manage Address" link if in minified view (Dashboard)
  if (isMinified) {
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

  const customContainer = document.createElement('div');
  customContainer.classList.add('custom-addresses-layout');
  block.appendChild(customContainer);

  const customListContainer = document.createElement('div');
  customListContainer.classList.add('custom-addresses-list-container');
  customContainer.appendChild(customListContainer);

  async function renderCustomLayout() {
    const addresses = await getAddresses();
    customListContainer.innerHTML = '';

    if (isMinified) {
      // Render Dashboard View
      const columnsWrapper = document.createElement('div');
      columnsWrapper.classList.add('custom-addresses-dashboard-columns');

      const billingAddress = addresses.find((addr) => addr.default_billing);
      const shippingAddress = addresses.find((addr) => addr.default_shipping);

      // Billing card
      const billingCard = document.createElement('div');
      billingCard.classList.add('custom-address-card');
      billingCard.innerHTML = `
        <h3 class="custom-address-card-title">Default Billing Address</h3>
        <div class="custom-address-card-content">
          ${billingAddress ? `
            <p class="custom-address-name">${billingAddress.firstname} ${billingAddress.lastname}</p>
            <p class="custom-address-street">${billingAddress.street.join('<br>')}</p>
            <p class="custom-address-region">${billingAddress.city}, ${billingAddress.region?.region || billingAddress.region?.region_code || ''} ${billingAddress.postcode}</p>
            <p class="custom-address-country">${getCountryName(billingAddress.country_code)}</p>
            <p class="custom-address-phone">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${billingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${billingAddress.id}" class="custom-address-action-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Address
              </a>
            </div>
          ` : '<p class="custom-address-empty">You have no default billing address.</p>'}
        </div>
      `;
      columnsWrapper.appendChild(billingCard);

      // Shipping card
      const shippingCard = document.createElement('div');
      shippingCard.classList.add('custom-address-card');
      shippingCard.innerHTML = `
        <h3 class="custom-address-card-title">Default Shipping Address</h3>
        <div class="custom-address-card-content">
          ${shippingAddress ? `
            <p class="custom-address-name">${shippingAddress.firstname} ${shippingAddress.lastname}</p>
            <p class="custom-address-street">${shippingAddress.street.join('<br>')}</p>
            <p class="custom-address-region">${shippingAddress.city}, ${shippingAddress.region?.region || shippingAddress.region?.region_code || ''} ${shippingAddress.postcode}</p>
            <p class="custom-address-country">${getCountryName(shippingAddress.country_code)}</p>
            <p class="custom-address-phone">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${shippingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${shippingAddress.id}" class="custom-address-action-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Address
              </a>
            </div>
          ` : '<p class="custom-address-empty">You have no default shipping address.</p>'}
        </div>
      `;
      columnsWrapper.appendChild(shippingCard);

      customListContainer.appendChild(columnsWrapper);
    } else {
      // Render Manage Address Page View (Full view)
      const defaultHeading = document.createElement('h3');
      defaultHeading.classList.add('custom-addresses-subheading');
      defaultHeading.innerText = 'Default Addresses';
      customListContainer.appendChild(defaultHeading);

      const columnsWrapper = document.createElement('div');
      columnsWrapper.classList.add('custom-addresses-full-columns');

      const billingAddress = addresses.find((addr) => addr.default_billing);
      const shippingAddress = addresses.find((addr) => addr.default_shipping);

      // Billing card
      const billingCard = document.createElement('div');
      billingCard.classList.add('custom-address-card');
      billingCard.innerHTML = `
        <h4 class="custom-address-card-title">Default Billing Address</h4>
        <div class="custom-address-card-content">
          ${billingAddress ? `
            <p class="custom-address-name">${billingAddress.firstname} ${billingAddress.lastname}</p>
            <p class="custom-address-street">${billingAddress.street.join('<br>')}</p>
            <p class="custom-address-region">${billingAddress.city}, ${billingAddress.region?.region || billingAddress.region?.region_code || ''} ${billingAddress.postcode}</p>
            <p class="custom-address-country">${getCountryName(billingAddress.country_code)}</p>
            <p class="custom-address-phone">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${billingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${billingAddress.id}" class="custom-address-action-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Address
              </a>
            </div>
          ` : '<p class="custom-address-empty">You have no default billing address.</p>'}
        </div>
      `;
      columnsWrapper.appendChild(billingCard);

      // Shipping card
      const shippingCard = document.createElement('div');
      shippingCard.classList.add('custom-address-card');
      shippingCard.innerHTML = `
        <h4 class="custom-address-card-title">Default Shipping Address</h4>
        <div class="custom-address-card-content">
          ${shippingAddress ? `
            <p class="custom-address-name">${shippingAddress.firstname} ${shippingAddress.lastname}</p>
            <p class="custom-address-street">${shippingAddress.street.join('<br>')}</p>
            <p class="custom-address-region">${shippingAddress.city}, ${shippingAddress.region?.region || shippingAddress.region?.region_code || ''} ${shippingAddress.postcode}</p>
            <p class="custom-address-country">${getCountryName(shippingAddress.country_code)}</p>
            <p class="custom-address-phone">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${shippingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${shippingAddress.id}" class="custom-address-action-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Address
              </a>
            </div>
          ` : '<p class="custom-address-empty">You have no default shipping address.</p>'}
        </div>
      `;
      columnsWrapper.appendChild(shippingCard);

      customListContainer.appendChild(columnsWrapper);

      // Additional addresses
      const additionalAddresses = addresses.filter(
        (addr) => !addr.default_billing && !addr.default_shipping,
      );
      if (additionalAddresses.length > 0) {
        const additionalHeading = document.createElement('h3');
        additionalHeading.classList.add('custom-addresses-subheading', 'custom-addresses-additional-title');
        additionalHeading.innerText = 'Additional Address Entries';
        customListContainer.appendChild(additionalHeading);

        const additionalWrapper = document.createElement('div');
        additionalWrapper.classList.add('custom-additional-addresses-container');

        additionalAddresses.forEach((addr) => {
          const addrCard = document.createElement('div');
          addrCard.classList.add('custom-address-card', 'custom-additional-address-card');
          addrCard.innerHTML = `
            <h4 class="custom-address-card-title">Additional Address</h4>
            <div class="custom-address-card-content">
              <p class="custom-address-name">${addr.firstname} ${addr.lastname}</p>
              <p class="custom-address-street">${addr.street.join('<br>')}</p>
              <p class="custom-address-region">${addr.city}, ${addr.region?.region || addr.region?.region_code || ''} ${addr.postcode}</p>
              <p class="custom-address-country">${getCountryName(addr.country_code)}</p>
              <p class="custom-address-phone">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                ${addr.telephone}
              </p>
              <div class="custom-address-card-actions">
                <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${addr.id}" class="custom-address-action-btn">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  Edit Address
                </a>
                <button type="button" class="custom-address-action-btn delete-btn" data-id="${addr.id}" style="margin-left: 24px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete Address
                </button>
              </div>
            </div>
          `;
          additionalWrapper.appendChild(addrCard);
        });
        customListContainer.appendChild(additionalWrapper);
      }

      // Add New Address button
      const addBtnContainer = document.createElement('div');
      addBtnContainer.classList.add('custom-add-address-button-container');
      addBtnContainer.innerHTML = `
        <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}" class="custom-add-new-address-btn">Add New Address</a>
      `;
      customListContainer.appendChild(addBtnContainer);
    }

    // Add event listeners for delete buttons
    customListContainer.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const addressId = e.currentTarget.getAttribute('data-id');
        // eslint-disable-next-line no-alert
        if (addressId && window.confirm('Are you sure you want to delete this address?')) {
          try {
            await removeCustomerAddress(Number(addressId));
            renderCustomLayout();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to delete address:', err);
          }
        }
      });
    });
  }

  // Initial render
  await renderCustomLayout();
}
