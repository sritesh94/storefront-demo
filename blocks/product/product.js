export default async function decorate(block) {
  console.log('Product block loaded');

  block.innerHTML = `
    <div class="product-test">
      <h2>Product Block Working ✅</h2>
      <p>If you can see this, the JS is being executed.</p>
    </div>
  `;
}
