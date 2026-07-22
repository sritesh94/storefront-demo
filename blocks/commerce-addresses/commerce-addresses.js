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

  // Normalise the current path (remove trailing slash) and build the edit path (locale‑aware)
  const currentPath = window.location.pathname.replace(/\/$/, '');
  const editPath = rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`).replace(/\/$/, '');

  // Detect edit page – works with or without a trailing slash
  const isEditPage = currentPath === editPath;

  block.innerHTML = '';

  // Only redirect to login when we are NOT on the edit page
  if (!checkIsAuthenticated() && !isEditPage) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
    return;
  }

  // Render the Edit/Add Address form when on the edit route
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
      isOpen: true,
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
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><g clip-path="url(#clip0_7783_292)"><path d="M4.15918 0.87793C4.56157 0.717731 5.00815 0.707625 5.41699 0.850586C5.82559 0.993548 6.16896 1.27951 6.38379 1.65527L7.83496 4.16895H7.83594C8.0749 4.58393 8.13859 5.07749 8.01465 5.54004C7.89065 6.00228 7.58897 6.39688 7.1748 6.63672H7.17383L7.00195 6.73633C6.88996 6.80109 6.79244 6.88918 6.7168 6.99414C6.64124 7.09914 6.58842 7.21896 6.5625 7.3457C6.53654 7.47265 6.53801 7.60405 6.56641 7.73047C6.59481 7.85675 6.64988 7.97555 6.72754 8.0791L7.18555 8.66504C7.65364 9.24259 8.15201 9.79516 8.67871 10.3203L8.67969 10.3213C9.38009 11.0238 10.1297 11.6754 10.9219 12.2725C11.0254 12.35 11.1443 12.4052 11.2705 12.4336C11.3967 12.4619 11.5275 12.4634 11.6543 12.4375C11.7812 12.4115 11.9017 12.359 12.0068 12.2832C12.1119 12.2075 12.1999 12.1102 12.2646 11.998L12.3633 11.8262C12.6032 11.4117 12.9984 11.1093 13.4609 10.9854C13.9234 10.8615 14.4161 10.9261 14.8311 11.165L17.3428 12.6152C17.7192 12.83 18.0063 13.1739 18.1494 13.583C18.2923 13.9916 18.2819 14.4377 18.1221 14.8398L18.1104 14.8711C17.8775 15.4642 17.6695 15.9861 17.4746 16.4033C17.283 16.8134 17.0907 17.1535 16.8828 17.3613C16.2825 17.9615 15.4512 18.25 14.4736 18.25C13.668 18.25 12.7565 18.0547 11.7715 17.6729C9.73918 16.8853 7.54525 15.3694 5.58789 13.4121C3.63054 11.4548 2.11469 9.26079 1.32715 7.22852C0.489893 5.06778 0.539305 3.21701 1.63867 2.11719C1.84645 1.90939 2.18677 1.71789 2.59668 1.52637C3.01378 1.3315 3.535 1.12248 4.12793 0.889648L4.15918 0.876953V0.87793ZM4.82129 2.31445C4.79036 2.31457 4.75924 2.32069 4.73047 2.33203L4.69922 2.34375C4.3801 2.46903 3.92879 2.64651 3.53027 2.81934C3.33076 2.90586 3.14758 2.9899 3.00293 3.06445C2.84803 3.14429 2.76745 3.1985 2.74414 3.22168C2.47348 3.49234 2.31609 3.92367 2.31348 4.5166C2.31091 5.10842 2.46378 5.83713 2.78418 6.66406C3.48801 8.48063 4.87254 10.4878 6.69238 12.3076C8.51224 14.1274 10.5193 15.5118 12.3359 16.2158C13.1629 16.5363 13.8916 16.6891 14.4834 16.6865C15.0763 16.6839 15.5077 16.5265 15.7783 16.2559C15.8016 16.2325 15.8557 16.1519 15.9355 15.9971C16.0101 15.8524 16.0941 15.6693 16.1807 15.4697C16.3535 15.0712 16.531 14.6199 16.6562 14.3008L16.6689 14.2695V14.2686C16.6905 14.2146 16.692 14.1545 16.6729 14.0996C16.6537 14.0447 16.615 13.9985 16.5645 13.9697L16.5635 13.9688L14.0508 12.5186C13.9947 12.4863 13.9278 12.4774 13.8652 12.4941C13.8182 12.5067 13.7758 12.5324 13.7441 12.5684L13.7168 12.6074L13.6172 12.7793C13.4419 13.0828 13.2042 13.3459 12.9199 13.5508C12.6356 13.7556 12.3111 13.8975 11.9678 13.9678C11.6243 14.038 11.2698 14.0348 10.9277 13.958C10.5857 13.8812 10.2638 13.7328 9.9834 13.5225H9.98242C9.13132 12.8812 8.32667 12.1804 7.57422 11.4258V11.4248C6.81997 10.6726 6.11956 9.86832 5.47852 9.01758L5.47754 9.0166C5.2673 8.7363 5.1188 8.41413 5.04199 8.07227C4.96523 7.73034 4.96201 7.37556 5.03223 7.03223C5.10249 6.68899 5.2444 6.36433 5.44922 6.08008C5.65419 5.79566 5.91807 5.5581 6.22168 5.38281L6.39258 5.2832C6.44846 5.25078 6.49004 5.19813 6.50684 5.13574C6.51938 5.08893 6.51715 5.03942 6.50195 4.99414L6.48242 4.9502L5.03125 2.43652L5.03027 2.43555C5.00924 2.39877 4.97901 2.36797 4.94238 2.34668C4.90568 2.32535 4.86374 2.31448 4.82129 2.31445ZM10.709 4.30273C11.7472 4.35524 12.7321 4.79077 13.4707 5.5293C14.2584 6.31699 14.7019 7.38506 14.7031 8.49902L14.6992 8.57617C14.6815 8.75513 14.6019 8.92349 14.4736 9.05176C14.3272 9.19805 14.1289 9.2802 13.9219 9.28027C13.7147 9.28027 13.5156 9.19825 13.3691 9.05176C13.2228 8.90543 13.1408 8.70693 13.1406 8.5L13.127 8.23828C13.0663 7.6344 12.7991 7.0667 12.3662 6.63379C11.8714 6.13904 11.2007 5.86029 10.501 5.85938C10.2938 5.85938 10.0947 5.77737 9.94824 5.63086C9.80182 5.48437 9.71973 5.28526 9.71973 5.07812C9.71983 4.87118 9.80197 4.67276 9.94824 4.52637C10.0947 4.37986 10.2938 4.29688 10.501 4.29688L10.709 4.30273ZM10.501 1.33203C11.4422 1.33206 12.3746 1.51676 13.2441 1.87695C14.1136 2.23716 14.9038 2.76516 15.5693 3.43066C16.2348 4.09616 16.7629 4.88637 17.123 5.75586C17.4832 6.6254 17.668 7.55784 17.668 8.49902C17.668 8.70621 17.586 8.90525 17.4395 9.05176C17.293 9.1982 17.0939 9.28027 16.8867 9.28027C16.6798 9.28015 16.4813 9.19807 16.335 9.05176C16.1885 8.90525 16.1055 8.70621 16.1055 8.49902C16.1054 7.01253 15.515 5.58726 14.4639 4.53613C13.4127 3.48501 11.9875 2.89363 10.501 2.89355C10.2938 2.89355 10.0947 2.81155 9.94824 2.66504C9.80196 2.51866 9.71985 2.32022 9.71973 2.11328C9.71973 1.90617 9.80184 1.70704 9.94824 1.56055C10.0947 1.41404 10.2938 1.33203 10.501 1.33203Z" fill="#FA1792" stroke="#FA1792" stroke-width="0.5"/></g><defs><clipPath id="clip0_7783_292"><rect width="19.0861" height="19" fill="white"/></clipPath></defs></svg>
              ${billingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${billingAddress.id}" class="custom-address-action-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87868 6.87865C4.44129 6.31604 5.20435 5.99997 6 5.99997H9C9.55229 5.99997 10 6.44768 10 6.99997C10 7.55225 9.55229 7.99997 9 7.99997H6C5.73478 7.99997 5.48043 8.10532 5.29289 8.29286C5.10536 8.4804 5 8.73475 5 8.99997V18C5 18.2652 5.10536 18.5195 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H15C15.2652 19 15.5196 18.8946 15.7071 18.7071C15.8946 18.5195 16 18.2652 16 18V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18C18 18.7956 17.6839 19.5587 17.1213 20.1213C16.5587 20.6839 15.7957 21 15 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V8.99997C3 8.20432 3.31607 7.44126 3.87868 6.87865Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7929 2.79288C17.3783 2.20751 18.1722 1.87866 19 1.87866C19.8278 1.87866 20.6218 2.20751 21.2071 2.79288C21.7925 3.37824 22.1213 4.17216 22.1213 4.99998C22.1213 5.82781 21.7925 6.62173 21.2071 7.20709L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.2929 11.2929L16.7929 2.79288ZM19 3.87866C18.7026 3.87866 18.4174 3.9968 18.2071 4.20709L10 12.4142V14H11.5858L19.7929 5.79288C20.0032 5.58259 20.1213 5.29737 20.1213 4.99998C20.1213 4.70259 20.0032 4.41738 19.7929 4.20709C19.5826 3.9968 19.2974 3.87866 19 3.87866Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.2929C15.6834 3.90237 16.3166 3.90237 16.7071 4.2929L19.7071 7.2929C20.0976 7.68342 20.0976 8.31659 19.7071 8.70711C19.3166 9.09764 18.6834 9.09764 18.2929 8.70711L15.2929 5.70711C14.9024 5.31659 14.9024 4.68342 15.2929 4.2929Z" fill="#FA1792"/></svg>
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
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><g clip-path="url(#clip0_7783_292)"><path d="M4.15918 0.87793C4.56157 0.717731 5.00815 0.707625 5.41699 0.850586C5.82559 0.993548 6.16896 1.27951 6.38379 1.65527L7.83496 4.16895H7.83594C8.0749 4.58393 8.13859 5.07749 8.01465 5.54004C7.89065 6.00228 7.58897 6.39688 7.1748 6.63672H7.17383L7.00195 6.73633C6.88996 6.80109 6.79244 6.88918 6.7168 6.99414C6.64124 7.09914 6.58842 7.21896 6.5625 7.3457C6.53654 7.47265 6.53801 7.60405 6.56641 7.73047C6.59481 7.85675 6.64988 7.97555 6.72754 8.0791L7.18555 8.66504C7.65364 9.24259 8.15201 9.79516 8.67871 10.3203L8.67969 10.3213C9.38009 11.0238 10.1297 11.6754 10.9219 12.2725C11.0254 12.35 11.1443 12.4052 11.2705 12.4336C11.3967 12.4619 11.5275 12.4634 11.6543 12.4375C11.7812 12.4115 11.9017 12.359 12.0068 12.2832C12.1119 12.2075 12.1999 12.1102 12.2646 11.998L12.3633 11.8262C12.6032 11.4117 12.9984 11.1093 13.4609 10.9854C13.9234 10.8615 14.4161 10.9261 14.8311 11.165L17.3428 12.6152C17.7192 12.83 18.0063 13.1739 18.1494 13.583C18.2923 13.9916 18.2819 14.4377 18.1221 14.8398L18.1104 14.8711C17.8775 15.4642 17.6695 15.9861 17.4746 16.4033C17.283 16.8134 17.0907 17.1535 16.8828 17.3613C16.2825 17.9615 15.4512 18.25 14.4736 18.25C13.668 18.25 12.7565 18.0547 11.7715 17.6729C9.73918 16.8853 7.54525 15.3694 5.58789 13.4121C3.63054 11.4548 2.11469 9.26079 1.32715 7.22852C0.489893 5.06778 0.539305 3.21701 1.63867 2.11719C1.84645 1.90939 2.18677 1.71789 2.59668 1.52637C3.01378 1.3315 3.535 1.12248 4.12793 0.889648L4.15918 0.876953V0.87793ZM4.82129 2.31445C4.79036 2.31457 4.75924 2.32069 4.73047 2.33203L4.69922 2.34375C4.3801 2.46903 3.92879 2.64651 3.53027 2.81934C3.33076 2.90586 3.14758 2.9899 3.00293 3.06445C2.84803 3.14429 2.76745 3.1985 2.74414 3.22168C2.47348 3.49234 2.31609 3.92367 2.31348 4.5166C2.31091 5.10842 2.46378 5.83713 2.78418 6.66406C3.48801 8.48063 4.87254 10.4878 6.69238 12.3076C8.51224 14.1274 10.5193 15.5118 12.3359 16.2158C13.1629 16.5363 13.8916 16.6891 14.4834 16.6865C15.0763 16.6839 15.5077 16.5265 15.7783 16.2559C15.8016 16.2325 15.8557 16.1519 15.9355 15.9971C16.0101 15.8524 16.0941 15.6693 16.1807 15.4697C16.3535 15.0712 16.531 14.6199 16.6562 14.3008L16.6689 14.2695V14.2686C16.6905 14.2146 16.692 14.1545 16.6729 14.0996C16.6537 14.0447 16.615 13.9985 16.5645 13.9697L16.5635 13.9688L14.0508 12.5186C13.9947 12.4863 13.9278 12.4774 13.8652 12.4941C13.8182 12.5067 13.7758 12.5324 13.7441 12.5684L13.7168 12.6074L13.6172 12.7793C13.4419 13.0828 13.2042 13.3459 12.9199 13.5508C12.6356 13.7556 12.3111 13.8975 11.9678 13.9678C11.6243 14.038 11.2698 14.0348 10.9277 13.958C10.5857 13.8812 10.2638 13.7328 9.9834 13.5225H9.98242C9.13132 12.8812 8.32667 12.1804 7.57422 11.4258V11.4248C6.81997 10.6726 6.11956 9.86832 5.47852 9.01758L5.47754 9.0166C5.2673 8.7363 5.1188 8.41413 5.04199 8.07227C4.96523 7.73034 4.96201 7.37556 5.03223 7.03223C5.10249 6.68899 5.2444 6.36433 5.44922 6.08008C5.65419 5.79566 5.91807 5.5581 6.22168 5.38281L6.39258 5.2832C6.44846 5.25078 6.49004 5.19813 6.50684 5.13574C6.51938 5.08893 6.51715 5.03942 6.50195 4.99414L6.48242 4.9502L5.03125 2.43652L5.03027 2.43555C5.00924 2.39877 4.97901 2.36797 4.94238 2.34668C4.90568 2.32535 4.86374 2.31448 4.82129 2.31445ZM10.709 4.30273C11.7472 4.35524 12.7321 4.79077 13.4707 5.5293C14.2584 6.31699 14.7019 7.38506 14.7031 8.49902L14.6992 8.57617C14.6815 8.75513 14.6019 8.92349 14.4736 9.05176C14.3272 9.19805 14.1289 9.2802 13.9219 9.28027C13.7147 9.28027 13.5156 9.19825 13.3691 9.05176C13.2228 8.90543 13.1408 8.70693 13.1406 8.5L13.127 8.23828C13.0663 7.6344 12.7991 7.0667 12.3662 6.63379C11.8714 6.13904 11.2007 5.86029 10.501 5.85938C10.2938 5.85938 10.0947 5.77737 9.94824 5.63086C9.80182 5.48437 9.71973 5.28526 9.71973 5.07812C9.71983 4.87118 9.80197 4.67276 9.94824 4.52637C10.0947 4.37986 10.2938 4.29688 10.501 4.29688L10.709 4.30273ZM10.501 1.33203C11.4422 1.33206 12.3746 1.51676 13.2441 1.87695C14.1136 2.23716 14.9038 2.76516 15.5693 3.43066C16.2348 4.09616 16.7629 4.88637 17.123 5.75586C17.4832 6.6254 17.668 7.55784 17.668 8.49902C17.668 8.70621 17.586 8.90525 17.4395 9.05176C17.293 9.1982 17.0939 9.28027 16.8867 9.28027C16.6798 9.28015 16.4813 9.19807 16.335 9.05176C16.1885 8.90525 16.1055 8.70621 16.1055 8.49902C16.1054 7.01253 15.515 5.58726 14.4639 4.53613C13.4127 3.48501 11.9875 2.89363 10.501 2.89355C10.2938 2.89355 10.0947 2.81155 9.94824 2.66504C9.80196 2.51866 9.71985 2.32022 9.71973 2.11328C9.71973 1.90617 9.80184 1.70704 9.94824 1.56055C10.0947 1.41404 10.2938 1.33203 10.501 1.33203Z" fill="#FA1792" stroke="#FA1792" stroke-width="0.5"/></g><defs><clipPath id="clip0_7783_292"><rect width="19.0861" height="19" fill="white"/></clipPath></defs></svg>
              ${shippingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${shippingAddress.id}" class="custom-address-action-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87868 6.87865C4.44129 6.31604 5.20435 5.99997 6 5.99997H9C9.55229 5.99997 10 6.44768 10 6.99997C10 7.55225 9.55229 7.99997 9 7.99997H6C5.73478 7.99997 5.48043 8.10532 5.29289 8.29286C5.10536 8.4804 5 8.73475 5 8.99997V18C5 18.2652 5.10536 18.5195 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H15C15.2652 19 15.5196 18.8946 15.7071 18.7071C15.8946 18.5195 16 18.2652 16 18V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18C18 18.7956 17.6839 19.5587 17.1213 20.1213C16.5587 20.6839 15.7957 21 15 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V8.99997C3 8.20432 3.31607 7.44126 3.87868 6.87865Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7929 2.79288C17.3783 2.20751 18.1722 1.87866 19 1.87866C19.8278 1.87866 20.6218 2.20751 21.2071 2.79288C21.7925 3.37824 22.1213 4.17216 22.1213 4.99998C22.1213 5.82781 21.7925 6.62173 21.2071 7.20709L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.2929 11.2929L16.7929 2.79288ZM19 3.87866C18.7026 3.87866 18.4174 3.9968 18.2071 4.20709L10 12.4142V14H11.5858L19.7929 5.79288C20.0032 5.58259 20.1213 5.29737 20.1213 4.99998C20.1213 4.70259 20.0032 4.41738 19.7929 4.20709C19.5826 3.9968 19.2974 3.87866 19 3.87866Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.2929C15.6834 3.90237 16.3166 3.90237 16.7071 4.2929L19.7071 7.2929C20.0976 7.68342 20.0976 8.31659 19.7071 8.70711C19.3166 9.09764 18.6834 9.09764 18.2929 8.70711L15.2929 5.70711C14.9024 5.31659 14.9024 4.68342 15.2929 4.2929Z" fill="#FA1792"/></svg>
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
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><g clip-path="url(#clip0_7783_292)"><path d="M4.15918 0.87793C4.56157 0.717731 5.00815 0.707625 5.41699 0.850586C5.82559 0.993548 6.16896 1.27951 6.38379 1.65527L7.83496 4.16895H7.83594C8.0749 4.58393 8.13859 5.07749 8.01465 5.54004C7.89065 6.00228 7.58897 6.39688 7.1748 6.63672H7.17383L7.00195 6.73633C6.88996 6.80109 6.79244 6.88918 6.7168 6.99414C6.64124 7.09914 6.58842 7.21896 6.5625 7.3457C6.53654 7.47265 6.53801 7.60405 6.56641 7.73047C6.59481 7.85675 6.64988 7.97555 6.72754 8.0791L7.18555 8.66504C7.65364 9.24259 8.15201 9.79516 8.67871 10.3203L8.67969 10.3213C9.38009 11.0238 10.1297 11.6754 10.9219 12.2725C11.0254 12.35 11.1443 12.4052 11.2705 12.4336C11.3967 12.4619 11.5275 12.4634 11.6543 12.4375C11.7812 12.4115 11.9017 12.359 12.0068 12.2832C12.1119 12.2075 12.1999 12.1102 12.2646 11.998L12.3633 11.8262C12.6032 11.4117 12.9984 11.1093 13.4609 10.9854C13.9234 10.8615 14.4161 10.9261 14.8311 11.165L17.3428 12.6152C17.7192 12.83 18.0063 13.1739 18.1494 13.583C18.2923 13.9916 18.2819 14.4377 18.1221 14.8398L18.1104 14.8711C17.8775 15.4642 17.6695 15.9861 17.4746 16.4033C17.283 16.8134 17.0907 17.1535 16.8828 17.3613C16.2825 17.9615 15.4512 18.25 14.4736 18.25C13.668 18.25 12.7565 18.0547 11.7715 17.6729C9.73918 16.8853 7.54525 15.3694 5.58789 13.4121C3.63054 11.4548 2.11469 9.26079 1.32715 7.22852C0.489893 5.06778 0.539305 3.21701 1.63867 2.11719C1.84645 1.90939 2.18677 1.71789 2.59668 1.52637C3.01378 1.3315 3.535 1.12248 4.12793 0.889648L4.15918 0.876953V0.87793ZM4.82129 2.31445C4.79036 2.31457 4.75924 2.32069 4.73047 2.33203L4.69922 2.34375C4.3801 2.46903 3.92879 2.64651 3.53027 2.81934C3.33076 2.90586 3.14758 2.9899 3.00293 3.06445C2.84803 3.14429 2.76745 3.1985 2.74414 3.22168C2.47348 3.49234 2.31609 3.92367 2.31348 4.5166C2.31091 5.10842 2.46378 5.83713 2.78418 6.66406C3.48801 8.48063 4.87254 10.4878 6.69238 12.3076C8.51224 14.1274 10.5193 15.5118 12.3359 16.2158C13.1629 16.5363 13.8916 16.6891 14.4834 16.6865C15.0763 16.6839 15.5077 16.5265 15.7783 16.2559C15.8016 16.2325 15.8557 16.1519 15.9355 15.9971C16.0101 15.8524 16.0941 15.6693 16.1807 15.4697C16.3535 15.0712 16.531 14.6199 16.6562 14.3008L16.6689 14.2695V14.2686C16.6905 14.2146 16.692 14.1545 16.6729 14.0996C16.6537 14.0447 16.615 13.9985 16.5645 13.9697L16.5635 13.9688L14.0508 12.5186C13.9947 12.4863 13.9278 12.4774 13.8652 12.4941C13.8182 12.5067 13.7758 12.5324 13.7441 12.5684L13.7168 12.6074L13.6172 12.7793C13.4419 13.0828 13.2042 13.3459 12.9199 13.5508C12.6356 13.7556 12.3111 13.8975 11.9678 13.9678C11.6243 14.038 11.2698 14.0348 10.9277 13.958C10.5857 13.8812 10.2638 13.7328 9.9834 13.5225H9.98242C9.13132 12.8812 8.32667 12.1804 7.57422 11.4258V11.4248C6.81997 10.6726 6.11956 9.86832 5.47852 9.01758L5.47754 9.0166C5.2673 8.7363 5.1188 8.41413 5.04199 8.07227C4.96523 7.73034 4.96201 7.37556 5.03223 7.03223C5.10249 6.68899 5.2444 6.36433 5.44922 6.08008C5.65419 5.79566 5.91807 5.5581 6.22168 5.38281L6.39258 5.2832C6.44846 5.25078 6.49004 5.19813 6.50684 5.13574C6.51938 5.08893 6.51715 5.03942 6.50195 4.99414L6.48242 4.9502L5.03125 2.43652L5.03027 2.43555C5.00924 2.39877 4.97901 2.36797 4.94238 2.34668C4.90568 2.32535 4.86374 2.31448 4.82129 2.31445ZM10.709 4.30273C11.7472 4.35524 12.7321 4.79077 13.4707 5.5293C14.2584 6.31699 14.7019 7.38506 14.7031 8.49902L14.6992 8.57617C14.6815 8.75513 14.6019 8.92349 14.4736 9.05176C14.3272 9.19805 14.1289 9.2802 13.9219 9.28027C13.7147 9.28027 13.5156 9.19825 13.3691 9.05176C13.2228 8.90543 13.1408 8.70693 13.1406 8.5L13.127 8.23828C13.0663 7.6344 12.7991 7.0667 12.3662 6.63379C11.8714 6.13904 11.2007 5.86029 10.501 5.85938C10.2938 5.85938 10.0947 5.77737 9.94824 5.63086C9.80182 5.48437 9.71973 5.28526 9.71973 5.07812C9.71983 4.87118 9.80197 4.67276 9.94824 4.52637C10.0947 4.37986 10.2938 4.29688 10.501 4.29688L10.709 4.30273ZM10.501 1.33203C11.4422 1.33206 12.3746 1.51676 13.2441 1.87695C14.1136 2.23716 14.9038 2.76516 15.5693 3.43066C16.2348 4.09616 16.7629 4.88637 17.123 5.75586C17.4832 6.6254 17.668 7.55784 17.668 8.49902C17.668 8.70621 17.586 8.90525 17.4395 9.05176C17.293 9.1982 17.0939 9.28027 16.8867 9.28027C16.6798 9.28015 16.4813 9.19807 16.335 9.05176C16.1885 8.90525 16.1055 8.70621 16.1055 8.49902C16.1054 7.01253 15.515 5.58726 14.4639 4.53613C13.4127 3.48501 11.9875 2.89363 10.501 2.89355C10.2938 2.89355 10.0947 2.81155 9.94824 2.66504C9.80196 2.51866 9.71985 2.32022 9.71973 2.11328C9.71973 1.90617 9.80184 1.70704 9.94824 1.56055C10.0947 1.41404 10.2938 1.33203 10.501 1.33203Z" fill="#FA1792" stroke="#FA1792" stroke-width="0.5"/></g><defs><clipPath id="clip0_7783_292"><rect width="19.0861" height="19" fill="white"/></clipPath></defs></svg>
              ${billingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${billingAddress.id}" class="custom-address-action-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87868 6.87865C4.44129 6.31604 5.20435 5.99997 6 5.99997H9C9.55229 5.99997 10 6.44768 10 6.99997C10 7.55225 9.55229 7.99997 9 7.99997H6C5.73478 7.99997 5.48043 8.10532 5.29289 8.29286C5.10536 8.4804 5 8.73475 5 8.99997V18C5 18.2652 5.10536 18.5195 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H15C15.2652 19 15.5196 18.8946 15.7071 18.7071C15.8946 18.5195 16 18.2652 16 18V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18C18 18.7956 17.6839 19.5587 17.1213 20.1213C16.5587 20.6839 15.7957 21 15 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V8.99997C3 8.20432 3.31607 7.44126 3.87868 6.87865Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7929 2.79288C17.3783 2.20751 18.1722 1.87866 19 1.87866C19.8278 1.87866 20.6218 2.20751 21.2071 2.79288C21.7925 3.37824 22.1213 4.17216 22.1213 4.99998C22.1213 5.82781 21.7925 6.62173 21.2071 7.20709L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.2929 11.2929L16.7929 2.79288ZM19 3.87866C18.7026 3.87866 18.4174 3.9968 18.2071 4.20709L10 12.4142V14H11.5858L19.7929 5.79288C20.0032 5.58259 20.1213 5.29737 20.1213 4.99998C20.1213 4.70259 20.0032 4.41738 19.7929 4.20709C19.5826 3.9968 19.2974 3.87866 19 3.87866Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.2929C15.6834 3.90237 16.3166 3.90237 16.7071 4.2929L19.7071 7.2929C20.0976 7.68342 20.0976 8.31659 19.7071 8.70711C19.3166 9.09764 18.6834 9.09764 18.2929 8.70711L15.2929 5.70711C14.9024 5.31659 14.9024 4.68342 15.2929 4.2929Z" fill="#FA1792"/></svg>
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
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px; vertical-align: middle;"><g clip-path="url(#clip0_7783_292)"><path d="M4.15918 0.87793C4.56157 0.717731 5.00815 0.707625 5.41699 0.850586C5.82559 0.993548 6.16896 1.27951 6.38379 1.65527L7.83496 4.16895H7.83594C8.0749 4.58393 8.13859 5.07749 8.01465 5.54004C7.89065 6.00228 7.58897 6.39688 7.1748 6.63672H7.17383L7.00195 6.73633C6.88996 6.80109 6.79244 6.88918 6.7168 6.99414C6.64124 7.09914 6.58842 7.21896 6.5625 7.3457C6.53654 7.47265 6.53801 7.60405 6.56641 7.73047C6.59481 7.85675 6.64988 7.97555 6.72754 8.0791L7.18555 8.66504C7.65364 9.24259 8.15201 9.79516 8.67871 10.3203L8.67969 10.3213C9.38009 11.0238 10.1297 11.6754 10.9219 12.2725C11.0254 12.35 11.1443 12.4052 11.2705 12.4336C11.3967 12.4619 11.5275 12.4634 11.6543 12.4375C11.7812 12.4115 11.9017 12.359 12.0068 12.2832C12.1119 12.2075 12.1999 12.1102 12.2646 11.998L12.3633 11.8262C12.6032 11.4117 12.9984 11.1093 13.4609 10.9854C13.9234 10.8615 14.4161 10.9261 14.8311 11.165L17.3428 12.6152C17.7192 12.83 18.0063 13.1739 18.1494 13.583C18.2923 13.9916 18.2819 14.4377 18.1221 14.8398L18.1104 14.8711C17.8775 15.4642 17.6695 15.9861 17.4746 16.4033C17.283 16.8134 17.0907 17.1535 16.8828 17.3613C16.2825 17.9615 15.4512 18.25 14.4736 18.25C13.668 18.25 12.7565 18.0547 11.7715 17.6729C9.73918 16.8853 7.54525 15.3694 5.58789 13.4121C3.63054 11.4548 2.11469 9.26079 1.32715 7.22852C0.489893 5.06778 0.539305 3.21701 1.63867 2.11719C1.84645 1.90939 2.18677 1.71789 2.59668 1.52637C3.01378 1.3315 3.535 1.12248 4.12793 0.889648L4.15918 0.876953V0.87793ZM4.82129 2.31445C4.79036 2.31457 4.75924 2.32069 4.73047 2.33203L4.69922 2.34375C4.3801 2.46903 3.92879 2.64651 3.53027 2.81934C3.33076 2.90586 3.14758 2.9899 3.00293 3.06445C2.84803 3.14429 2.76745 3.1985 2.74414 3.22168C2.47348 3.49234 2.31609 3.92367 2.31348 4.5166C2.31091 5.10842 2.46378 5.83713 2.78418 6.66406C3.48801 8.48063 4.87254 10.4878 6.69238 12.3076C8.51224 14.1274 10.5193 15.5118 12.3359 16.2158C13.1629 16.5363 13.8916 16.6891 14.4834 16.6865C15.0763 16.6839 15.5077 16.5265 15.7783 16.2559C15.8016 16.2325 15.8557 16.1519 15.9355 15.9971C16.0101 15.8524 16.0941 15.6693 16.1807 15.4697C16.3535 15.0712 16.531 14.6199 16.6562 14.3008L16.6689 14.2695V14.2686C16.6905 14.2146 16.692 14.1545 16.6729 14.0996C16.6537 14.0447 16.615 13.9985 16.5645 13.9697L16.5635 13.9688L14.0508 12.5186C13.9947 12.4863 13.9278 12.4774 13.8652 12.4941C13.8182 12.5067 13.7758 12.5324 13.7441 12.5684L13.7168 12.6074L13.6172 12.7793C13.4419 13.0828 13.2042 13.3459 12.9199 13.5508C12.6356 13.7556 12.3111 13.8975 11.9678 13.9678C11.6243 14.038 11.2698 14.0348 10.9277 13.958C10.5857 13.8812 10.2638 13.7328 9.9834 13.5225H9.98242C9.13132 12.8812 8.32667 12.1804 7.57422 11.4258V11.4248C6.81997 10.6726 6.11956 9.86832 5.47852 9.01758L5.47754 9.0166C5.2673 8.7363 5.1188 8.41413 5.04199 8.07227C4.96523 7.73034 4.96201 7.37556 5.03223 7.03223C5.10249 6.68899 5.2444 6.36433 5.44922 6.08008C5.65419 5.79566 5.91807 5.5581 6.22168 5.38281L6.39258 5.2832C6.44846 5.25078 6.49004 5.19813 6.50684 5.13574C6.51938 5.08893 6.51715 5.03942 6.50195 4.99414L6.48242 4.9502L5.03125 2.43652L5.03027 2.43555C5.00924 2.39877 4.97901 2.36797 4.94238 2.34668C4.90568 2.32535 4.86374 2.31448 4.82129 2.31445ZM10.709 4.30273C11.7472 4.35524 12.7321 4.79077 13.4707 5.5293C14.2584 6.31699 14.7019 7.38506 14.7031 8.49902L14.6992 8.57617C14.6815 8.75513 14.6019 8.92349 14.4736 9.05176C14.3272 9.19805 14.1289 9.2802 13.9219 9.28027C13.7147 9.28027 13.5156 9.19825 13.3691 9.05176C13.2228 8.90543 13.1408 8.70693 13.1406 8.5L13.127 8.23828C13.0663 7.6344 12.7991 7.0667 12.3662 6.63379C11.8714 6.13904 11.2007 5.86029 10.501 5.85938C10.2938 5.85938 10.0947 5.77737 9.94824 5.63086C9.80182 5.48437 9.71973 5.28526 9.71973 5.07812C9.71983 4.87118 9.80197 4.67276 9.94824 4.52637C10.0947 4.37986 10.2938 4.29688 10.501 4.29688L10.709 4.30273ZM10.501 1.33203C11.4422 1.33206 12.3746 1.51676 13.2441 1.87695C14.1136 2.23716 14.9038 2.76516 15.5693 3.43066C16.2348 4.09616 16.7629 4.88637 17.123 5.75586C17.4832 6.6254 17.668 7.55784 17.668 8.49902C17.668 8.70621 17.586 8.90525 17.4395 9.05176C17.293 9.1982 17.0939 9.28027 16.8867 9.28027C16.6798 9.28015 16.4813 9.19807 16.335 9.05176C16.1885 8.90525 16.1055 8.70621 16.1055 8.49902C16.1054 7.01253 15.515 5.58726 14.4639 4.53613C13.4127 3.48501 11.9875 2.89363 10.501 2.89355C10.2938 2.89355 10.0947 2.81155 9.94824 2.66504C9.80196 2.51866 9.71985 2.32022 9.71973 2.11328C9.71973 1.90617 9.80184 1.70704 9.94824 1.56055C10.0947 1.41404 10.2938 1.33203 10.501 1.33203Z" fill="#FA1792" stroke="#FA1792" stroke-width="0.5"/></g><defs><clipPath id="clip0_7783_292"><rect width="19.0861" height="19" fill="white"/></clipPath></defs></svg>
              ${shippingAddress.telephone}
            </p>
            <div class="custom-address-card-actions">
              <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${shippingAddress.id}" class="custom-address-action-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87868 6.87865C4.44129 6.31604 5.20435 5.99997 6 5.99997H9C9.55229 5.99997 10 6.44768 10 6.99997C10 7.55225 9.55229 7.99997 9 7.99997H6C5.73478 7.99997 5.48043 8.10532 5.29289 8.29286C5.10536 8.4804 5 8.73475 5 8.99997V18C5 18.2652 5.10536 18.5195 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H15C15.2652 19 15.5196 18.8946 15.7071 18.7071C15.8946 18.5195 16 18.2652 16 18V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18C18 18.7956 17.6839 19.5587 17.1213 20.1213C16.5587 20.6839 15.7957 21 15 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V8.99997C3 8.20432 3.31607 7.44126 3.87868 6.87865Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7929 2.79288C17.3783 2.20751 18.1722 1.87866 19 1.87866C19.8278 1.87866 20.6218 2.20751 21.2071 2.79288C21.7925 3.37824 22.1213 4.17216 22.1213 4.99998C22.1213 5.82781 21.7925 6.62173 21.2071 7.20709L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.2929 11.2929L16.7929 2.79288ZM19 3.87866C18.7026 3.87866 18.4174 3.9968 18.2071 4.20709L10 12.4142V14H11.5858L19.7929 5.79288C20.0032 5.58259 20.1213 5.29737 20.1213 4.99998C20.1213 4.70259 20.0032 4.41738 19.7929 4.20709C19.5826 3.9968 19.2974 3.87866 19 3.87866Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.2929C15.6834 3.90237 16.3166 3.90237 16.7071 4.2929L19.7071 7.2929C20.0976 7.68342 20.0976 8.31659 19.7071 8.70711C19.3166 9.09764 18.6834 9.09764 18.2929 8.70711L15.2929 5.70711C14.9024 5.31659 14.9024 4.68342 15.2929 4.2929Z" fill="#FA1792"/></svg>
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
        additionalWrapper.classList.add('custom-additional-addresses-table-wrapper');

        let tableRowsHtml = '';
        additionalAddresses.forEach((addr) => {
          tableRowsHtml += `
            <tr>
              <td>${addr.firstname || ''}</td>
              <td>${addr.lastname || ''}</td>
              <td>${(addr.street || []).join('<br>')}</td>
              <td>${addr.city || ''}</td>
              <td>${getCountryName(addr.country_code) || ''}</td>
              <td>${addr.region?.region || addr.region?.region_code || ''}</td>
              <td>${addr.postcode || ''}</td>
              <td>${addr.telephone || ''}</td>
              <td class="actions-cell">
                <a href="${rootLink(`${CUSTOMER_ADDRESS_PATH}/edit`)}?id=${addr.id}" class="action edit">Edit</a>
                <span class="action-separator">|</span>
                <button type="button" class="action delete delete-btn" data-id="${addr.id}">Delete</button>
              </td>
            </tr>
          `;
        });

        additionalWrapper.innerHTML = `
          <table class="custom-additional-addresses-table">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Street Address</th>
                <th>City</th>
                <th>Country</th>
                <th>State</th>
                <th>Zip/Postal Code</th>
                <th>Phone</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        `;
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
