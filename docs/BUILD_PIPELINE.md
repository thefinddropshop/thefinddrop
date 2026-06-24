# Build Pipeline

## Overview
The publishing workflow is built around a static generator that reads product data from data/products.json and produces standalone landing pages in p/.

## Core Files
- data/products.json: Canonical product source of truth.
- scripts/generate-product-pages.js: Generator, validation, logging, manifest output, and future publishing hooks.
- templates/product-template.html: Reusable HTML template for generated landing pages.
- build/build-manifest.json: Machine-readable build inventory for Hermes.
- logs/build.log: Append-only build execution log.

## Validation Rules
Before a product is generated the script verifies:
- required fields exist
- slug is unique
- category exists
- hero image exists
- affiliate URL exists
- gallery images, videos, and review assets exist when present

Products that fail validation are skipped and logged with the reason for the failure.

## Asset Handling
The generator checks for hero.webp, gallery images, videos, and review media before generating a page. Missing assets are skipped automatically so the output never references broken files.

## Manifest Output
Every generation run updates build/build-manifest.json with one entry per product containing:
- slug
- title
- category
- generatedDate
- htmlPath
- heroImage
- galleryCount
- videoCount
- reviewCount
- status

## Logging
Every generation run appends a summary entry to logs/build.log with timestamps, product name, generated HTML path, warnings, errors, and success state.

## Future Hermes Workflow
The generator includes placeholder functions for future deployment hooks:
- publishToGithub()
- publishToGitHubPages()
- publishToCloudflare()

These hooks are intentionally empty and do not perform publishing yet.
