const CATEGORY_MAP = {
  tech: 'Tech',
  creative: 'Creative',
  home: 'Home',
  kitchen: 'Kitchen',
  bath: 'Bath',
  clothing: 'Clothing',
  wellness: 'Wellness'
};

// Keyword → Tag rules. First match wins per rule. Add to products.json (`tags`)
// if you want explicit tags — those override the auto-derived ones.
const TAG_RULES = [
  { tag: 'Knives',         match: /\b(knife|knives|cleaver|santoku|paring|chef's knife)\b/i },
  { tag: 'Cookware',       match: /\b(pan|pot|skillet|wok|air fryer|fryer|griddle|cookware)\b/i },
  { tag: 'Bakeware',       match: /\b(baking|bake|loaf|cake pan|muffin|cookie sheet)\b/i },
  { tag: 'Storage',        match: /\b(storage|organizer|basket|holder|caddy|rack)\b/i },
  { tag: 'Bath Soak',      match: /\b(bath soak|epsom|soak|foam bath|mineral)\b/i },
  { tag: 'Skincare',       match: /\b(skin|serum|moisturizer|cleanser|retinol|eyebrow|pencil|lotion)\b/i },
  { tag: 'Wellness',       match: /\b(fitness|tracker|smart watch|wellness|yoga|meditation)\b/i },
  { tag: 'Outerwear',      match: /\b(jacket|coat|parka|windbreaker|sweater|cardigan|pullover|hoodie)\b/i },
  { tag: 'Accessories',    match: /\b(sunglasses|hat|cap|scarf|belt|wallet|bag|tote)\b/i },
  { tag: 'Tech Gear',      match: /\b(cord|usb|charger|cable|adapter|stand|holder|desk)\b/i },
  { tag: 'Art Supplies',   match: /\b(art|paint|brush|pencil|squeeze|drawing|stamp)\b/i },
  { tag: 'Wall Decor',     match: /\b(wall hanging|picture hanger|hanger|wall art|frame)\b/i },
  { tag: 'Pet',            match: /\b(dog|cat|pet)\b/i },
  { tag: 'Books',          match: /\b(book|guide|manual|novel|read)\b/i }
];

function getProductTags(product) {
  const explicit = Array.isArray(product.tags) ? product.tags : [];
  if (explicit.length) return explicit;
  const title = product.title || '';
  const subtitle = product.subtitle || '';
  const lead = product.lead || '';
  const haystack = `${title} ${subtitle} ${lead}`;
  const derived = [];
  for (const rule of TAG_RULES) {
    if (rule.match.test(haystack)) {
      derived.push(rule.tag);
    }
  }
  if (!derived.length) {
    derived.push(product.category || 'Other');
  }
  return derived;
}

const state = {
  search: '',
  sort: 'featured',
  tag: ''
};

function resolveSitePath(value) {
  if (!value) {
    return value;
  }

  if (/^(https?:)?\/\//i.test(value) || value.indexOf('mailto:') === 0 || value.indexOf('tel:') === 0 || value.indexOf('#') === 0 || value.indexOf('data:') === 0) {
    return value;
  }

  if (typeof window.__FINDDROP_TO_BASE === 'function') {
    return window.__FINDDROP_TO_BASE(value);
  }

  return value;
}

function getProductsDataUrl() {
  return resolveSitePath('/data/products.json');
}

function getProductLink(product) {
  return resolveSitePath(`/p/${product.slug}/`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function polishText(value) {
  if (!value) return '';
  let text = String(value).trim();
  if (!text) return '';
  // Strip stray AI-style dashes used as connectors in compound sentences:
  //   " - " (space-dash-space) → " — " is already removed by the data, so we
  //   just collapse any remaining " - " into ", " and tidy trailing punctuation.
  text = text.replace(/\s+-\s+/g, ', ');
  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, ' ');
  // Capitalize first letter
  text = text.replace(/^([a-z])/, (_, ch) => ch.toUpperCase());
  // Ensure terminal punctuation
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }
  return text;
}

function getPageContext() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  const slug = parts[parts.length - 1] || '';
  return {
    slug,
    category: CATEGORY_MAP[slug] || null,
    isProductTemplate: document.body.classList.contains('product-template')
  };
}

async function loadProducts() {
  const response = await fetch(getProductsDataUrl(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load product data');
  }
  return response.json();
}

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';
  const productHref = getProductLink(product);
  const heroImage = resolveSitePath(product.thumbnail || product.heroImage);
  const heroImageLarge = resolveSitePath(product.heroImage || product.thumbnail);

  const subtitle = product.subtitle || product.lead || product.tagline || '';

  article.innerHTML = `
    <a class="product-card-link" href="${productHref}" aria-label="View ${escapeHtml(product.title)}">
      <div class="product-media">
        <img src="${heroImage}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" srcset="${heroImage} 600w, ${heroImageLarge} 1200w" sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 25vw">
      </div>
      <div class="product-info">
        <h3>${escapeHtml(product.title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
        <div class="product-footer">
          <div class="rating">★★★★★ ${product.rating}</div>
          <span class="text-link">View Product</span>
        </div>
      </div>
    </a>
  `;
  return article;
}

function scoreProductMatch(product, tokens) {
  const title = (product.title || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const subtitle = (product.subtitle || '').toLowerCase();
  const lead = (product.lead || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();
  let benefitsText = '';
  if (Array.isArray(product.benefits)) {
    benefitsText = product.benefits.map((b) => `${b.title || ''} ${b.text || ''}`).join(' ').toLowerCase();
  }

  // Every token must appear as a word-prefix in at least one searchable field.
  const fields = [title, category, subtitle, lead, description, slug, benefitsText];
  for (const token of tokens) {
    if (!fields.some((field) => new RegExp('\\b' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(field))) {
      return -1; // not a match
    }
  }

  // Score: lower is better
  let score = 9;
  tokens.forEach((token) => {
    if (title.startsWith(token)) score = Math.min(score, 0);
    else if (new RegExp('\\b' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(title)) score = Math.min(score, 1);
    if (category.startsWith(token)) score = Math.min(score, 0);
    else if (fieldContainsWord(category, token)) score = Math.min(score, 2);
    if (fieldContainsWord(subtitle, token)) score = Math.min(score, 2);
    if (fieldContainsWord(lead, token)) score = Math.min(score, 3);
    if (fieldContainsWord(description, token)) score = Math.min(score, 4);
    if (fieldContainsWord(slug, token)) score = Math.min(score, 1);
  });
  return score;
}

function fieldContainsWord(field, token) {
  if (!field) return false;
  const safe = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('\\b' + safe).test(field);
}

function getFilteredProducts(products, context) {
  let filtered = products;

  if (context.category) {
    filtered = filtered.filter((product) => product.category.toLowerCase() === context.category.toLowerCase());
  }

  if (state.tag) {
    filtered = filtered.filter((product) => getProductTags(product).includes(state.tag));
  }

  if (state.search.trim()) {
    const raw = state.search.trim().toLowerCase();
    const tokens = raw.split(/\s+/).filter(Boolean);
    filtered = filtered
      .map((product) => ({ product, score: scoreProductMatch(product, tokens) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => a.score - b.score)
      .map((entry) => entry.product);
  }

  if (state.sort === 'az') {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sort === 'za') {
    filtered = [...filtered].sort((a, b) => b.title.localeCompare(a.title));
  } else if (state.sort === 'newest') {
    filtered = [...filtered].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  } else if (state.sort === 'oldest') {
    filtered = [...filtered].sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
  } else if (state.sort === 'rating') {
    filtered = [...filtered].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  } else if (state.sort === 'rating-low') {
    filtered = [...filtered].sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
  } else if (state.sort === 'title-len') {
    filtered = [...filtered].sort((a, b) => a.title.length - b.title.length);
  } else if (state.sort === 'featured') {
    filtered = [...filtered].sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  return filtered;
}

function renderTagFilter(container, products, context) {
  // Only show tag chips on category pages (not product detail / homepage)
  if (!context || !context.category) {
    return;
  }

  // Tags that exist within the current category
  const tagCounts = new Map();
  products
    .filter((product) => product.category && product.category.toLowerCase() === context.category.toLowerCase())
    .forEach((product) => {
      getProductTags(product).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // Don't render if no tags or only one tag (it would be a no-op filter)
  if (sortedTags.length < 2) {
    const existing = document.querySelector('[data-tag-filter]');
    if (existing) existing.remove();
    return;
  }

  const parent = container.parentElement;
  let row = parent.querySelector('[data-tag-filter]');
  if (!row) {
    row = document.createElement('div');
    row.className = 'tag-filter';
    row.setAttribute('data-tag-filter', '');
    const toolbar = parent.querySelector('.product-toolbar');
    if (toolbar && toolbar.nextSibling) {
      parent.insertBefore(row, toolbar.nextSibling);
    } else {
      parent.insertBefore(row, container);
    }
  }

  const chips = ['<button type="button" class="tag-chip" data-tag-value="">All</button>']
    .concat(
      sortedTags.map(([tag, count]) =>
        `<button type="button" class="tag-chip${state.tag === tag ? ' is-active' : ''}" data-tag-value="${escapeHtml(tag)}">${escapeHtml(tag)} <span class="tag-chip-count">${count}</span></button>`
      )
    )
    .join('');
  row.innerHTML = chips;

  row.querySelectorAll('[data-tag-value]').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.tag = chip.dataset.tagValue;
      renderCategoryProducts(window.__PRODUCTS || [], context);
    });
  });
}

function renderCategoryProducts(products, context) {
  const container = document.querySelector('.product-grid');
  if (!container) {
    return;
  }

  renderTagFilter(container, products, context);

  const count = container.dataset.count ? Number(container.dataset.count) : 0;
  let filtered = getFilteredProducts(products, context);

  if (count > 0) {
    filtered = filtered.slice(0, count);
  }

  container.innerHTML = '';

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'product-empty';
    empty.textContent = 'No products match your search yet.';
    container.appendChild(empty);
    return;
  }

  filtered.forEach((product) => {
    container.appendChild(createProductCard(product));
  });
}

function renderHomepageFeatured(products) {
  const container = document.querySelector('[data-featured-products]') || document.querySelector('.product-track');
  if (!container) {
    return;
  }

  const featured = products.filter((product) => product.featured).slice(0, 4);
  container.innerHTML = '';

  if (!featured.length) {
    const empty = document.createElement('div');
    empty.className = 'product-empty';
    empty.textContent = 'Featured products will appear here.';
    container.appendChild(empty);
    return;
  }

  featured.forEach((product) => {
    container.appendChild(createProductCard(product));
  });
}

function injectSearchUI() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions || document.querySelector('[data-site-search]')) {
    return;
  }

  const searchForm = document.createElement('form');
  searchForm.className = 'site-search';
  searchForm.setAttribute('data-site-search', '');
  searchForm.innerHTML = `
    <input type="search" name="site-search" placeholder="Search products" aria-label="Search products">
    <div class="search-results" data-search-results></div>
  `;

  headerActions.prepend(searchForm);

  const toggle = headerActions.querySelector('.icon-btn');
  if (toggle) {
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      searchForm.classList.toggle('is-open');
      const input = searchForm.querySelector('input');
      if (searchForm.classList.contains('is-open')) {
        input.focus();
      }
    });
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = searchForm.querySelector('input');
    state.search = input.value;
    const context = getPageContext();
    if (context.category) {
      renderCategoryProducts(window.__PRODUCTS || [], context);
    }
    renderSearchResults(window.__PRODUCTS || [], searchForm.querySelector('[data-search-results]'));
  });

  searchForm.querySelector('input').addEventListener('input', (event) => {
    state.search = event.target.value;
    const context = getPageContext();
    if (context.category) {
      renderCategoryProducts(window.__PRODUCTS || [], context);
    }
    renderSearchResults(window.__PRODUCTS || [], searchForm.querySelector('[data-search-results]'));
  });
}

function renderSearchResults(products, resultsContainer) {
  if (!resultsContainer) {
    return;
  }

  const query = state.search.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  resultsContainer.innerHTML = '';
  resultsContainer.classList.remove('is-visible');

  if (!query) {
    return;
  }

  const matches = products
    .map((product) => ({ product, score: scoreProductMatch(product, tokens) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((entry) => entry.product);

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'search-result-empty';
    empty.textContent = 'No matching products found.';
    resultsContainer.appendChild(empty);
    resultsContainer.classList.add('is-visible');
    return;
  }

  matches.forEach((product) => {
    const link = document.createElement('a');
    link.href = getProductLink(product);
    link.className = 'search-result-item';
    link.innerHTML = `<strong>${escapeHtml(product.title)}</strong><span>${escapeHtml(product.category)}</span>`;
    resultsContainer.appendChild(link);
  });

  resultsContainer.classList.add('is-visible');
}

function injectCategoryToolbar(context) {
  if (!context.category) {
    return;
  }

  const existing = document.querySelector('.product-toolbar');
  if (existing) {
    return;
  }

  const container = document.querySelector('.product-grid');
  if (!container) {
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'product-toolbar';
  toolbar.innerHTML = `
    <label class="product-filter">
      <span>Search</span>
      <input type="search" data-toolbar-search placeholder="Search ${escapeHtml(context.category)}" aria-label="Search ${escapeHtml(context.category)}">
    </label>
    <label class="product-filter">
      <span>Sort</span>
      <select data-toolbar-sort>
        <option value="featured">Featured</option>
        <option value="az">A-Z</option>
        <option value="newest">Newest</option>
      </select>
    </label>
  `;

  container.before(toolbar);

  const input = toolbar.querySelector('[data-toolbar-search]');
  const select = toolbar.querySelector('[data-toolbar-sort]');

  input.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderCategoryProducts(window.__PRODUCTS || [], context);
  });

  select.addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderCategoryProducts(window.__PRODUCTS || [], context);
  });
}

function buildProductGalleryHtml(product) {
  const hero = product.heroImage || product.thumbnail || '';
  // If the product has explicit gallery images, use them; otherwise reuse the hero.
  const sources = (Array.isArray(product.gallery) && product.gallery.length)
    ? product.gallery
    : (hero ? [hero, hero, hero, hero] : []);
  if (!sources.length) return '';

  return sources.map((src, i) => {
    const isFeature = i === 0;
    const subCopy = isFeature ? escapeHtml(product.category || '') : '';
    return `<div class="gallery-card${isFeature ? ' gallery-card--feature' : ''}">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(product.title || '')} ${i + 1}" loading="lazy" />
      ${isFeature ? `<div class="gallery-copy"><strong>${escapeHtml(product.title || '')}</strong><span>${subCopy}</span></div>` : ''}
    </div>`;
  }).join('');
}

function applyProductTemplateData(products) {
  if (!document.body.classList.contains('product-template')) {
    return;
  }

  const context = getPageContext();
  const product = products.find((item) => item.slug === context.slug) || null;
  if (!product) {
    return;
  }

  const replacements = {
    PRODUCT_TITLE: product.title,
    CATEGORY: product.category,
    PRODUCT_HOOK: polishText(product.description || product.lead || product.subtitle),
    RATING: product.rating,
    SELLER: product.shipper || product.brand || product.seller || '',
    TIKTOK_URL: product.tiktokURL,
    HERO_IMAGE: product.heroImage,
    GALLERY: buildProductGalleryHtml(product),
    BENEFITS: '<div class="benefit-card"><h3>Premium finish</h3><p>Made to feel considered and easy to keep in daily use.</p></div><div class="benefit-card"><h3>Everyday utility</h3><p>Simple to use and easy to recommend to friends.</p></div><div class="benefit-card"><h3>Thoughtful packaging</h3><p>Clean presentation that feels polished from first glance.</p></div><div class="benefit-card"><h3>Trusted by our audience</h3><p>A dependable choice for readers looking for something worth sharing.</p></div>',
    REVIEWS: '',
    FAQ: ''
  };

  let content = document.body.innerHTML;
  Object.entries(replacements).forEach(([placeholder, value]) => {
    const isHtmlPlaceholder = ['BENEFITS', 'GALLERY', 'REVIEWS', 'FAQ'].includes(placeholder);
    content = content.split(`{{${placeholder}}}`).join(isHtmlPlaceholder ? value : escapeHtml(value));
  });

  document.body.innerHTML = content;

  injectProductFieldsDOM(product);
}

function injectProductFieldsDOM(product) {
  // Update h1 to product title if a data-product-title hook is present
  const titleEl = document.querySelector('[data-product-title]');
  if (titleEl && product.title) {
    titleEl.textContent = product.title;
  }

  // Update lead paragraph
  const leadEl = document.querySelector('[data-product-lead]');
  if (leadEl) {
    leadEl.textContent = polishText(product.description || product.lead || product.subtitle || '');
  }

  // Update rating
  const ratingEl = document.querySelector('[data-product-rating]');
  if (ratingEl && product.rating) {
    const stars = '★★★★★'.slice(0, Math.round(Number(product.rating))) + '☆☆☆☆☆'.slice(0, 5 - Math.round(Number(product.rating)));
    ratingEl.innerHTML = `★★★★★ <span>${Number(product.rating).toFixed(1)}</span>`;
  }

  // Seller: hide row if no seller/shipper available
  const sellerEl = document.querySelector('[data-product-seller]');
  if (sellerEl) {
    const sellerName = product.shipper || product.brand || product.seller || '';
    if (sellerName) {
      sellerEl.textContent = sellerName;
    } else {
      const row = sellerEl.closest('span') || sellerEl.parentElement;
      if (row) row.style.display = 'none';
    }
  }

  // Update hero image alt
  const heroImg = document.querySelector('.hero-visual-card img');
  if (heroImg && product.title) heroImg.setAttribute('alt', product.title);

  // Update page <title>
  if (product.title) {
    document.title = `${product.title} | The Find Drop`;
  }
}

function bindExistingSearchInputs() {
  const inputs = document.querySelectorAll('[data-search-input]');
  inputs.forEach((input) => {
    let timer;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.search = input.value;
        const context = getPageContext();
        if (context.category && document.querySelector('.product-grid')) {
          renderCategoryProducts(window.__PRODUCTS || [], context);
        }
        renderHomepageFeatured(window.__PRODUCTS || []);
        // Render dropdown next to the input that was typed in (not just first one on the page)
        const container = input.closest('.site-search, .mobile-search-overlay, .product-filter, form') || input.parentElement;
        let target = container ? container.querySelector('[data-search-results]') : null;
        // Fallback: pick a visible (non-display:none) [data-search-results] container
        if (!target || getComputedStyle(container).display === 'none') {
          const visible = Array.from(document.querySelectorAll('[data-search-results]'))
            .find(el => getComputedStyle(el.parentElement).display !== 'none' && getComputedStyle(el).display !== 'none');
          if (visible) target = visible;
        }
        if (!target) target = document.querySelector('[data-search-results]');
        renderSearchResults(window.__PRODUCTS || [], target);
      }, 120);
    };
    input.addEventListener('input', fire);

    const form = input.closest('form') || input.parentElement;
    if (form && form.tagName === 'FORM') {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        state.search = input.value;
        const context = getPageContext();
        if (context.category && document.querySelector('.product-grid')) {
          renderCategoryProducts(window.__PRODUCTS || [], context);
        }
        renderHomepageFeatured(window.__PRODUCTS || []);
        const container = input.closest('.site-search, .mobile-search-overlay, .product-filter, form') || input.parentElement;
        let target = container ? container.querySelector('[data-search-results]') : null;
        if (!target || getComputedStyle(container).display === 'none') {
          const visible = Array.from(document.querySelectorAll('[data-search-results]'))
            .find(el => getComputedStyle(el.parentElement).display !== 'none' && getComputedStyle(el).display !== 'none');
          if (visible) target = visible;
        }
        if (!target) target = document.querySelector('[data-search-results]');
        renderSearchResults(window.__PRODUCTS || [], target);
      });
    }
  });

  // Pre-fill the dynamic header search (if JS created one) with current state
  const dynamicInput = document.querySelector('[data-site-search] input');
  if (dynamicInput && state.search) {
    dynamicInput.value = state.search;
  }

  // Wire up the static <select data-sort> dropdown that already exists in HTML
  const sortSelect = document.querySelector('select[data-sort]');
  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.dataset.bound = '1';
    sortSelect.value = state.sort || 'featured';
    sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      const context = getPageContext();
      if (context.category && document.querySelector('.product-grid')) {
        renderCategoryProducts(window.__PRODUCTS || [], context);
      } else {
        renderHomepageFeatured(window.__PRODUCTS || []);
      }
    });
  }
}

function wireMobileSearchToggle() {
  const toggle = document.querySelector('.mobile-search-toggle');
  const overlay = document.querySelector('.mobile-search-overlay');
  const input = overlay ? overlay.querySelector('input') : null;
  if (!toggle || !overlay) return;
  if (toggle.dataset.bound) return;
  toggle.dataset.bound = '1';
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const open = overlay.classList.toggle('is-open');
    if (open && input) {
      setTimeout(() => input.focus(), 50);
    }
  });
  // close on outside tap
  document.addEventListener('click', (e) => {
    if (!overlay.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      overlay.classList.remove('is-open');
    }
  });
}

async function init() {
  injectSearchUI();
  bindExistingSearchInputs();
  wireMobileSearchToggle();

  try {
    const products = await loadProducts();
    window.__PRODUCTS = products;

    const context = getPageContext();

    if (context.isProductTemplate) {
      applyProductTemplateData(products);
      return;
    }

    if (document.querySelector('.product-grid')) {
      injectCategoryToolbar(context);
      renderCategoryProducts(products, context);
    }

    renderHomepageFeatured(products);
  } catch (error) {
    console.warn(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
