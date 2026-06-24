# Hermes Product Schema

This schema remains the canonical input shape for the static product publishing pipeline.

This document defines the product data structure Hermes must generate for The Find Drop affiliate landing pages.

## Purpose

Hermes should provide a single product object in the structure below. The existing generator reads that object and creates a standalone static landing page at:

- /p/{slug}/index.html

The generator uses the current product template and does not require any manual HTML edits.

## Required Fields

These fields must be present for every product.

- slug: URL-safe unique identifier for the product.
- title: Product display name.
- category: Product category name.
- seller: Seller or brand name.
- affiliateUrl: Affiliate destination URL.
- tiktokUrl: TikTok Shop or TikTok-related destination URL.

## Optional Fields

These fields may be omitted or left empty. The generator will skip them automatically when no usable content is present.

- heroImage: Primary hero image URL.
- galleryImages: Array of image URLs for the gallery section.
- videos: Array of video references or URLs.
- reviewImages: Array of review image URLs.
- reviewVideos: Array of review video references or URLs.
- benefits: Array of benefit objects.
- features: Array of feature objects.
- specifications: Array of specification objects.
- faq: Array of FAQ objects.
- relatedProducts: Array of related product objects.
- badges: Array of trust or quality badge strings.
- ctaText: Custom CTA label for the primary and final CTA buttons.
- featured: Boolean used for homepage featured product selection.
- dateAdded: Date string used for sorting by recency.

## Field Structure

### Required object shape

```json
{
  "slug": "product-slug",
  "title": "Product Name",
  "category": "Category",
  "seller": "Seller Name",
  "affiliateUrl": "https://example.com/affiliate",
  "tiktokUrl": "https://www.tiktok.com/"
}
```

### Optional arrays

Each array should contain simple values or objects.

#### galleryImages

```json
"galleryImages": [
  "https://example.com/image-1.jpg",
  "https://example.com/image-2.jpg"
]
```

#### videos

```json
"videos": [
  "https://example.com/video-1.mp4"
]
```

#### benefits / features / specifications

Each item may be either a plain string or an object with title and text.

```json
"benefits": [
  {
    "title": "Premium finish",
    "text": "Designed to feel considered and easy to keep in daily use."
  }
]
```

#### faq

Each FAQ item should include a question and answer.

```json
"faq": [
  {
    "question": "Is this worth it?",
    "answer": "Yes, especially for readers looking for a polished everyday option."
  }
]
```

#### relatedProducts

Each related product should include a title and description.

```json
"relatedProducts": [
  {
    "title": "Related Product",
    "description": "A complementary option for the same audience."
  }
]
```

#### badges

```json
"badges": [
  "Trusted by our audience",
  "TikTok Shop ready"
]
```

## How the Generator Uses Every Field

- slug
  - Used to create the output directory under /p/{slug}/.
  - Also used as the generated page URL.

- title
  - Used in the page title and hero heading.
  - Used as alt text for generated images where applicable.

- category
  - Used in the eyebrow and related-products heading.

- seller
  - Used in the hero metadata area.

- affiliateUrl
  - Used as the fallback destination for primary CTA links.

- tiktokUrl
  - Used as the primary CTA destination when provided.
  - Also controls the TikTok Shop indicator badge.

- heroImage
  - Used for the main product image in the hero and primary gallery section.

- galleryImages
  - Rendered as additional gallery cards when present.

- videos
  - Rendered as additional content cards when present.

- reviewImages
  - Rendered in the reviews section when present.

- reviewVideos
  - Rendered in the reviews section when present.

- benefits
  - Rendered as benefit cards when present.

- features
  - Rendered as benefit cards when present.

- specifications
  - Rendered as benefit cards when present.

- faq
  - Rendered as FAQ accordion items when present.

- relatedProducts
  - Rendered as related-product cards when present.

- badges
  - Rendered as small trust or quality badges near the CTA area.

- ctaText
  - Replaces the default CTA label when present.

- featured
  - Used by the homepage product feed logic when present.

- dateAdded
  - Used for recency-based sorting when present.

## Empty Value Handling

Hermes should skip empty values.

The generator will not render:

- empty strings
- empty arrays
- null values
- undefined values

Examples:

- If faq is empty, the FAQ section is not rendered.
- If galleryImages is empty, no gallery cards are created.
- If tiktokUrl is missing, the TikTok Shop badge is not shown.
- If ctaText is missing, the default CTA text is used.

## Automatic Affiliate Disclosure

Every generated landing page automatically includes this disclosure beneath the primary CTA and the final CTA:

"As a TikTok Shop affiliate, The Find Drop may earn a commission from qualifying purchases made through links on this page."

Hermes does not need to add this manually. The generator inserts it automatically.

## Complete Single-Product JSON Example

```json
{
  "slug": "portable-blender",
  "title": "Portable Blender",
  "category": "Kitchen",
  "seller": "Blend Studio",
  "affiliateUrl": "https://example.com/affiliate/portable-blender",
  "tiktokUrl": "https://www.tiktok.com/",
  "heroImage": "https://example.com/images/portable-blender-hero.jpg",
  "galleryImages": [
    "https://example.com/images/portable-blender-1.jpg",
    "https://example.com/images/portable-blender-2.jpg"
  ],
  "videos": [
    "https://example.com/videos/portable-blender-demo.mp4"
  ],
  "reviewImages": [
    "https://example.com/images/portable-blender-review.jpg"
  ],
  "reviewVideos": [],
  "benefits": [
    {
      "title": "Portable by design",
      "text": "Compact enough for daily routines and travel."
    },
    {
      "title": "Smooth results",
      "text": "Delivers a clean blend with minimal effort."
    }
  ],
  "features": [
    {
      "title": "Rechargeable power",
      "text": "Built for quick prep without the hassle of cords."
    }
  ],
  "specifications": [
    {
      "title": "Capacity",
      "text": "500ml"
    }
  ],
  "faq": [
    {
      "question": "Is it travel-friendly?",
      "answer": "Yes. It is compact and easy to carry."
    }
  ],
  "relatedProducts": [
    {
      "title": "Travel Mug",
      "description": "A compact companion for your daily routine."
    }
  ],
  "badges": [
    "Trusted by our audience",
    "TikTok Shop ready"
  ],
  "ctaText": "View on TikTok Shop",
  "featured": true,
  "dateAdded": "2026-06-24"
}
```

## How Hermes Should Generate a Complete Landing Page

1. Create or update one product object in products.json.
2. Ensure the required fields are present.
3. Include only the optional fields that contain usable data.
4. Run the generator.
5. The generator will create a standalone static page at /p/{slug}/index.html.

The output page will include:

- a hero section
- optional benefits/features/specifications cards
- optional gallery and video content
- optional reviews
- optional FAQ
- optional related products
- automatic affiliate disclosure
- optional TikTok Shop badge and CTA
