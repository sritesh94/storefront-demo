# Product Section Block - Quick Start Guide

## Overview
The new `product-section` block is a reusable, flexible component for displaying products on your Adobe Commerce storefront. It's fully manageable from da.live and supports grid and carousel layouts.

## Files Created
- **blocks/product-section/product-section.js** - Main block logic
- **blocks/product-section/product-section.css** - Styling
- **blocks/product-section/_product-section.json** - da.live configuration model
- **blocks/product-section/README.md** - Full documentation

## Quick Setup

### Step 1: Test Locally
```bash
cd /home/ritesh.singh@brainvire.com/htdocs/storefront-demo
npm install
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

The dev server runs at `http://localhost:3000`

### Step 2: Create Test Content
Create a test page in `drafts/` folder or use existing content page.

Example HTML for testing (save as `drafts/product-section-test.html`):
```html
<html>
<head>
  <title>Product Section Test</title>
</head>
<body>
  <main>
    <div class="section">
      <div class="product-section-wrapper">
        <div>Display Type</div>
        <div>grid</div>
      </div>
      <div>
        <div>Page Size</div>
        <div>9</div>
      </div>
    </div>
  </main>
</body>
</html>
```

### Step 3: Test in Browser
Visit `http://localhost:3000/product-section-test`

## Using in da.live

### Grid Layout (Recommended for Product Listing Pages)
1. Go to da.live at https://da.live/
2. Navigate to your page
3. Add a new **Product Section** block
4. Configure as follows:

| Field | Value |
|-------|-------|
| Display Type | grid |
| Page Size | 9 |
| Category Path | /women/shoes |
| Sort By | price-asc |

### Carousel Layout (Recommended for Hero/Featured Products)
1. Add a new **Product Section** block
2. Configure as follows:

| Field | Value |
|-------|-------|
| Display Type | carousel |
| Page Size | 6 |
| Product SKUs | product1-sku,product2-sku,product3-sku |
| Recommendation Type | trending |

### Specific Products Only
If you want to show only specific products:

| Field | Value |
|-------|-------|
| Display Type | grid |
| Product SKUs | sku-001,sku-002,sku-003,sku-004 |

Leave **Category Path** empty when using specific SKUs.

## Configuration Reference

### Display Type
- **grid**: Multi-column layout that adapts to screen size
  - 1 column (mobile)
  - 2 columns (tablet, 600px+)
  - 3 columns (desktop, 900px+)
  - 4 columns (large desktop, 1200px+)
  
- **carousel**: Horizontal scrollable carousel
  - Mobile: Full width cards, left/right swipe
  - Desktop: Navigation arrows appear

### Page Size
Number of products to display. Examples:
- `6` - Show 6 products (good for featured sections)
- `9` - Show 9 products (3x3 grid)
- `12` - Show 12 products (4x3 grid)

### Product SKUs
Comma-separated product identifiers:
```
WS04-XS-Gray,WS04-XS-Yellow,WS04-M-Blue
```

### Category Path
Filter products by category:
- `/women` - All women's products
- `/women/shoes` - Women's shoes only
- `/men/accessories` - Men's accessories

### Recommendation Type
Algorithm for suggesting products:
- `viewed` - Products previously viewed
- `bought-together` - Often bought together
- `trending` - Currently trending
- `recently-viewed` - Recently viewed items

### Sort By
Order products by:
- `name` - Alphabetical (A-Z)
- `price-asc` - Lowest to highest price
- `price-desc` - Highest to lowest price
- `relevance` - Most relevant
- `newest` - Recently added
- `bestsellers` - Best selling products

## Common Use Cases

### 1. New Arrivals Section
```
Display Type: grid
Page Size: 6
Category Path: /
Sort By: newest
```

### 2. Sale/Featured Products Carousel
```
Display Type: carousel
Page Size: 5
Product SKUs: sale-item-1,sale-item-2,sale-item-3
```

### 3. Popular This Week (Category)
```
Display Type: grid
Page Size: 12
Category Path: /women/shoes
Sort By: bestsellers
Recommendation Type: trending
```

### 4. Cross-sell Products (Show Specific Items)
```
Display Type: carousel
Page Size: 4
Product SKUs: accessory1,accessory2,accessory3,accessory4
```

## Styling & Customization

### Override Colors
Edit your `styles.css` or `lazy-styles.css`:

```css
:root {
  --color-accent-blue: #your-brand-color;
  --color-accent-red: #your-sale-color;
  --color-accent-green: #your-new-color;
}
```

### Adjust Spacing
```css
:root {
  --spacing-small: 0.75rem;
  --spacing-medium: 1.5rem;
  --spacing-large: 2.5rem;
}
```

## Testing Checklist

- [ ] Grid layout displays correctly on mobile (1 col)
- [ ] Grid layout displays correctly on tablet (2 cols)
- [ ] Grid layout displays correctly on desktop (3+ cols)
- [ ] Carousel scrolls smoothly on mobile
- [ ] Carousel navigation arrows work on desktop
- [ ] Product images load correctly
- [ ] Hover effects work (shadow, zoom)
- [ ] "Add to Cart" button adds products
- [ ] Wishlist icon toggles on/off
- [ ] Pricing displays correctly (with/without sale)
- [ ] Product links navigate to detail page
- [ ] Color swatches display correctly
- [ ] Badges (NEW/SALE) show appropriately
- [ ] Responsive breaks at 600px, 900px, 1200px
- [ ] Keyboard navigation works
- [ ] Mobile touch scrolling works

## Performance Tips

1. **Use Grid for Product Listings** - Better performance with many products
2. **Use Carousel for Featured** - Limits number of loaded products
3. **Optimize Images** - Upload images under 200KB
4. **Set Reasonable Page Size** - Don't exceed 12 for grid, 6 for carousel
5. **Use Category Path** - More efficient than loading all products

## Troubleshooting

### Block Not Appearing
- Check browser console for errors (F12)
- Verify block configuration in da.live
- Clear browser cache (Ctrl+Shift+Del)
- Verify initializers are loaded in scripts.js

### Products Not Showing
- Check Product SKUs are correct (case-sensitive)
- Verify products exist in your Adobe Commerce catalog
- Try removing Product SKUs and using Category Path instead
- Check da.live preview (not live) for latest content

### Styling Issues
- Clear CSS cache (hard refresh: Ctrl+Shift+R)
- Check for conflicting CSS from other blocks
- Verify CSS variables are defined in root
- Check media query breakpoints

### Cart/Wishlist Not Working
- Verify you're logged in to Adobe Commerce
- Check network tab (F12) for API errors
- Verify cart/wishlist dropins are initialized
- Check Adobe Commerce backend API is accessible

## Next Steps

1. **Create First Block**: Add product-section to a test page
2. **Customize Styling**: Update CSS variables to match brand
3. **Configure Products**: Set up your first product collection
4. **Deploy to Feature Branch**: Push changes and preview
5. **Test on Real Products**: Swap mock data with live products

## Additional Resources

- Full Documentation: [blocks/product-section/README.md](blocks/product-section/README.md)
- AEM Live Documentation: https://www.aem.live/developer
- Adobe Commerce Storefront: https://experienceleague.adobe.com/developer/commerce/storefront
- Block Template: [block-readme-template.md](block-readme-template.md)

## Support

For issues or questions:
1. Check README.md in the block directory
2. Review console errors (F12 → Console tab)
3. Test with mock data first
4. Compare with working blocks (carousel, product-recommendations)
5. Check da.live for configuration errors
