import { SignIn } from '@dropins/storefront-auth/containers/SignIn.js';
import { render as authRenderer } from '@dropins/storefront-auth/render.js';
import {
  CUSTOMER_ACCOUNT_PATH,
  CUSTOMER_CREATE_PATH,
  CUSTOMER_FORGOTPASSWORD_PATH,
  checkIsAuthenticated,
  rootLink,
} from '../../scripts/commerce.js';

// Initialize
import '../../scripts/initializers/auth.js';

export default async function decorate(block) {
  if (checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_ACCOUNT_PATH);
  } else {
    await authRenderer.render(SignIn, {
      routeForgotPassword: () => rootLink(CUSTOMER_FORGOTPASSWORD_PATH),
      routeRedirectOnSignIn: () => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
          return redirect;
        }
        return rootLink(CUSTOMER_ACCOUNT_PATH);
      },
    })(block);

    if (!block.querySelector('.commerce-login__footer')) {
      const footer = document.createElement('div');
      footer.className = 'commerce-login__footer';
      footer.innerHTML = `
        <div class="commerce-login__divider" aria-hidden="true"><span class="commerce-login__divider__text">OR</span></div>
        <p class="commerce-login__description">Creating an account has many benefits: check out faster, keep more than one address, track orders and more.</p>
        <a class="commerce-login__create-account-link" href="${rootLink(CUSTOMER_CREATE_PATH)}">
          Create account
        </a>
      `;
      block.appendChild(footer);
    }
  }
}
