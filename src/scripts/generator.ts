import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine } from './template';
import { BlogPost, Project, normalizeTagSlug } from './content';

const GITHUB_MARK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  intro: string;
  introSub: string;
  basePath: string;
}

export class SiteGenerator {
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

  private projectRow(project: Project, index: number): string {
    return `
    <li>
      <a href="${this.url(`/projects/${project.slug}/`)}" class="row row--icon">
        ${this.projectIcon(project)}
        <span class="row__title">${project.title}</span>
        <span class="row__desc">${project.description}</span>
      </a>
    </li>`;
  }

  // Small app-style tile: the project's own icon, or its initial
  private projectIcon(project: Project, size: 'sm' | 'lg' = 'sm'): string {
    if (project.icon) {
      return `<span class="icon icon--${size}" aria-hidden="true"><img src="${this.url(project.icon)}" alt="" width="64" height="64"></span>`;
    }
    return `<span class="icon icon--${size} icon--letter" aria-hidden="true">${project.title.charAt(0)}</span>`;
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
            <span class="mini__title">${project.title}</span>
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

  private page(content: string, title: string, description: string, pagePath: string, bodyClass = ''): string {
    return this.templates.renderLayout(content, {
      body_class: bodyClass,
      page_title: title,
      page_description: description,
      page_url: `${this.config.siteUrl}${pagePath}`,
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
    });
  }

  generateHome(posts: BlogPost[], projects: Project[]): void {
    const homeContent = this.templates.render('home', {
      intro: this.config.intro,
      intro_sub: this.config.introSub,
      base_path: this.config.basePath,
      posts_list: this.sortPosts(posts).slice(0, 3).map(post => this.miniPost(post)).join(''),
      projects_list: this.sortProjects(projects).slice(0, 3).map(project => this.miniProject(project)).join('')
    });

    const html = this.page(homeContent, this.config.siteName, this.config.siteDescription, '/', 'is-home');
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
    const html = this.page(postContent, `${post.title} — ${this.config.siteName}`, post.description || post.title, pagePath);
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
      const html = this.page(indexContent, title, `Writing by ${this.config.siteName}`, pagePath);
      this.writeFile(path.join(this.distDir, pagePath, 'index.html'), html);
    }
  }

  generateProject(project: Project): void {
    const linkRow = (href: string, leading: string, label: string, meta: string) => `
    <li>
      <a href="${href}" class="link-row">
        ${leading}
        <span>${label}</span>
        <span class="link-row__meta">${meta} <span aria-hidden="true">↗</span></span>
      </a>
    </li>`;
    const ring = '<span class="link-row__dot" aria-hidden="true"></span>';
    const links = [
      project.website ? linkRow(project.website, ring, 'Website', project.website.replace(/^https?:\/\//, '').replace(/\/$/, '')) : '',
      project.github ? linkRow(project.github, GITHUB_MARK, 'Source code', 'GitHub') : '',
      project.demo ? linkRow(project.demo, ring, 'Live demo', 'Open') : ''
    ].join('');

    const projectContent = this.templates.render('project', {
      icon: this.projectIcon(project, 'lg'),
      title: project.title,
      description: project.description,
      links,
      tags_html: this.filedUnder(project.tags),
      content: project.content,
      base_path: this.config.basePath
    });

    const pagePath = `/projects/${project.slug}/`;
    const html = this.page(projectContent, `${project.title} — ${this.config.siteName}`, project.description, pagePath);
    this.writeFile(path.join(this.distDir, pagePath, 'index.html'), html);
  }

  generateProjectsIndex(projects: Project[]): void {
    const indexContent = this.templates.render('projects-index', {
      projects_list: this.projectRows(projects)
    });

    const html = this.page(indexContent, `Projects — ${this.config.siteName}`, `Projects by ${this.config.siteName}`, '/projects/');
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

  generateSitemap(posts: BlogPost[], projects: Project[]): void {
    const urls: string[] = [];

    // Home
    urls.push(this.sitemapUrl(this.config.siteUrl, new Date()));

    // Blog index
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/blog/`, new Date()));

    // Blog posts
    for (const post of posts) {
      urls.push(this.sitemapUrl(`${this.config.siteUrl}${this.postPath(post)}`, new Date(post.date)));
    }

    // Projects index
    urls.push(this.sitemapUrl(`${this.config.siteUrl}/projects/`, new Date()));

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
