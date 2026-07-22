import { events } from '@dropins/tools/event-bus.js';
import {
  CUSTOMER_ORDER_DETAILS_PATH,
  CUSTOMER_ORDERS_PATH,
  fetchPlaceholders,
  rootLink,
} from '../../scripts/commerce.js';

export default async function decorate(block) {
  block.innerHTML = '';

  const backLinkContainer = document.createElement('div');
  backLinkContainer.classList.add('orders-back-link-container');
  block.appendChild(backLinkContainer);

  if (window.location.href.includes(CUSTOMER_ORDER_DETAILS_PATH)) {
    const placeholders = await fetchPlaceholders();
    const link = document.createElement('a');
    link.innerText = placeholders?.Global?.CommerceOrderHeader?.backToAllOrders || 'Back to all orders';
    link.href = rootLink(CUSTOMER_ORDERS_PATH);
    link.classList.add('orders-list-link');
    backLinkContainer.appendChild(link);
  }

  const customHeader = document.createElement('div');
  customHeader.classList.add('order-header-magento');
  block.appendChild(customHeader);

  events.on('order/data', (orderData) => {
    // Format Date
    const dateObj = new Date(orderData.orderDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Customer Name
    const firstName = orderData.shippingAddress?.firstName || orderData.billingAddress?.firstName || '';
    const lastName = orderData.shippingAddress?.lastName || orderData.billingAddress?.lastName || '';
    const customerName = `${firstName} ${lastName}`.trim();

    customHeader.innerHTML = `
      <div class="order-header-title-row">
        <div class="order-header-title-group">
          <h1>Order # ${orderData.number}</h1>
          <span class="order-status-badge ${orderData.status.toLowerCase()}">${orderData.status}</span>
        </div>
      </div>
      <div class="order-header-date-row">
        Created: ${formattedDate} ${customerName ? `(${customerName})` : ''}
      </div>
      <div class="order-header-actions-row">
        <div class="order-header-actions-left" id="order-header-actions-left-placeholder">
          <!-- Reorder button will be moved here -->
        </div>
        <div class="order-header-actions-right">
          <a href="#" class="order-print-link">Print Order</a>
        </div>
      </div>
    `;

    // Add Print Handler
    const printLink = customHeader.querySelector('.order-print-link');
    if (printLink) {
      printLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }

    // Move the reorder button from the status block once it loads
    const moveReorderButton = () => {
      const statusBlock = document.querySelector('.commerce-order-status');
      const actionLeftPlaceholder = document.getElementById('order-header-actions-left-placeholder');
      if (statusBlock && actionLeftPlaceholder) {
        // Find the button (reorder button) inside the status block
        const btn = statusBlock.querySelector('button, .dropin-button');
        if (btn && !actionLeftPlaceholder.contains(btn)) {
          actionLeftPlaceholder.appendChild(btn);
        }
      }
    };

    // Attempt to move it immediately, and set an observer or interval to move it once rendered
    setTimeout(moveReorderButton, 100);
    const observer = new MutationObserver(moveReorderButton);
    observer.observe(document.body, { childList: true, subtree: true });
  }, { eager: true });
}
