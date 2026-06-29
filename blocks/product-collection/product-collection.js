import '../../scripts/initializers/search.js';
import { search } from '@dropins/storefront-product-discovery/api.js';

export default async function decorate(block) {
  block.textContent = 'Product Collection Loaded';
}
