export default async function decorate(block) {
  const products = await fetchProducts();

  const container = document.createElement('div');
  container.className = 'product-collection-grid';

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const oldPrice = product.oldPrice
      ? `<span class="old-price">$${product.oldPrice}</span>`
      : '';

    const specialPrice = product.specialPrice
      ? `<span class="special-price">$${product.specialPrice}</span>`
      : `<span class="price">$${product.price}</span>`;

    const swatches = product.colors
      .map((color) => (
        `<span class="swatch" style="background:${color}"></span>`
      ))
      .join('');

    card.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>

      <div class="product-name">${product.name}</div>

      <div class="product-rating">
        ★★★★☆
      </div>

      <div class="product-price">
        ${oldPrice}
        ${specialPrice}
      </div>

      <div class="product-swatches">
        ${swatches}
      </div>
    `;

    container.append(card);
  });

  block.replaceChildren(container);
}

async function fetchProducts() {
  return [
    {
      name: 'Becky',
      price: '68.00',
      image: 'https://placehold.co/400x500/f5f5f5/000?text=Product+1',
      colors: ['#d9d9d9', '#ff6b81', '#0f9d58'],
    },
    {
      name: 'Mini Melissa Cloud Sandal + Mickey And Friends Baby',
      oldPrice: '98.00',
      specialPrice: '68.00',
      image: 'https://placehold.co/400x500/f5f5f5/000?text=Product+2',
      colors: ['#d9d9d9', '#ff6b81', '#0f9d58'],
    },
    {
      name: 'Free Platform',
      price: '68.00',
      image: 'https://placehold.co/400x500/f5f5f5/000?text=Product+3',
      colors: ['#d9d9d9', '#ff6b81', '#0f9d58'],
    },
  ];
}
