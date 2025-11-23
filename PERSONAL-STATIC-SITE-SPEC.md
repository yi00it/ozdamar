# PERSONAL-STATIC-SITE-SPEC.md

Author: System  
Audience: Autonomous AI coding agent  
Purpose: Implement a complete static personal website system as specified in this document.  
Language: TypeScript (Node.js)  
Hosting: GitHub Pages with GitHub Actions build pipeline  

---

## 0. OPERATING MODE

1. The agent MUST treat this document as the single source of truth.
2. The agent MUST NOT ask the user any follow-up questions.
3. The agent MUST resolve all decisions using the rules and defaults defined here.
4. Where ambiguity might exist, the agent MUST choose the simplest option that is consistent with this spec.
5. The agent MUST implement a working system end-to-end:
   - Local development
   - Static generation
   - Tailwind integration
   - GitHub Actions deployment to GitHub Pages

---

## 1. HIGH-LEVEL GOALS

1. Build a static personal website with the following sections:
   - Home
   - Blog
   - Projects
2. Website MUST be generated from Markdown content using a custom TypeScript static site generator.
3. Output MUST be static HTML, CSS, and static assets only (no runtime backend).
4. Deployment MUST be to GitHub Pages via GitHub Actions.
5. The system MUST be minimal, fast, and maintainable with a clear directory structure.

---

## 2. TECHNOLOGY STACK

1. Runtime: Node.js (LTS or latest stable).
2. Language: TypeScript.
3. Package manager: npm.
4. CSS framework: Tailwind CSS.
5. Markdown parsing: Any robust Node.js Markdown parser (e.g. `marked`, `remark`) is allowed.
6. Frontmatter parsing: Any YAML frontmatter parser (e.g. `gray-matter`) is allowed.
7. Template engine: None. Use plain HTML files with `{{placeholder}}` replacement logic implemented in TypeScript.
8. No client-side search functionality is allowed.
9. No runtime frameworks (React/Vue/etc.) are allowed for page rendering. Only static HTML is permitted.

---

## 3. REPOSITORY LAYOUT

The repository root MUST contain at least the following files and directories:

```text
/ (repository root)
  /content
    /posts
    /projects
  /src
    /templates
    /scripts
    build.ts
  /public
  /dist
  package.json
  tsconfig.json
  tailwind.config.js
  postcss.config.js
  .gitignore
  .editorconfig
  .github/
    /workflows
      deploy.yml
  README.md
```

### 3.1 `/content` directory

1. `content` MUST contain:
   - `content/posts` for all blog posts.
   - `content/projects` for all project pages.
2. All content files MUST be Markdown files with `.md` extension.
3. Each Markdown file MUST contain valid YAML frontmatter at the top.

### 3.2 `/src` directory

1. `src` MUST contain:
   - `src/build.ts` — main entry point for the static site generator.
   - `src/templates/` — all HTML template files.
   - `src/scripts/` — reusable TypeScript modules.

### 3.3 `/public` directory

1. Contains static assets copied directly to `/dist`.

### 3.4 `/dist` directory

1. MUST NOT be committed to Git.
2. MUST contain final generated static site.

---

## 4. CONTENT MODEL

### 4.1 Blog Post Frontmatter

- `title`: string  
- `date`: string  
- `slug`: string  
- `tags`: array (optional)  
- `description`: string (optional)

### 4.2 Project Frontmatter

- `title`: string  
- `slug`: string  
- `description`: string  
- `github`: string  
- `tags`: array (optional)  
- `demo`: string (optional)  
- `order`: number (optional)

---

## 5. URL STRUCTURE

### 5.1 Blog posts

`/blog/YYYY/MM/slug/` → `dist/blog/YYYY/MM/slug/index.html`

### 5.2 Blog index

Pagination: 20 posts per page.

- Page 1: `/blog/`
- Page N: `/blog/page/N/`

### 5.3 Projects

`/projects/slug/` → `dist/projects/slug/index.html`

### 5.4 Projects index

`/projects/` → `dist/projects/index.html`

### 5.5 Tags

`/tag/<tag-slug>/` → `dist/tag/<tag-slug>/index.html`

### 5.6 Home

`/` → `dist/index.html`

---

## 6. TEMPLATE SYSTEM

### Required template files

```
src/templates/layout.html
src/templates/home.html
src/templates/blog-index.html
src/templates/blog-post.html
src/templates/projects-index.html
src/templates/project.html
src/templates/tag.html
src/templates/rss.xml
src/templates/sitemap.xml
```

### Placeholder rules

- Syntax: `{{placeholder}}`
- Lowercase, underscores only.
- MUST be replaced by deterministic string replacement.

---

## 7. HOME PAGE REQUIREMENTS

1. Ultra-minimal.
2. MUST include:
   - Name
   - Short intro
   - Link to `/blog/`
   - Link to `/projects/`
3. MUST use `layout.html`.

---

## 8. BLOG SYSTEM

### Blog Post Generation

1. Parse Markdown & frontmatter.
2. Convert Markdown to HTML.
3. Wrap using `blog-post.html`.
4. MUST output to `dist/blog/YYYY/MM/slug/index.html`.
5. MUST include:
   - Title
   - Date
   - Content
   - Tags (linked to tag pages)

### Blog Index

1. Build list of posts sorted by date DESC.
2. Paginate into 20 posts per page.
3. Output pages:
   - `dist/blog/index.html`
   - `dist/blog/page/N/index.html`
4. Each page MUST show:
   - Title
   - Date
   - Link to post

---

## 9. PROJECTS SYSTEM

### Project Page Generation

1. Parse Markdown & frontmatter.
2. Convert Markdown to HTML.
3. Wrap using `project.html`.
4. Output to `dist/projects/slug/index.html`.

### Projects Index

1. List all projects.
2. Sort by:
   - `order` ascending (if exists)
   - else `title` ascending
3. Output to `dist/projects/index.html`.

Each item MUST show:
- Title (linked)
- Description
- GitHub link
- Demo link (if exists)

---

## 10. TAG SYSTEM

1. Collect tags from posts and projects.
2. Normalize tag slugs:
   - lowercase
   - spaces → hyphens
3. For each tag:
   - Generate `dist/tag/<tag-slug>/index.html`
4. Tag page MUST include:
   - Posts with tag (date DESC)
   - Projects with tag (`order`, then title)

---

## 11. RSS FEED

1. Write RSS feed to `dist/feed.xml`.
2. Include:
   - Site metadata
   - Recent blog posts
3. For each post:
   - Title
   - Link
   - Date
   - Description

---

## 12. SITEMAP

1. Write sitemap to `dist/sitemap.xml`.
2. MUST include:
   - Home
   - Blog index & all pages
   - All blog posts
   - Projects index
   - All projects
   - All tag pages

---

## 13. TAILWIND REQUIREMENTS

1. Tailwind MUST be installed.
2. Processed CSS MUST output to `dist/assets/main.css`.
3. Templates MUST reference the generated stylesheet via `<link>` tag.

---

## 14. BUILD PROCESS (`src/build.ts`)

`build.ts` MUST:

1. Clean/create `dist/`.
2. Copy `public/` → `dist/`.
3. Build Tailwind CSS.
4. Load all templates.
5. Parse content.
6. Generate:
   - Home page
   - Blog posts
   - Blog index (paginated)
   - Projects index
   - Project pages
   - Tag pages
   - RSS feed
   - Sitemap
7. Fail on:
   - Missing required frontmatter
   - Duplicate slugs
8. MUST be deterministic.

---

## 15. GITHUB ACTIONS DEPLOYMENT

Workflow MUST exist at:

```
.github/workflows/deploy.yml
```

Workflow MUST:

1. Trigger on push to `main`.
2. Install Node.
3. Install dependencies.
4. Run `npm run build`.
5. Deploy `/dist` to GitHub Pages using:
   - `actions/upload-pages-artifact`
   - `actions/deploy-pages`

---

## 16. PACKAGE SCRIPTS

`package.json` MUST include:

```
"scripts": {
  "build": "ts-node src/build.ts",
  "dev": "ts-node src/build.ts --watch"
}
```

(or equivalent implementation)

---

## 17. ENCODING & I18N

1. All files MUST be UTF-8.
2. Generated HTML MUST include `<meta charset="utf-8">`.

---

## 18. ERROR HANDLING

1. Missing required fields MUST fail build.
2. Duplicate slugs MUST fail build.
3. Missing optional fields MUST NOT fail build.

---

## 19. EXTENSIBILITY

1. System MUST allow future:
   - Demo pages
   - Search
   - Additional static pages

---

## 20. AGENT CONSTRAINTS

1. MUST fully implement this spec.
2. MUST NOT ask user questions.
3. MUST NOT change file names or structure.
4. MUST keep implementation deterministic.

---

## 21. ACCEPTANCE CRITERIA

A build is valid when:

1. `npm run build` produces:
   - Home page
   - Blog system (posts + pagination)
   - Projects system
   - Tags system
   - RSS feed
   - Sitemap
   - Tailwind CSS
   - Copied public assets
2. GitHub Action deploys successfully.
3. All URLs resolve to HTML.
4. RSS parses correctly.
5. Sitemap is valid.

---

**End of specification.**
