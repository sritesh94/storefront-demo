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

  const editIconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87868 6.87865C4.44129 6.31604 5.20435 5.99997 6 5.99997H9C9.55229 5.99997 10 6.44768 10 6.99997C10 7.55225 9.55229 7.99997 9 7.99997H6C5.73478 7.99997 5.48043 8.10532 5.29289 8.29286C5.10536 8.4804 5 8.73475 5 8.99997V18C5 18.2652 5.10536 18.5195 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H15C15.2652 19 15.5196 18.8946 15.7071 18.7071C15.8946 18.5195 16 18.2652 16 18V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V18C18 18.7956 17.6839 19.5587 17.1213 20.1213C16.5587 20.6839 15.7957 21 15 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V8.99997C3 8.20432 3.31607 7.44126 3.87868 6.87865Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7929 2.79288C17.3783 2.20751 18.1722 1.87866 19 1.87866C19.8278 1.87866 20.6218 2.20751 21.2071 2.79288C21.7925 3.37824 22.1213 4.17216 22.1213 4.99998C22.1213 5.82781 21.7925 6.62173 21.2071 7.20709L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.2929 11.2929L16.7929 2.79288ZM19 3.87866C18.7026 3.87866 18.4174 3.9968 18.2071 4.20709L10 12.4142V14H11.5858L19.7929 5.79288C20.0032 5.58259 20.1213 5.29737 20.1213 4.99998C20.1213 4.70259 20.0032 4.41738 19.7929 4.20709C19.5826 3.9968 19.2974 3.87866 19 3.87866Z" fill="#FA1792"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 4.2929C15.6834 3.90237 16.3166 3.90237 16.7071 4.2929L19.7071 7.2929C20.0976 7.68342 20.0976 8.31659 19.7071 8.70711C19.3166 9.09764 18.6834 9.09764 18.2929 8.70711L15.2929 5.70711C14.9024 5.31659 14.9024 4.68342 15.2929 4.2929Z" fill="#FA1792"/></svg>';

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

      // 3. Create two-column structure
      const twoCol = document.createElement('div');
      twoCol.className = 'account-edit-two-col';

      const leftCol = document.createElement('div');
      leftCol.className = 'account-edit-col account-edit-col--left';

      const rightCol = document.createElement('div');
      rightCol.className = 'account-edit-col account-edit-col--right';

      // Right Column Section with single heading "Change Email and Password"
      const rightSection = document.createElement('div');
      rightSection.className = 'account-edit-right-section';
      const sectionHeading = document.createElement('h3');
      sectionHeading.className = 'account-edit-section-heading';
      sectionHeading.textContent = 'Change Email and Password';
      rightSection.appendChild(sectionHeading);

      // Move existing fields
      const firstNameField = form.querySelector('.account-edit-customer-information-form__field--firstname');
      const emailField = form.querySelector('.account-edit-customer-information-form__field--email');
      const actionsEl = form.querySelector('.account-edit-customer-information__actions');

      // Left Column elements
      if (firstNameField) leftCol.appendChild(firstNameField);
      leftCol.appendChild(lastNameField);
      leftCol.appendChild(checkboxContainer);

      // Right Column elements in order: Email, Current Password, New Password, Confirm Password
      const currentPasswordEl = passwordContainer.querySelector('[data-field="current"]');
      const newPasswordEl = passwordContainer.querySelector('[data-field="new"]');
      const confirmPasswordEl = passwordContainer.querySelector('[data-field="confirm"]');

      if (emailField) rightSection.appendChild(emailField);
      if (currentPasswordEl) rightSection.appendChild(currentPasswordEl);
      if (newPasswordEl) rightSection.appendChild(newPasswordEl);
      if (confirmPasswordEl) rightSection.appendChild(confirmPasswordEl);

      rightCol.appendChild(rightSection);

      twoCol.appendChild(leftCol);
      twoCol.appendChild(rightCol);

      form.appendChild(twoCol);
      if (actionsEl) form.appendChild(actionsEl);

      // Add change listeners to checkboxes to toggle CSS classes
      const changeEmailCheckbox = checkboxContainer.querySelector('#change-email-checkbox');
      const changePasswordCheckbox = checkboxContainer.querySelector('#change-password-checkbox');

      const updateConditionalSections = () => {
        const showEmail = changeEmailCheckbox.checked;
        const showPassword = changePasswordCheckbox.checked;
        const showRight = showEmail || showPassword;

        if (showEmail && showPassword) {
          sectionHeading.textContent = 'Change Email and Password';
        } else if (showEmail) {
          sectionHeading.textContent = 'Change Email';
        } else if (showPassword) {
          sectionHeading.textContent = 'Change Password';
        }

        form.classList.toggle('show-email-section', showEmail);
        form.classList.toggle('show-password-section', showPassword);
        form.classList.toggle('show-right-section', showRight);
      };

      changeEmailCheckbox.addEventListener('change', updateConditionalSections);
      changePasswordCheckbox.addEventListener('change', updateConditionalSections);

      // Handle query parameters to pre-check "Change Password" or "Change Email"
      const urlParams = new URLSearchParams(window.location.search);
      const editMode = urlParams.get('edit');
      if (editMode === 'password') {
        changePasswordCheckbox.checked = true;
      } else if (editMode === 'email') {
        changeEmailCheckbox.checked = true;
      }
      updateConditionalSections();

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
        const currentPassword = form.querySelector('#current-password')?.value || '';
        const newPassword = form.querySelector('#new-password')?.value || '';
        const confirmPassword = form.querySelector('#confirm-password')?.value || '';

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
          form.querySelector('.custom-hint-current-password').textContent = errorMsg;
          saveButton.disabled = false;
          saveButton.innerHTML = originalBtnText;
        }
      });
    }
  }, 50);
}
