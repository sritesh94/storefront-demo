import '../../scripts/initializers/search.js';
import { search } from '@dropins/storefront-product-discovery/api.js';

export default async function decorate(block) {
  const result = await search({
    phrase: '',
    currentPage: 1,
    pageSize: 1,
    filter: [
      {
        attribute: 'visibility',
        in: ['Catalog, Search', 'Search'],
      },
    ],
  });

  block.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
}
