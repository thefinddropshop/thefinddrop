const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'templates', 'product-template.html');
const productsPath = path.join(root, 'data', 'products.json');
const outputRoot = path.join(root, 'p');
const buildRoot = path.join(root, 'build');
const manifestPath = path.join(buildRoot, 'build-manifest.json');
const logsRoot = path.join(root, 'logs');
const buildLogPath = path.join(logsRoot, 'build.log');

function ensureBuildArtifacts() {
  if (!fs.existsSync(outputRoot)) {
    fs.mkdirSync(outputRoot, { recursive: true });
  }
  if (!fs.existsSync(buildRoot)) {
    fs.mkdirSync(buildRoot, { recursive: true });
  }
  if (!fs.existsSync(logsRoot)) {
    fs.mkdirSync(logsRoot, { recursive: true });
  }
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, '[]', 'utf8');
  }
  if (!fs.existsSync(buildLogPath)) {
    fs.writeFileSync(buildLogPath, '', 'utf8');
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (value) {
    return [value];
  }
  return [];
}

function normalizeAssetPath(assetPath, baseRoot = root) {
  if (!assetPath) {
    return '';
  }
  if (/^(https?:)?\/\//i.test(assetPath)) {
    return assetPath;
  }
  return path.resolve(baseRoot, assetPath.replace(/^\/+/, ''));
}

function assetExists(assetPath, baseRoot = root) {
  const normalized = normalizeAssetPath(assetPath, baseRoot);
  if (!normalized) {
    return false;
  }
  if (/^(https?:)?\/\//i.test(assetPath)) {
    return true;
  }
  return fs.existsSync(normalized);
}

function getExistingCategories() {
  const directories = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !['assets', 'build', 'data', 'docs', 'logs', 'p', 'scripts', 'templates'].includes(name));

  const categories = new Set(['Home', 'Tech', 'Bath', 'Wellness', 'Kitchen', 'Clothing', 'Creative']);
  for (const name of directories) {
    categories.add(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return categories;
}

function resolveHeroAsset(product, warnings, options = {}) {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    candidates.push(value);
  };

  if (product.heroImage) {
    addCandidate(product.heroImage);
  }
  if (product.heroImageWebp) {
    addCandidate(product.heroImageWebp);
  }
  if (product.heroImage) {
    const webp = product.heroImage.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    if (webp !== product.heroImage) {
      addCandidate(webp);
    }
  }
  if (product.slug) {
    addCandidate(`/assets/images/products/${product.slug}.webp`);
  }

  for (const candidate of candidates) {
    if (assetExists(candidate)) {
      return { heroImage: candidate, warnings };
    }
  }

  warnings.push(`Missing hero asset for ${product.slug || 'unknown product'}`);
  return { heroImage: '', warnings };
}

function resolveAssetList(values, warnings, label, options = {}) {
  const items = toArray(values).filter(Boolean);
  const existing = [];
  for (const item of items) {
    if (assetExists(item, options.root || root)) {
      existing.push(item);
    } else {
      warnings.push(`Missing ${label} asset: ${item}`);
    }
  }
  return existing;
}

function validateProduct(product, options = {}) {
  const warnings = [];
  const errors = [];

  const requiredFields = ['slug', 'title', 'category', 'heroImage', 'affiliateUrl'];
  for (const field of requiredFields) {
    const value = product[field];
    if (!value || String(value).trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (product.slug && options.slugRegistry && options.slugRegistry.has(product.slug)) {
    errors.push('Slug is not unique');
  }

  const categorySet = options.categorySet || getExistingCategories();
  if (product.category && !categorySet.has(String(product.category).trim())) {
    errors.push(`Category does not exist: ${product.category}`);
  }

  const heroResult = resolveHeroAsset(product, warnings, options);
  if (!heroResult.heroImage) {
    errors.push('Hero image is missing or unavailable');
  }

  const galleryImages = resolveAssetList(product.galleryImages, warnings, 'gallery', options);
  const videos = resolveAssetList(product.videos, warnings, 'video', options);
  const reviewImages = resolveAssetList(product.reviewImages, warnings, 'review image', options);
  const reviewVideos = resolveAssetList(product.reviewVideos, warnings, 'review video', options);

  const reviewCount = reviewImages.length + reviewVideos.length;
  const videoCount = videos.length;
  const galleryCount = galleryImages.length;

  return {
    ok: errors.length === 0,
    reason: errors.join(' | '),
    warnings,
    heroImage: heroResult.heroImage,
    galleryImages,
    videos,
    reviewImages,
    reviewVideos,
    reviewCount,
    videoCount,
    galleryCount
  };
}

function renderSections(product, validation) {
  const benefits = toArray(product.benefits).map((item) => `<div class="benefit-card"><h3>${escapeHtml(item.title || 'Benefit')}</h3><p>${escapeHtml(item.text || item.description || item)}</p></div>`).join('');
  const features = toArray(product.features).map((item) => `<div class="benefit-card"><h3>${escapeHtml(item.title || 'Feature')}</h3><p>${escapeHtml(item.text || item.description || item)}</p></div>`).join('');
  const specifications = toArray(product.specifications).map((item) => `<div class="benefit-card"><h3>${escapeHtml(item.title || 'Specification')}</h3><p>${escapeHtml(item.text || item.description || item)}</p></div>`).join('');
  const faqItems = toArray(product.faq).map((item) => `<details class="faq-item"><summary>${escapeHtml(item.question || item.title || 'Question')}</summary><p>${escapeHtml(item.answer || item.text || item)}</p></details>`).join('');
  const galleryItems = toArray(validation.galleryImages).map((item) => `<div class="gallery-card"><img src="${escapeHtml(item)}" alt="${escapeHtml(product.title)}"><div class="gallery-copy"><strong>Editorial view</strong><span>Additional product detail captured for the story.</span></div></div>`).join('');
  const reviewImages = toArray(validation.reviewImages).map((item) => `<div class="gallery-card"><img src="${escapeHtml(item)}" alt="${escapeHtml(product.title)} review"><div class="gallery-copy"><strong>Review image</strong><span>Captured from a real buyer moment.</span></div></div>`).join('');
  const reviewVideos = toArray(validation.reviewVideos).map((item) => `<div class="gallery-card"><div class="gallery-copy"><strong>Review video</strong><span>${escapeHtml(item)}</span></div></div>`).join('');
  const videos = toArray(validation.videos).map((item) => `<div class="gallery-card"><div class="gallery-copy"><strong>Video</strong><span>${escapeHtml(item)}</span></div></div>`).join('');
  const badges = toArray(product.badges).map((item) => `<span class="shop-badge">${escapeHtml(item)}</span>`).join('');
  const relatedProducts = toArray(product.relatedProducts).map((item) => `<article class="related-card"><h3>${escapeHtml(item.title || 'Related product')}</h3><p>${escapeHtml(item.description || item.text || '')}</p></article>`).join('');

  const heroActions = [];
  if (product.tiktokUrl || product.affiliateUrl) {
    heroActions.push(`<a class="btn btn-dark" href="${escapeHtml(product.tiktokUrl || product.affiliateUrl)}">${escapeHtml(product.ctaText || 'View on TikTok Shop')} →</a>`);
  }
  if (product.tiktokUrl) {
    heroActions.push(`<span class="shop-badge">Available on TikTok Shop</span>`);
  }
  heroActions.push(`<p class="affiliate-disclosure">As a TikTok Shop affiliate, The Find Drop may earn a commission from qualifying purchases made through links on this page.</p>`);

  const finalCta = [];
  if (product.tiktokUrl || product.affiliateUrl) {
    finalCta.push(`<a class="btn btn-dark" href="${escapeHtml(product.tiktokUrl || product.affiliateUrl)}">${escapeHtml(product.ctaText || 'View on TikTok Shop')}</a>`);
  }
  finalCta.push(`<p class="affiliate-disclosure">As a TikTok Shop affiliate, The Find Drop may earn a commission from qualifying purchases made through links on this page.</p>`);

  const sections = [];
  if (benefits || features || specifications) {
    const cards = [benefits, features, specifications].filter(Boolean).join('');
    sections.push(`<section class="section"><div class="container"><div class="section-heading"><div class="eyebrow">Benefits</div><h2>Why this one stands out.</h2><p>Premium details, thoughtful design, and everyday usefulness in one place.</p></div><div class="benefits-grid">${cards}</div></div></section>`);
  }
  if (galleryItems || videos || validation.heroImage) {
    const galleryContent = [galleryItems, videos].filter(Boolean).join('');
    sections.push(`<section class="section"><div class="container"><div class="section-heading"><div class="eyebrow">Lifestyle Gallery</div><h2>Seen in real routines.</h2><p>Large, calm visuals that feel editorial and easy to trust.</p></div><div class="gallery-grid"><div class="gallery-card gallery-card--feature"><img src="${escapeHtml(validation.heroImage || '')}" alt="${escapeHtml(product.title)}"><div class="gallery-copy"><strong>Hero moment</strong><span>Primary visual for the product story.</span></div></div>${galleryContent}</div></div></section>`);
  }
  if (reviewImages || reviewVideos || validation.reviewImages || validation.reviewVideos) {
    const reviews = [reviewImages, reviewVideos].filter(Boolean).join('');
    sections.push(`<section class="section"><div class="container"><div class="section-heading"><div class="eyebrow">Customer Reviews</div><h2>What people are saying.</h2><p>Short, trustworthy notes that keep the experience warm and human.</p></div><div class="review-grid">${reviews}</div></div></section>`);
  }
  if (faqItems) {
    sections.push(`<section class="section"><div class="container"><div class="section-heading"><div class="eyebrow">FAQ</div><h2>Questions before you click through.</h2><p>A quick answer layer for curious shoppers and affiliate readers.</p></div><div class="faq-list">${faqItems}</div></div></section>`);
  }
  if (finalCta.length) {
    sections.push(`<section class="final-cta"><div class="container"><h2>Ready to see it for yourself?</h2>${finalCta.join('')}</div></section>`);
  }
  if (relatedProducts) {
    sections.push(`<section class="section"><div class="container"><div class="section-heading"><div class="eyebrow">Related Products</div><h2>More from ${escapeHtml(product.category)}.</h2><p>Four refined options that complement the same mood and aesthetic.</p></div><div class="related-grid">${relatedProducts}</div></div></section>`);
  }

  return {
    heroActions: heroActions.join(''),
    badges,
    sections: sections.join(''),
    finalCta: finalCta.join('')
  };
}

function appendBuildLog(entry) {
  const line = `${entry.timestamp} | product=${entry.product} | status=${entry.status} | html=${entry.htmlPath || '-'} | warnings=${entry.warnings} | errors=${entry.errors} | success=${entry.success} | reason=${entry.reason || '-'}\n`;
  fs.appendFileSync(buildLogPath, line, 'utf8');
}

function writeManifest(entries) {
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2), 'utf8');
}

function publishToGithub() {}
function publishToGitHubPages() {}
function publishToCloudflare() {}

function generateProductPages(options = {}) {
  ensureBuildArtifacts();

  if (!fs.existsSync(templatePath)) {
    throw new Error('Template not found');
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const categorySet = getExistingCategories();
  const slugRegistry = new Set();
  const manifestEntries = [];
  const runTimestamp = new Date().toISOString();
  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let warnings = 0;
  let errors = 0;
  const startTime = Date.now();

  for (const product of products) {
    processed += 1;
    const slug = product.slug || '';
    const validation = validateProduct(product, { categorySet, slugRegistry });
    if (slug) {
      if (slugRegistry.has(slug)) {
        validation.ok = false;
        validation.reason = `${validation.reason ? `${validation.reason} | ` : ''}Slug is not unique`;
      } else {
        slugRegistry.add(slug);
      }
    }

    const productWarnings = validation.warnings ? validation.warnings.length : 0;
    const productErrors = validation.reason ? (validation.reason ? 1 : 0) : 0;
    warnings += productWarnings;
    errors += productErrors;

    const buildEntry = {
      slug: slug || '',
      title: product.title || '',
      category: product.category || '',
      generatedDate: runTimestamp,
      htmlPath: '',
      heroImage: validation.heroImage || '',
      galleryCount: validation.galleryCount || 0,
      videoCount: validation.videoCount || 0,
      reviewCount: validation.reviewCount || 0,
      status: 'skipped'
    };

    if (validation.ok) {
      const folder = path.join(outputRoot, slug);
      fs.mkdirSync(folder, { recursive: true });
      const rendered = renderSections(product, validation);

      let page = template;
      const replacements = {
        PRODUCT_TITLE: product.title,
        CATEGORY: product.category,
        PRODUCT_HOOK: product.description,
        RATING: product.rating,
        SELLER: product.seller,
        TIKTOK_URL: product.tiktokUrl || product.tiktokURL || '',
        HERO_IMAGE: validation.heroImage || '',
        HERO_ACTIONS: rendered.heroActions,
        BENEFITS_SECTION: rendered.sections,
        GALLERY_SECTION: '',
        REVIEWS_SECTION: '',
        FAQ_SECTION: '',
        FINAL_CTA_SECTION: '',
        RELATED_SECTION: ''
      };

      Object.entries(replacements).forEach(([key, value]) => {
        page = page.split(`{{${key}}}`).join(String(value));
      });

      page = page.replace(/\.\.\/assets\//g, '../../assets/');
      page = page.replace(/href="\//g, 'href="/');
      page = page.replace(/src="\//g, 'src="/');

      const htmlPath = path.join('p', slug, 'index.html').replace(/\\/g, '/');
      fs.writeFileSync(path.join(folder, 'index.html'), page, 'utf8');
      buildEntry.htmlPath = htmlPath;
      buildEntry.status = 'generated';
      generated += 1;
      appendBuildLog({
        timestamp: runTimestamp,
        product: slug,
        status: 'generated',
        htmlPath,
        warnings: productWarnings,
        errors: 0,
        success: true,
        reason: 'Generated successfully'
      });
    } else {
      skipped += 1;
      appendBuildLog({
        timestamp: runTimestamp,
        product: slug,
        status: 'skipped',
        htmlPath: '',
        warnings: productWarnings,
        errors: 1,
        success: false,
        reason: validation.reason
      });
    }

    manifestEntries.push(buildEntry);
  }

  writeManifest(manifestEntries);
  appendBuildLog({
    timestamp: runTimestamp,
    product: 'summary',
    status: 'summary',
    htmlPath: '-',
    warnings,
    errors,
    success: true,
    reason: `processed=${processed};generated=${generated};skipped=${skipped};generationTimeMs=${Date.now() - startTime}`
  });

  console.log(`Products processed: ${processed}`);
  console.log(`Products generated: ${generated}`);
  console.log(`Products skipped: ${skipped}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`Errors: ${errors}`);
  console.log(`Generation time: ${Date.now() - startTime}ms`);

  return {
    processed,
    generated,
    skipped,
    warnings,
    errors,
    generationTimeMs: Date.now() - startTime
  };
}

if (require.main === module) {
  generateProductPages();
}

module.exports = {
  generateProductPages,
  validateProduct,
  publishToGithub,
  publishToGitHubPages,
  publishToCloudflare
};
