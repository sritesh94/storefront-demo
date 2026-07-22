/**
 * Initializes the mobile footer accordion for viewports less than 990px.
 * @param {Element} block The footer block element
 */
export default function initFooterAccordion(block) {
  const mediaQuery = window.matchMedia('(max-width: 899px)');
  const headers = block.querySelectorAll('.footer-main-section .columns-5-cols > div > div > h2');

  function toggleAccordion(header, forceCollapse = false) {
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    const content = header.nextElementSibling;

    if (!content) return;

    if (isExpanded || forceCollapse) {
      // Collapse
      header.setAttribute('aria-expanded', 'false');
      header.classList.remove('is-active');
      content.classList.remove('is-open');
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
    } else {
      // Collapse all other open accordion headers
      headers.forEach((otherHeader) => {
        if (otherHeader !== header) {
          toggleAccordion(otherHeader, true);
        }
      });

      // Expand this one
      header.setAttribute('aria-expanded', 'true');
      header.classList.add('is-active');
      content.classList.add('is-open');
      content.style.maxHeight = `${content.scrollHeight}px`;
      content.style.opacity = '1';
    }
  }

  function handleKeydown(e, header) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAccordion(header);
    }
  }

  const clickListeners = new Map();
  const keydownListeners = new Map();

  function setupAccordion() {
    headers.forEach((header, index) => {
      const content = header.nextElementSibling;
      if (!content) return;

      // Accessibility attributes setup
      const headerId = header.id || `footer-accordion-header-${index}`;
      const contentId = content.id || `footer-accordion-content-${index}`;

      header.id = headerId;
      content.id = contentId;

      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'false');
      header.setAttribute('aria-controls', contentId);

      content.setAttribute('role', 'region');
      content.setAttribute('aria-labelledby', headerId);

      // Set initial styles for collapsed panels on mobile
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
      content.classList.remove('is-open');
      header.classList.remove('is-active');

      // Click handler
      const clickHandler = () => toggleAccordion(header);
      header.addEventListener('click', clickHandler);
      clickListeners.set(header, clickHandler);

      // Keydown handler (for accessibility)
      const keydownHandler = (e) => handleKeydown(e, header);
      header.addEventListener('keydown', keydownHandler);
      keydownListeners.set(header, keydownHandler);
    });
  }

  function destroyAccordion() {
    headers.forEach((header) => {
      const content = header.nextElementSibling;

      // Remove event listeners
      if (clickListeners.has(header)) {
        header.removeEventListener('click', clickListeners.get(header));
        clickListeners.delete(header);
      }
      if (keydownListeners.has(header)) {
        header.removeEventListener('keydown', keydownListeners.get(header));
        keydownListeners.delete(header);
      }

      // Restore desktop elements attributes
      header.removeAttribute('role');
      header.removeAttribute('tabindex');
      header.removeAttribute('aria-expanded');
      header.removeAttribute('aria-controls');
      header.classList.remove('is-active');

      if (content) {
        content.removeAttribute('role');
        content.removeAttribute('aria-labelledby');
        content.style.maxHeight = '';
        content.style.opacity = '';
        content.classList.remove('is-open');
      }
    });
  }

  function handleViewportChange(e) {
    if (e.matches) {
      setupAccordion();
    } else {
      destroyAccordion();
    }
  }

  // Set up initially based on viewport size
  if (mediaQuery.matches) {
    setupAccordion();
  } else {
    destroyAccordion();
  }

  // Monitor viewport changes
  mediaQuery.addEventListener('change', handleViewportChange);
}
