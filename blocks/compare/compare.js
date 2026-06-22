export default async function decorate(block) {
  const skus = JSON.parse(
    localStorage.getItem('compare-products') || '[]',
  );

  if (!skus.length) {
    block.innerHTML = '<p>No products selected for comparison.</p>';
  }
}
