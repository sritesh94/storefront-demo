import {
  CUSTOMER_LOGIN_PATH,
  checkIsAuthenticated,
  rootLink,
  CORE_FETCH_GRAPHQL,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

/**
 * Fetches the customer's current newsletter subscription status.
 * @returns {Promise<boolean>} - True if subscribed, false otherwise
 */
async function getSubscriptionStatus() {
  try {
    const result = await CORE_FETCH_GRAPHQL.fetchGraphQl(`
      query GetCustomerSubscription {
        customer {
          is_subscribed
        }
      }
    `);
    return result?.data?.customer?.is_subscribed ?? false;
  } catch (err) {
    console.error('Failed to fetch newsletter subscription status:', err);
    return false;
  }
}

/**
 * Updates the customer's newsletter subscription status.
 * @param {boolean} isSubscribed - Whether to subscribe or unsubscribe
 * @returns {Promise<boolean|null>} - The confirmed server value, or null on failure
 */
async function updateSubscriptionStatus(isSubscribed) {
  try {
    const result = await CORE_FETCH_GRAPHQL.fetchGraphQl(`
      mutation UpdateCustomerSubscription($isSubscribed: Boolean!) {
        updateCustomer(input: { is_subscribed: $isSubscribed }) {
          customer {
            is_subscribed
          }
        }
      }
    `, { variables: { isSubscribed } });
    return result?.data?.updateCustomer?.customer?.is_subscribed ?? null;
  } catch (err) {
    console.error('Failed to update newsletter subscription:', err);
    return null;
  }
}

/**
 * Loads and decorates the Newsletter Subscriptions block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
  } else {
    block.innerHTML = '';

    // Section header — matches the pattern used in commerce-orders-list
    const headerContainer = document.createElement('div');
    headerContainer.classList.add('commerce-account-section-header-container');

    const headingEl = document.createElement('h2');
    headingEl.classList.add('commerce-account-section-heading');
    headingEl.innerText = 'Newsletter Subscription';
    headerContainer.appendChild(headingEl);

    block.appendChild(headerContainer);

    // Content container — mirrors the dropin container pattern
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('commerce-newsletter-content');
    block.appendChild(contentContainer);

    // Status message area (hidden initially, aria-live for screen readers)
    const statusEl = document.createElement('p');
    statusEl.classList.add('commerce-newsletter-status');
    statusEl.setAttribute('hidden', '');
    statusEl.setAttribute('aria-live', 'polite');
    contentContainer.appendChild(statusEl);

    // Fetch the current subscription status
    const isCurrentlySubscribed = await getSubscriptionStatus();

    // Build the subscription form
    const form = document.createElement('form');
    form.classList.add('commerce-newsletter-form');
    form.noValidate = true;

    // Checkbox field row
    const fieldRow = document.createElement('div');
    fieldRow.classList.add('commerce-newsletter-field');

    const checkboxId = 'commerce-newsletter-general-subscription';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.name = 'is_subscribed';
    checkbox.classList.add('commerce-newsletter-checkbox');
    checkbox.checked = isCurrentlySubscribed;

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    label.classList.add('commerce-newsletter-label');
    label.innerText = 'General Subscription';

    fieldRow.appendChild(checkbox);
    fieldRow.appendChild(label);
    form.appendChild(fieldRow);

    // Save button — black, uppercase, matches Figma
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.id = 'commerce-newsletter-save';
    saveBtn.classList.add('commerce-newsletter-save-btn');
    saveBtn.innerText = 'SAVE';
    form.appendChild(saveBtn);

    contentContainer.appendChild(form);

    // Form submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newValue = checkbox.checked;
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving…';

      const updatedValue = await updateSubscriptionStatus(newValue);

      saveBtn.disabled = false;
      saveBtn.innerText = 'SAVE';

      if (updatedValue === null) {
        statusEl.innerText = 'Something went wrong. Please try again.';
        statusEl.className = 'commerce-newsletter-status commerce-newsletter-status--error';
        statusEl.removeAttribute('hidden');
      } else {
        checkbox.checked = updatedValue;
        statusEl.innerText = updatedValue
          ? 'You have been successfully subscribed to our newsletter.'
          : 'You have been successfully unsubscribed from our newsletter.';
        statusEl.className = 'commerce-newsletter-status commerce-newsletter-status--success';
        statusEl.removeAttribute('hidden');

        setTimeout(() => {
          statusEl.setAttribute('hidden', '');
          statusEl.innerText = '';
        }, 4000);
      }
    });
  }
}
