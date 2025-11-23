---
title: Custom Static Site Generator
slug: static-site-generator
description: A TypeScript-based static site generator for personal websites
github: https://github.com/yi00it/ozdamar
tags: [typescript, static-site, web-development]
order: 1
---

# Custom Static Site Generator

This project is a custom static site generator built with TypeScript. It powers this very website!

## Features

- Markdown content with YAML frontmatter
- Blog with pagination
- Projects showcase
- Tag system
- RSS feed
- Sitemap generation
- Tailwind CSS integration

## Technology Stack

- TypeScript
- Node.js
- Tailwind CSS
- Marked (Markdown parser)
- Gray Matter (frontmatter parser)

## How It Works

The generator reads Markdown files from the `content` directory, processes them using templates, and outputs static HTML files to the `dist` directory. The entire site is then deployed to GitHub Pages via GitHub Actions.
