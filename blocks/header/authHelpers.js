import { CUSTOMER_CREATE_PATH, rootLink } from '../../scripts/commerce.js';

export function moveSignUpLinkBelowSubmit(element) {
  const updateSignUpLink = () => {
    const buttonsWrapper = element.querySelector('.auth-sign-in-form__form__buttons__wrapper');
    const buttons = element.querySelector('.auth-sign-in-form__form__buttons');
    const signUpButton = element.querySelector('.auth-sign-in-form__button--signup');
    const prompt = buttonsWrapper?.querySelector('.auth-sign-in-form__signup-prompt');
    const signUpLink = prompt?.querySelector('.auth-sign-in-form__signup-link');

    if (!buttonsWrapper || !buttons || !signUpButton) return false;

    const separator = signUpButton.previousElementSibling;
    if (separator?.tagName === 'SPAN' && !separator.textContent.trim()) {
      separator.remove();
    }

    signUpButton.classList.add('auth-sign-in-form__button--signup-hidden');

    if (signUpLink) {
      signUpLink.href = rootLink(CUSTOMER_CREATE_PATH);
      return true;
    }

    const newPrompt = document.createElement('p');
    newPrompt.classList.add('auth-sign-in-form__signup-prompt');

    const newSignUpLink = document.createElement('a');
    newSignUpLink.classList.add('auth-sign-in-form__signup-link');
    newSignUpLink.href = rootLink(CUSTOMER_CREATE_PATH);
    newSignUpLink.textContent = 'Sign up';

    newPrompt.append('Don\'t have an account? ', newSignUpLink);
    buttons.after(newPrompt);
    return true;
  };

  updateSignUpLink();
  requestAnimationFrame(updateSignUpLink);
}
