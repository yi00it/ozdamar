# ozdamar

A custom static site generator built with TypeScript for personal websites and blogs.

## Features

- 📝 Blog system with pagination (20 posts per page)
- 🚀 Projects showcase
- 🏷️ Tag system for organizing content
- 📡 RSS feed generation
- 🗺️ Automatic sitemap generation
- 🎨 Tailwind CSS integration
- ⚡ Fast static site generation
- 🔄 GitHub Pages deployment via GitHub Actions

## Technology Stack

- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **Tailwind CSS** - Utility-first CSS framework
- **Marked** - Markdown parser
- **Gray Matter** - YAML frontmatter parser

## Getting Started

### Prerequisites

- Node.js (LTS or latest stable)
- npm

### Installation

```bash
npm install
```

### Development

Build the site:

```bash
npm run build
```

The generated site will be in the `dist/` directory.

## Project Structure

```
/
├── content/           # Content files
│   ├── posts/        # Blog posts (Markdown)
│   └── projects/     # Project pages (Markdown)
├── src/
│   ├── templates/    # HTML templates
│   ├── scripts/      # Build scripts
│   └── build.ts      # Main build script
├── public/           # Static assets
├── dist/             # Generated site (git-ignored)
└── .github/
    └── workflows/    # GitHub Actions
```

## Content Format

### Blog Posts

Blog posts go in `content/posts/` with YAML frontmatter:

```markdown
---
title: Post Title
date: 2024-01-15
slug: post-slug
tags: [tag1, tag2]
description: Post description
---

Post content in Markdown...
```

### Projects

Projects go in `content/projects/` with YAML frontmatter:

```markdown
---
title: Project Title
slug: project-slug
description: Project description
github: https://github.com/username/repo
tags: [tag1, tag2]
demo: https://demo-url.com (optional)
order: 1 (optional)
---

Project details in Markdown...
```

## URL Structure

- Home: `/`
- Blog index: `/blog/`
- Blog post: `/blog/YYYY/MM/slug/`
- Blog pagination: `/blog/page/N/`
- Projects index: `/projects/`
- Project: `/projects/slug/`
- Tag: `/tag/tag-slug/`
- RSS feed: `/feed.xml`
- Sitemap: `/sitemap.xml`

## Deployment

The site automatically deploys to GitHub Pages when you push to the `main` branch. The GitHub Actions workflow handles:

1. Installing dependencies
2. Building the site
3. Deploying to GitHub Pages

## License

MIT
