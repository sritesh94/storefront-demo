import CustomerInformation from '@dropins/storefront-account/containers/CustomerInformation.js';
import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import {
  updateCustomer,
  updateCustomerEmail,
  updateCustomerPassword,
} from '@dropins/storefront-account/api.js';
import {
  CUSTOMER_LOGIN_PATH,
  checkIsAuthenticated,
  rootLink,
  CORE_FETCH_GRAPHQL,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/account.js';

export default async function decorate(block) {
  if (!checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
    return;
  }

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

  const isEditPage = window.location.pathname.includes('/customer/account/edit');
  if (isEditPage) {
    block.classList.add('commerce-account-edit-page');
    await accountRenderer.render(CustomerInformation, {})(dropinContainer);

    // Poll to automatically open the Edit Form
    const openFormInterval = setInterval(() => {
      const editButton = block.querySelector('.account-customer-information-card__actions button:nth-child(2)');
      if (editButton) {
        clearInterval(openFormInterval);
        editButton.click();

        // Wait for the form to render and inject our custom features
        setupEditFormInjections(block);
      }
    }, 50);
  } else {
    // Hide the dropin container visually but render it to extract data
    dropinContainer.style.display = 'none';
    await accountRenderer.render(CustomerInformation, {})(dropinContainer);

    // Fetch newsletter subscription status
    let isSubscribed = false;
    try {
      const result = await CORE_FETCH_GRAPHQL.fetchGraphQl(`
        query GetCustomerSubscription {
          customer {
            is_subscribed
          }
        }
      `);
      isSubscribed = result?.data?.customer?.is_subscribed ?? false;
    } catch (err) {
      console.error('Failed to fetch newsletter subscription status:', err);
    }

    // Poll until the data is loaded inside the dropin container
    const pollInterval = setInterval(() => {
      const nameEl1 = dropinContainer.querySelector('[data-testid="firstName_0"]');
      const nameEl2 = dropinContainer.querySelector('[data-testid="lastName_1"]');
      const emailEl = dropinContainer.querySelector('[data-testid="email_2"]');

      if (nameEl1 && nameEl2 && emailEl) {
        clearInterval(pollInterval);

        const firstName = nameEl1.textContent.trim();
        const lastName = nameEl2.textContent.trim();
        const email = emailEl.textContent.trim();

        // Render the custom columns
        renderCustomDashboard(block, firstName, lastName, email, isSubscribed);
      }
    }, 50);
  }
}

function renderCustomDashboard(block, firstName, lastName, email, isSubscribed) {
  const prevContainer = block.querySelector('.custom-dashboard-columns');
  if (prevContainer) {
    prevContainer.remove();
  }

  const columnsContainer = document.createElement('div');
  columnsContainer.className = 'custom-dashboard-columns';

  const editIconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="#FA1792" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';

  const newsletterText = isSubscribed
    ? 'You are subscribed to our newsletter.'
    : "You aren't subscribed to our newsletter.";

  columnsContainer.innerHTML = `
    <!-- Column 1: Contact Information -->
    <div class="custom-dashboard-column">
      <h3 class="custom-dashboard-column-title">Contact Information</h3>
      <div class="custom-dashboard-column-content">
        <p class="custom-dashboard-name">${firstName} ${lastName}</p>
        <p class="custom-dashboard-email">${email}</p>
      </div>
      <div class="custom-dashboard-column-actions">
        <a href="${rootLink('/customer/account/edit?edit=account')}" class="custom-dashboard-action-btn">
          ${editIconSvg}Edit
        </a>
        <a href="${rootLink('/customer/account/edit?edit=password')}" class="custom-dashboard-action-btn">
          ${editIconSvg}Change Password
        </a>
      </div>
    </div>

    <!-- Column 2: Newsletter -->
    <div class="custom-dashboard-column">
      <h3 class="custom-dashboard-column-title">Newsletter</h3>
      <div class="custom-dashboard-column-content">
        <p class="custom-dashboard-status-text">${newsletterText}</p>
      </div>
      <div class="custom-dashboard-column-actions">
        <a href="${rootLink('/customer/newsletter')}" class="custom-dashboard-action-btn">
          ${editIconSvg}Edit
        </a>
      </div>
    </div>
  `;

  block.appendChild(columnsContainer);
}

function setupEditFormInjections(block) {
  const injectInterval = setInterval(() => {
    const form = block.querySelector('.account-edit-customer-information-form');
    if (form) {
      clearInterval(injectInterval);

      // Prevent duplicate injection
      if (form.querySelector('.custom-edit-checkboxes')) return;

      const lastNameField = form.querySelector('.account-edit-customer-information-form__field--lastname');
      if (!lastNameField) return;

      // 1. Create checkboxes container
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'custom-edit-checkboxes';
      checkboxContainer.innerHTML = `
        <div class="custom-checkbox-row">
          <input type="checkbox" id="change-email-checkbox" name="change_email">
          <label for="change-email-checkbox">Change Email</label>
        </div>
        <div class="custom-checkbox-row">
          <input type="checkbox" id="change-password-checkbox" name="change_password">
          <label for="change-password-checkbox">Change Password</label>
        </div>
      `;

      // 2. Create password fields container
      const passwordContainer = document.createElement('div');
      passwordContainer.className = 'custom-password-fields';
      passwordContainer.innerHTML = `
        <div class="dropin-field custom-password-field" data-field="current">
          <div class="dropin-field__content">
            <div class="dropin-input-container dropin-input-container--primary">
              <div class="dropin-input-label-container">
                <input id="current-password" type="password" name="currentPassword" placeholder="Current Password" class="dropin-input">
                <label for="current-password" class="dropin-input__label">Current Password *</label>
              </div>
            </div>
          </div>
          <div class="dropin-field__hint custom-hint-current-password"></div>
        </div>

        <div class="dropin-field custom-password-field" data-field="new">
          <div class="dropin-field__content">
            <div class="dropin-input-container dropin-input-container--primary">
              <div class="dropin-input-label-container">
                <input id="new-password" type="password" name="newPassword" placeholder="New Password" class="dropin-input">
                <label for="new-password" class="dropin-input__label">New Password *</label>
              </div>
            </div>
          </div>
          <div class="dropin-field__hint custom-hint-new-password"></div>
        </div>

        <div class="dropin-field custom-password-field" data-field="confirm">
          <div class="dropin-field__content">
            <div class="dropin-input-container dropin-input-container--primary">
              <div class="dropin-input-label-container">
                <input id="confirm-password" type="password" name="confirmPassword" placeholder="Confirm New Password" class="dropin-input">
                <label for="confirm-password" class="dropin-input__label">Confirm New Password *</label>
              </div>
            </div>
          </div>
          <div class="dropin-field__hint custom-hint-confirm-password"></div>
        </div>
      `;

      // Insert checkbox container and password container after Last Name field
      lastNameField.after(passwordContainer);
      lastNameField.after(checkboxContainer);

      // Add change listeners to checkboxes to toggle CSS classes for conditional visibility
      const changeEmailCheckbox = checkboxContainer.querySelector('#change-email-checkbox');
      const changePasswordCheckbox = checkboxContainer.querySelector('#change-password-checkbox');

      changeEmailCheckbox.addEventListener('change', () => {
        form.classList.toggle('show-email-section', changeEmailCheckbox.checked);
      });

      changePasswordCheckbox.addEventListener('change', () => {
        form.classList.toggle('show-password-section', changePasswordCheckbox.checked);
      });

      // Handle query parameters to pre-check "Change Password"
      const urlParams = new URLSearchParams(window.location.search);
      const editMode = urlParams.get('edit');
      if (editMode === 'password') {
        changePasswordCheckbox.checked = true;
        form.classList.add('show-password-section');
      }

      // Handle form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset all hint errors
        form.querySelectorAll('.dropin-field__hint').forEach((hint) => {
          hint.textContent = '';
        });

        const showEmail = changeEmailCheckbox.checked;
        const showPassword = changePasswordCheckbox.checked;

        const firstName = form.querySelector('#firstname').value.trim();
        const lastName = form.querySelector('#lastname').value.trim();
        const email = form.querySelector('#email').value.trim();
        const currentPassword = form.querySelector('#current-password').value;
        const newPassword = form.querySelector('#new-password').value;
        const confirmPassword = form.querySelector('#confirm-password').value;

        let hasError = false;

        // Validations
        if (!firstName) {
          form.querySelector('.account-edit-customer-information-form__field--firstname .dropin-field__hint').textContent = 'This is a required field.';
          hasError = true;
        }
        if (!lastName) {
          form.querySelector('.account-edit-customer-information-form__field--lastname .dropin-field__hint').textContent = 'This is a required field.';
          hasError = true;
        }

        if (showEmail) {
          if (!email) {
            form.querySelector('.account-edit-customer-information-form__field--email .dropin-field__hint').textContent = 'This is a required field.';
            hasError = true;
          }
          if (!currentPassword) {
            form.querySelector('.custom-hint-current-password').textContent = 'This is a required field.';
            hasError = true;
          }
        }

        if (showPassword) {
          if (!currentPassword) {
            form.querySelector('.custom-hint-current-password').textContent = 'This is a required field.';
            hasError = true;
          }
          if (!newPassword) {
            form.querySelector('.custom-hint-new-password').textContent = 'This is a required field.';
            hasError = true;
          }
          if (!confirmPassword) {
            form.querySelector('.custom-hint-confirm-password').textContent = 'This is a required field.';
            hasError = true;
          } else if (newPassword !== confirmPassword) {
            form.querySelector('.custom-hint-confirm-password').textContent = 'Passwords do not match.';
            hasError = true;
          }
        }

        if (hasError) return;

        // Submit changes
        const saveButton = form.querySelector('button[type="submit"]');
        const originalBtnText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span>Saving...</span>';

        try {
          // 1. Password change
          if (showPassword) {
            await updateCustomerPassword({ currentPassword, newPassword });
          }

          // 2. Email change
          if (showEmail) {
            await updateCustomerEmail({ email, password: currentPassword });
          }

          // 3. Name change
          await updateCustomer({ firstName, lastName });

          // Redirect to account dashboard on success
          window.location.href = rootLink('/customer/account');
        } catch (err) {
          console.error(err);
          // Show error message (typically incorrect password)
          const errorMsg = err.message || 'An error occurred while saving.';
          if (errorMsg.toLowerCase().includes('password')) {
            form.querySelector('.custom-hint-current-password').textContent = errorMsg;
          } else {
            // Render general error in current password hint or create a general alert
            form.querySelector('.custom-hint-current-password').textContent = errorMsg;
          }
          saveButton.disabled = false;
          saveButton.innerHTML = originalBtnText;
        }
      });
    }
  }, 50);
}
