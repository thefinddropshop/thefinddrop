const CATEGORY_MAP = {
  tech: 'Tech',
  creative: 'Creative',
  home: 'Home',
  kitchen: 'Kitchen',
  bath: 'Bath',
  clothing: 'Clothing',
  wellness: 'Wellness'
};

const state = {
  search: '',
  sort: 'featured'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const response = await fetch('/data/products.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load product data');
  }
  return response.json();
}

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.innerHTML = `
    <a class="product-card-link" href="${product.tiktokURL || `/p/${product.slug}/`}" aria-label="View ${escapeHtml(product.title)}">
      <div class="product-media">
        <img src="${product.thumbnail || product.heroImage}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" srcset="${product.thumbnail || product.heroImage} 600w, ${product.heroImage || product.thumbnail} 1200w" sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 25vw">
      </div>
      <div class="product-info">
        <div class="product-meta">${escapeHtml(product.category)} • ${product.featured ? 'Featured' : 'New'}</div>
        <h3>${escapeHtml(product.title)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-footer">
          <div class="rating">★★★★★ ${product.rating}</div>
          <span class="text-link">View Product</span>
        </div>
      </div>
    </a>
  `;
  return article;
}

function getFilteredProducts(products, context) {
  let filtered = products;

  if (context.category) {
    filtered = filtered.filter((product) => product.category.toLowerCase() === context.category.toLowerCase());
  }

  if (state.search.trim()) {
    const query = state.search.trim().toLowerCase();
    filtered = filtered.filter((product) => {
      return product.title.toLowerCase().includes(query) || product.category.toLowerCase().includes(query);
    });
  }

  if (state.sort === 'az') {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sort === 'newest') {
    filtered = [...filtered].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  } else if (state.sort === 'featured') {
    filtered = [...filtered].sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  return filtered;
}

function renderCategoryProducts(products, context) {
  const container = document.querySelector('.product-grid');
  if (!container) {
    return;
  }

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
  resultsContainer.innerHTML = '';
  resultsContainer.classList.remove('is-visible');

  if (!query) {
    return;
  }

  const matches = products.filter((product) => {
    return product.title.toLowerCase().includes(query) || product.category.toLowerCase().includes(query);
  }).slice(0, 6);

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
    link.href = product.tiktokURL || `/p/${product.slug}/`;
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
    PRODUCT_HOOK: product.description,
    RATING: product.rating,
    SELLER: product.seller,
    TIKTOK_URL: product.tiktokURL,
    HERO_IMAGE: product.heroImage,
    GALLERY: '',
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
}

async function init() {
  injectSearchUI();

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
