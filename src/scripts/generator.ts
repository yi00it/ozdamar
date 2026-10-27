import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine } from './template';
import { BlogPost, Project, ShelfItem, Uses, UsesGroup, UsesItem, normalizeTagSlug } from './content';

const GITHUB_MARK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

// Installer sizes, as Windows shows them
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1048576)} MB`;
}

// A share card to render at build time: written to /og/<slug>.png
export interface OgCard {
  slug: string;
  title: string;
  kicker: string;
  icon?: string;
}

// The newest GitHub release of a downloadable project, fetched at build time
export interface Release {
  version: string;
  published: string;
  downloadUrl: string;
  size: number;
  sumsUrl?: string;
}

interface PageOptions {
  bodyClass?: string;
  og?: OgCard;
  headExtra?: string;
}

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  intro: string;
  introSub: string;
  basePath: string;
}

export class SiteGenerator {
  readonly ogCards: OgCard[] = [];

  constructor(
    private templates: TemplateEngine,
    private config: SiteConfig,
    private distDir: string
  ) {}

  private url(path: string): string {
    return `${this.config.basePath}${path}`;
  }

  private postPath(post: BlogPost): string {
    const postDate = new Date(post.date);
    const year = postDate.getFullYear();
    const month = String(postDate.getMonth() + 1).padStart(2, '0');
    return `/blog/${year}/${month}/${post.slug}/`;
  }

  private postUrl(post: BlogPost): string {
    return this.url(this.postPath(post));
  }

  private sortPosts(posts: BlogPost[]): BlogPost[] {
    return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private sortProjects(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  private formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Date(date).toLocaleDateString('en-US', options);
  }

  private postRow(post: BlogPost, withYear = true): string {
    const date = this.formatDate(post.date, withYear
      ? { year: 'numeric', month: 'short', day: 'numeric' }
      : { month: 'long', day: 'numeric' });
    return `
    <li>
      <a href="${this.postUrl(post)}" class="row row--text">
        <span class="row__title">${post.title}</span>
        <time class="row__desc" datetime="${new Date(post.date).toISOString()}">${date}</time>
      </a>
    </li>`;
  }

  // The breathing orange light, for whatever is being worked on now
  private statusDot(project: Project): string {
    return project.active ? '<span class="status-dot" role="img" aria-label="Active"></span>' : '';
  }

  private projectRow(project: Project, index: number): string {
    return `
    <li>
      <a href="${this.url(`/projects/${project.slug}/`)}" class="row row--icon">
        ${this.projectIcon(project)}
        <span class="row__title">${project.title}${this.statusDot(project)}</span>
        <span class="row__desc">${project.description}</span>
      </a>
    </li>`;
  }

  // Small app-style tile: the project's own icon, or its initial. The shared
  // transition name lets the tile grow into the project page's large icon.
  private projectIcon(project: Project, size: 'sm' | 'lg' = 'sm'): string {
    const morph = ` style="view-transition-name: icon-${project.slug}"`;
    if (project.icon) {
      return `<span class="icon icon--${size}"${morph} aria-hidden="true"><img src="${this.url(project.icon)}" alt="" width="64" height="64"></span>`;
    }
    return `<span class="icon icon--${size} icon--letter"${morph} aria-hidden="true">${project.title.charAt(0)}</span>`;
  }

  private miniPost(post: BlogPost): string {
    const date = this.formatDate(post.date, { year: 'numeric', month: 'short', day: 'numeric' });
    return `
        <li>
          <a href="${this.postUrl(post)}" class="mini__item">
            <span class="mini__title">${post.title}</span>
            <time class="mini__meta" datetime="${new Date(post.date).toISOString()}">${date}</time>
          </a>
        </li>`;
  }

  private miniProject(project: Project): string {
    return `
        <li>
          <a href="${this.url(`/projects/${project.slug}/`)}" class="mini__item mini__item--icon">
            ${this.projectIcon(project)}
            <span class="mini__title">${project.title}${this.statusDot(project)}</span>
            <span class="mini__meta">${project.description}</span>
          </a>
        </li>`;
  }

  private projectRows(projects: Project[]): string {
    return this.sortProjects(projects).map((project, i) => this.projectRow(project, i)).join('');
  }

  private filedUnder(tags: string[] | undefined): string {
    if (!tags || tags.length === 0) return '';
    const links = tags
      .map(tag => `<a href="${this.url(`/tag/${normalizeTagSlug(tag)}/`)}">${tag}</a>`)
      .join(', ');
    return `<p class="filed">Filed under ${links}</p>`;
  }

  private postsByYear(posts: BlogPost[]): string {
    const years = new Map<number, BlogPost[]>();
    for (const post of this.sortPosts(posts)) {
      const year = new Date(post.date).getFullYear();
      if (!years.has(year)) years.set(year, []);
      years.get(year)!.push(post);
    }
    return [...years]
      .map(([year, yearPosts]) => `
    <h2 class="year">${year}</h2>
    <ul class="list">${yearPosts.map(post => this.postRow(post, false)).join('')}
    </ul>`)
      .join('');
  }

  // Primary nav; the section a page belongs to is marked current
  private navLinks(pagePath: string): string {
    const sections = [
      { href: '/blog/', label: 'Writing', match: ['/blog/', '/tag/'] },
      { href: '/projects/', label: 'Projects', match: ['/projects/'] },
      { href: '/shelf/', label: 'Shelf', match: ['/shelf/'] },
      { href: '/uses/', label: 'Uses', match: ['/uses/'] }
    ];
    return sections.map(section => {
      const current = pagePath === section.href ? ' aria-current="page"'
        : section.match.some(prefix => pagePath.startsWith(prefix)) ? ' aria-current="true"' : '';
      return `<a href="${this.url(section.href)}"${current}>${section.label}</a>`;
    }).join('\n        ');
  }

  private page(content: string, title: string, description: string, pagePath: string, options: PageOptions = {}): string {
    const og = options.og ?? { slug: 'site', title: this.config.intro, kicker: this.config.siteName };
    if (!this.ogCards.some(card => card.slug === og.slug)) this.ogCards.push(og);
    return this.templates.renderLayout(content, {
      nav_links: this.navLinks(pagePath),
      body_class: options.bodyClass ?? '',
      head_extra: options.headExtra ?? '',
      og_image: `${this.config.siteUrl}/og/${og.slug}.png`,
      page_title: title,
      page_description: description,
      page_url: `${this.config.siteUrl}${pagePath}`,
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
    });
  }

  generateHome(posts: BlogPost[], projects: Project[]): void {
    // Now: the projects that carry the light
    const active = this.sortProjects(projects).filter(project => project.active);
    const now = active.length === 0 ? '' : `
  <p class="now"><span class="status-dot" aria-hidden="true"></span><span class="now__label">Now</span>${active
    .map(project => `<a href="${this.url(`/projects/${project.slug}/`)}">Building ${project.title} <span aria-hidden="true">→</span></a>`)
    .join('')}</p>`;

    const homeContent = this.templates.render('home', {
      intro: this.config.intro,
      intro_sub: this.config.introSub,
      now,
      base_path: this.config.basePath,
      posts_list: this.sortPosts(posts).slice(0, 3).map(post => this.miniPost(post)).join(''),
      projects_list: this.sortProjects(projects).slice(0, 3).map(project => this.miniProject(project)).join('')
    });

    const html = this.page(homeContent, this.config.siteName, this.config.siteDescription, '/', { bodyClass: 'is-home' });
    this.writeFile(path.join(this.distDir, 'index.html'), html);
  }

  generateBlogPost(post: BlogPost): void {
    const postDate = new Date(post.date);
    const words = post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

    const postContent = this.templates.render('blog-post', {
      title: post.title,
      date_iso: postDate.toISOString(),
      date_formatted: this.formatDate(post.date, { year: 'numeric', month: 'long', day: 'numeric' }),
      reading_time: `${Math.max(1, Math.round(words / 220))} min read`,
      tags_html: this.filedUnder(post.tags),
      content: post.content,
      base_path: this.config.basePath
    });

    const pagePath = this.postPath(post);
    const html = this.page(postContent, `${post.title} — ${this.config.siteName}`, post.description || post.title, pagePath, {
      bodyClass: 'is-post',
      og: { slug: `post-${post.slug}`, title: post.title, kicker: `Writing · ${this.formatDate(post.date, { year: 'numeric', month: 'long' })}` }
    });
    this.writeFile(path.join(this.distDir, pagePath, 'index.html'), html);
  }

  generateBlogIndex(posts: BlogPost[]): void {
    const sortedPosts = this.sortPosts(posts);
    const postsPerPage = 20;
    const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const pagePosts = sortedPosts.slice(start, start + postsPerPage);

      let paginationHtml = '';
      if (totalPages > 1) {
        const newer = page > 1
          ? `<a href="${page === 2 ? this.url('/blog/') : this.url(`/blog/page/${page - 1}/`)}">← Newer</a>`
          : '<span></span>';
        const older = page < totalPages
          ? `<a href="${this.url(`/blog/page/${page + 1}/`)}">Older →</a>`
          : '<span></span>';
        paginationHtml = `<nav class="pagination" aria-label="Pagination">${newer}${older}</nav>`;
      }

      const indexContent = this.templates.render('blog-index', {
        posts_by_year: this.postsByYear(pagePosts),
        pagination: paginationHtml
      });

      const pagePath = page === 1 ? '/blog/' : `/blog/page/${page}/`;
      const title = page === 1 ? `Writing — ${this.config.siteName}` : `Writing, page ${page} — ${this.config.siteName}`;
      const html = this.page(indexContent, title, `Writing by ${this.config.siteName}`, pagePath, {
        og: { slug: 'writing', title: 'Writing', kicker: this.config.siteName }
      });
      this.writeFile(path.join(this.distDir, pagePath, 'index.html'), html);
    }
  }

  generateProject(project: Project): void {
    const linkRow = (href: string, leading: string, label: string, meta: string, arrow = '↗') => `
    <li>
      <a href="${href}" class="link-row">
        ${leading}
        <span>${label}</span>
        <span class="link-row__meta">${meta} <span aria-hidden="true">${arrow}</span></span>
      </a>
    </li>`;
    const ring = '<span class="link-row__dot" aria-hidden="true"></span>';
    // A website on this site is the project's own download page
    const website = !project.website ? ''
      : project.website.startsWith('/')
        ? linkRow(this.url(project.website), ring, 'Download', `${this.config.siteUrl.replace(/^https?:\/\//, '')}${project.website.replace(/\/$/, '')}`, '→')
        : linkRow(project.website, ring, 'Website', project.website.replace(/^https?:\/\//, '').replace(/\/$/, ''));
    const links = [
      website,
      project.github ? linkRow(project.github, GITHUB_MARK, 'Source code', 'GitHub') : '',
      project.demo ? linkRow(project.demo, ring, 'Live demo', 'Open') : ''
    ].join('');
    const linkList = links ? `
  <ul class="links">${links}
  </ul>
` : '';

    const shot = project.image ? `
  <figure class="shot">
    <img src="${this.url(project.image)}" alt="${project.title}" width="2560" height="1600" loading="lazy" decoding="async">
  </figure>` : '';

    const projectContent = this.templates.render('project', {
      icon: this.projectIcon(project, 'lg'),
      title: project.title,
      description: project.description,
      shot,
      specs: this.specSheet(project.specs),
      links: linkList,
      tags_html: this.filedUnder(project.tags),
      content: project.content,
      base_path: this.config.basePath
    });

    const pagePath = `/projects/${project.slug}/`;
    const html = this.page(projectContent, `${project.title} — ${this.config.siteName}`, project.description, pagePath, {
      og: { slug: `project-${project.slug}`, title: project.title, kicker: project.description, icon: project.icon }
    });
    this.writeFile(path.join(this.distDir, pagePath, 'index.html'), html);
  }

  private specSheet(specs: [string, string][]): string {
    return specs.length === 0 ? '' : `
  <section class="specs" aria-labelledby="specs">
    <h2 class="label" id="specs">Tech specs</h2>
    <dl class="spec">${specs.map(([key, value]) => `
      <div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}
    </dl>
  </section>`;
  }

  // Whitebox's product page at /whitebox/: a standalone document with its own
  // stylesheet, outside the site layout. Without a release (offline build)
  // the buttons fall back to GitHub's latest-release page; whitebox.js
  // refreshes them from the GitHub API either way.
  generateWhitebox(project: Project, repo: string, release: Release | null): void {
    const version = release ? `Version ${release.version.replace(/^v/, '')}` : 'Latest release';
    const size = release ? formatSize(release.size) : '';
    const published = release ? this.formatDate(release.published, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const specs: [string, string][] = [
      ...(release ? [
        ['Version', `<span data-release-version>${release.version.replace(/^v/, '')}</span>`],
        ['Updated', `<span data-release-date>${published}</span>`]
      ] as [string, string][] : []),
      ...project.specs
    ];
    const downloadUrl = release?.downloadUrl ?? `https://github.com/${repo}/releases/latest`;
    const pageUrl = `${this.config.siteUrl}/whitebox/`;
    const title = 'Whitebox — free, open-source PC cleaner for Windows';
    const description = 'Whitebox is a free, open-source cleaner and performance toolkit for Windows 10 and 11. Clean junk, find large files and duplicates, manage startup apps. No ads, no accounts, no telemetry.';

    const og: OgCard = { slug: 'whitebox', title: 'Whitebox', kicker: 'Free, open-source cleaner for Windows.', icon: project.icon };
    if (!this.ogCards.some(card => card.slug === og.slug)) this.ogCards.push(og);

    // Lets search engines show it as an app: free, Windows, with a download
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Whitebox',
      description,
      url: pageUrl,
      image: `${this.config.siteUrl}/og/whitebox.png`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Windows 10, Windows 11',
      downloadUrl,
      ...(release ? { softwareVersion: release.version.replace(/^v/, '') } : {}),
      license: 'https://opensource.org/licenses/MIT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: this.config.siteName, url: this.config.siteUrl }
    };

    const html = this.templates.render('whitebox', {
      page_title: title,
      page_description: description,
      page_url: pageUrl,
      og_image: `${this.config.siteUrl}/og/${og.slug}.png`,
      json_ld: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      repo,
      download_url: downloadUrl,
      sums_url: release?.sumsUrl ?? `https://github.com/${repo}/releases/latest`,
      version,
      size,
      size_hidden: size ? '' : ' hidden',
      specs: specs.map(([key, value]) => `
        <div><dt>${key}</dt><dd>${value}</dd></div>`).join(''),
      github_mark: GITHUB_MARK,
      site_url: this.config.siteUrl,
      base_path: this.config.basePath
    });
    this.writeFile(path.join(this.distDir, 'whitebox', 'index.html'), html);
  }

  generateProjectsIndex(projects: Project[]): void {
    const indexContent = this.templates.render('projects-index', {
      projects_list: this.projectRows(projects)
    });

    const html = this.page(indexContent, `Projects — ${this.config.siteName}`, `Projects by ${this.config.siteName}`, '/projects/', {
      og: { slug: 'projects', title: 'Projects', kicker: 'Things I’m building.' }
    });
    this.writeFile(path.join(this.distDir, 'projects', 'index.html'), html);
  }

  generateTagPages(posts: BlogPost[], projects: Project[]): void {
    const tagMap = new Map<string, { posts: BlogPost[], projects: Project[], displayName: string }>();

    for (const post of posts) {
      if (post.tags) {
        for (const tag of post.tags) {
          const slug = normalizeTagSlug(tag);
          if (!tagMap.has(slug)) {
            tagMap.set(slug, { posts: [], projects: [], displayName: tag });
          }
          tagMap.get(slug)!.posts.push(post);
        }
      }
    }

    for (const project of projects) {
      if (project.tags) {
        for (const tag of project.tags) {
          const slug = normalizeTagSlug(tag);
          if (!tagMap.has(slug)) {
            tagMap.set(slug, { posts: [], projects: [], displayName: tag });
          }
          tagMap.get(slug)!.projects.push(project);
        }
      }
    }

    for (const [slug, data] of tagMap) {
      const postsSection = data.posts.length > 0
        ? `
<section class="block">
  <h2 class="label">Writing</h2>
  <ul class="list">${this.sortPosts(data.posts).map(post => this.postRow(post)).join('')}
  </ul>
</section>`
        : '';

      const projectsSection = data.projects.length > 0
        ? `
<section class="block">
  <h2 class="label">Projects</h2>
  <ul class="list">${this.projectRows(data.projects)}
  </ul>
</section>`
        : '';

      const tagContent = this.templates.render('tag', {
        tag_name: data.displayName,
        posts_section: postsSection,
        projects_section: projectsSection
      });

      const pagePath = `/tag/${slug}/`;
      const html = this.page(tagContent, `${data.displayName} — ${this.config.siteName}`, `Posts and projects tagged ${data.displayName}`, pagePath);
      this.writeFile(path.join(this.distDir, 'tag', slug, 'index.html'), html);
    }
  }

  // Five dots, filled in the accent colour; halves allowed
  private ratingDots(rating: number | undefined): string {
    if (rating === undefined) return '';
    const dots = [1, 2, 3, 4, 5].map(n => {
      const state = rating >= n ? ' is-full' : rating >= n - 0.5 ? ' is-half' : '';
      return `<span class="rating__dot${state}"></span>`;
    }).join('');
    return `<p class="rating" role="img" aria-label="Rated ${rating} out of 5">${dots}</p>`;
  }

  private sortShelf(items: ShelfItem[]): ShelfItem[] {
    return [...items].sort((a, b) => {
      if (a.finished && b.finished) return b.finished.localeCompare(a.finished);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title);
    });
  }

  private shelfRow(item: ShelfItem, kind: 'book' | 'movie'): string {
    const fullTitle = (item.subtitle ? `${item.title}: ${item.subtitle}` : item.title).replace(/"/g, '&quot;');
    const by = [item.creator, item.year].filter(Boolean).join(' · ');
    return `
    <li class="shelf-row">
      <span class="cover cover--${kind}"><img src="${this.url(item.cover)}" alt="" loading="lazy" width="66" height="100"></span>
      <div class="shelf-row__body">
        <h3 class="shelf-row__title" title="${fullTitle}">${item.title}</h3>
        <p class="shelf-row__by">${by}</p>
        ${item.comment ? `<p class="shelf-row__note">${item.comment}</p>` : ''}
      </div>
      ${this.ratingDots(item.rating)}
    </li>`;
  }

  // A Books | Movies style switch with one list per tab; works as plain sections without JS
  private tabbedLists(name: string, tabs: { id: string; label: string; count: number; body: string }[]): string {
    const shown = tabs.filter(tab => tab.count > 0);
    const buttons = shown.map((tab, i) => `
  <button type="button" role="tab" id="tab-${tab.id}" aria-controls="${name}-${tab.id}" aria-selected="${i === 0}" data-tab="${tab.id}"${i === 0 ? '' : ' tabindex="-1"'}>${tab.label} <span class="segmented__count">${tab.count}</span></button>`).join('');
    const panels = shown.map(tab => `
<section class="shelf-panel" id="${name}-${tab.id}" data-panel="${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}">
  <h2 class="label">${tab.label}</h2>${tab.body}
</section>`).join('');
    return `
<div class="segmented" role="tablist" aria-label="${name}" data-tabs hidden>${buttons}
</div>
${panels}`;
  }

  private list(rows: string[]): string {
    return `
  <ul class="shelf-list">${rows.join('')}
  </ul>`;
  }

  generateShelf(books: ShelfItem[], movies: ShelfItem[]): void {
    const content = this.templates.render('shelf', {
      lists: this.tabbedLists('shelf', [
        { id: 'books', label: 'Books', count: books.length, body: this.list(this.sortShelf(books).map(item => this.shelfRow(item, 'book'))) },
        { id: 'movies', label: 'Movies', count: movies.length, body: this.list(this.sortShelf(movies).map(item => this.shelfRow(item, 'movie'))) }
      ])
    });

    const html = this.page(content, `Shelf — ${this.config.siteName}`, `Books and movies, with ratings and a few words on each.`, '/shelf/', {
      og: { slug: 'shelf', title: 'Shelf', kicker: 'Books and films, with a few words on each.' }
    });
    this.writeFile(path.join(this.distDir, 'shelf', 'index.html'), html);
  }

  private usesRow(item: UsesItem): string {
    const icon = item.icon
      ? `<span class="icon icon--sm" aria-hidden="true"><img src="${this.url(`/icons/uses/${item.icon}.svg`)}" alt="" width="64" height="64"></span>`
      : `<span class="icon icon--sm icon--letter" aria-hidden="true">${item.name.charAt(0)}</span>`;
    return `
    <li class="shelf-row shelf-row--uses">
      ${icon}
      <div class="shelf-row__body">
        <h4 class="shelf-row__title">${item.name}</h4>
        ${item.note ? `<p class="shelf-row__note">${item.note}</p>` : ''}
      </div>
    </li>`;
  }

  private countUses(groups: UsesGroup[]): number {
    return groups.reduce((sum, group) => sum + group.items.length, 0);
  }

  private usesGroups(groups: UsesGroup[]): string {
    return groups.map(group => `
  <h3 class="group-label">${group.group}</h3>${this.list(group.items.map(item => this.usesRow(item)))}`).join('');
  }

  generateUses(uses: Uses): void {
    const content = this.templates.render('uses', {
      description: uses.description,
      lists: this.tabbedLists('uses', [
        { id: 'hardware', label: 'Hardware', count: this.countUses(uses.hardware), body: this.usesGroups(uses.hardware) },
        { id: 'software', label: 'Software', count: this.countUses(uses.software), body: this.usesGroups(uses.software) }
      ])
    });

    const html = this.page(content, `Uses — ${this.config.siteName}`, uses.description, '/uses/', {
      og: { slug: 'uses', title: 'Uses', kicker: uses.description }
    });
    this.writeFile(path.join(this.distDir, 'uses', 'index.html'), html);
  }

  // GitHub Pages serves this for any missing path
  generateNotFound(): void {
    const content = this.templates.render('404', { base_path: this.config.basePath });
    const html = this.page(content, `Not found — ${this.config.siteName}`, 'This page doesn’t exist.', '/404.html', {
      headExtra: '\n  <meta name="robots" content="noindex">'
    });
    this.writeFile(path.join(this.distDir, '404.html'), html);
  }

  generateRSS(posts: BlogPost[]): void {
    const items = this.sortPosts(posts).slice(0, 20).map(post => {
      const url = `${this.config.siteUrl}${this.postPath(post)}`;
      return `
    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${this.escapeXml(post.content)}</description>
    </item>`;
    }).join('');

    const rss = this.templates.render('rss', {
      site_name: this.config.siteName,
      site_url: this.config.siteUrl,
      site_description: this.config.siteDescription,
      build_date: new Date().toUTCString(),
      items
    });

    this.writeFile(path.join(this.distDir, 'feed.xml'), rss);
  }

  generateSitemap(posts: BlogPost[], projects: Project[], extraPaths: string[] = []): void {
    const urls: string[] = [];

    // Home
    urls.push(this.sitemapUrl(this.config.siteUrl, new Date()));

    // Blog index
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/blog/`, new Date()));

    // Blog posts
    for (const post of posts) {
      urls.push(this.sitemapUrl(`${this.config.siteUrl}${this.postPath(post)}`, new Date(post.date)));
    }

    // Projects index, shelf and uses
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/projects/`, new Date()));
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/shelf/`, new Date()));
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/uses/`, new Date()));
    for (const extra of extraPaths) {
      urls.push(this.sitemapUrl(`${this.config.siteUrl}${extra}`, new Date()));
    }

    // Projects
    for (const project of projects) {
      const url = `${this.config.siteUrl}/projects/${project.slug}/`;
      urls.push(this.sitemapUrl(url, new Date()));
    }

    // Tags
    const tags = new Set<string>();
    for (const post of posts) {
      if (post.tags) {
        post.tags.forEach(tag => tags.add(normalizeTagSlug(tag)));
      }
    }
    for (const project of projects) {
      if (project.tags) {
        project.tags.forEach(tag => tags.add(normalizeTagSlug(tag)));
      }
    }

    for (const tag of tags) {
      const url = `${this.config.siteUrl}/tag/${tag}/`;
      urls.push(this.sitemapUrl(url, new Date()));
    }

    const sitemap = this.templates.render('sitemap', {
      urls: urls.join('\n')
    });

    this.writeFile(path.join(this.distDir, 'sitemap.xml'), sitemap);
  }

  private sitemapUrl(loc: string, lastmod: Date): string {
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>
  </url>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
