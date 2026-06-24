const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProduct } = require('./generate-product-pages');

test('validateProduct skips products with missing required fields', () => {
  const result = validateProduct({
    slug: 'test-product',
    title: 'Test Product',
    category: 'Home',
    heroImage: '/assets/images/products/missing.jpg',
    affiliateUrl: 'https://example.com',
    galleryImages: ['/assets/images/products/does-not-exist.jpg']
  }, { root: process.cwd() });

  assert.equal(result.ok, false);
  assert.match(result.reason, /hero image/i);
});

test('validateProduct accepts a product when required fields are present', () => {
  const result = validateProduct({
    slug: 'valid-product',
    title: 'Valid Product',
    category: 'Home',
    heroImage: '/assets/images/products/stoneware-table-lamp.jpg',
    affiliateUrl: 'https://example.com',
    galleryImages: ['/assets/images/products/stoneware-table-lamp-1.jpg']
  }, { root: process.cwd() });

  assert.equal(result.ok, true);
  assert.equal(result.heroImage, '/assets/images/products/stoneware-table-lamp.jpg');
});
