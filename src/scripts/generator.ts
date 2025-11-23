import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine } from './template';
import { BlogPost, Project, normalizeTagSlug } from './content';

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  intro: string;
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

  generateHome(posts: BlogPost[], projects: Project[]): void {
    // Get recent posts (limit to 3)
    const recentPosts = [...posts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    const postsListHtml = recentPosts.map(post => {
      const postDate = new Date(post.date);
      const year = postDate.getFullYear();
      const month = String(postDate.getMonth() + 1).padStart(2, '0');
      const url = this.url(`/blog/${year}/${month}/${post.slug}/`);
      const dateFormatted = postDate.toISOString().split('T')[0];

      return `
        <article class="group">
          <div class="flex flex-col md:flex-row md:items-baseline gap-2 mb-1">
            <span class="text-dim text-xs">[${dateFormatted}]</span>
            <h3 class="text-lg font-bold inline-block">
              <a href="${url}" class="group-hover:bg-[#33ff00] group-hover:text-black transition-colors px-1 -ml-1 inline-block">${post.title}</a>
            </h3>
          </div>
          ${post.description ? `<p class="text-sm opacity-80 pl-0 md:pl-24 border-l-2 border-transparent group-hover:border-[#33ff00] transition-all">${post.description}</p>` : ''}
        </article>
      `;
    }).join('');

    // Get all projects
    const sortedProjects = [...projects].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.title.localeCompare(b.title);
    });

    const projectsListHtml = sortedProjects.map(project => {
      const statusBadge = project.order === 0 ? 'PUBLIC' : (project.demo ? 'BETA' : 'ARCHIVED');
      const projectTitle = project.title.toUpperCase().replace(/\s+/g, '_');

      return `
        <div class="border border-green p-6 hover:bg-dim transition-colors group">
          <div class="flex justify-between items-start gap-4 mb-4">
            <h3 class="text-xl font-bold group-hover:underline decoration-2 underline-offset-4 flex-1 min-w-0 truncate">
              <a href="${this.url(`/projects/${project.slug}/`)}" title="${projectTitle}">${projectTitle}</a>
            </h3>
            <span class="text-xs border border-green px-2 py-0.5 text-dim flex-shrink-0">${statusBadge}</span>
          </div>
          <p class="text-sm mb-6 leading-relaxed opacity-90">${project.description}</p>
          <div class="flex gap-3 text-xs text-dim font-mono flex-wrap">
            ${project.tags ? project.tags.map(tag => `<span>> ${tag.toUpperCase()}</span>`).join('') : ''}
          </div>
        </div>
      `;
    }).join('');

    const homeContent = this.templates.render('home', {
      site_name: this.config.siteName,
      intro: this.config.intro,
      base_path: this.config.basePath,
      projects_list: projectsListHtml,
      posts_list: postsListHtml
    });

    const html = this.templates.renderLayout(homeContent, {
      page_title: this.config.siteName,
      page_description: this.config.siteDescription,
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
    });

    this.writeFile(path.join(this.distDir, 'index.html'), html);
  }

  generateBlogPost(post: BlogPost): void {
    const postDate = new Date(post.date);
    const year = postDate.getFullYear();
    const month = String(postDate.getMonth() + 1).padStart(2, '0');

    const tagsHtml = post.tags && post.tags.length > 0
      ? '<div class="flex gap-3 text-xs text-dim font-mono">' +
        post.tags.map(tag => {
          const slug = normalizeTagSlug(tag);
          return `<a href="${this.url(`/tag/${slug}/`)}" class="px-2 py-0.5 border border-green">> ${tag}</a>`;
        }).join('') +
        '</div>'
      : '';

    const postContent = this.templates.render('blog-post', {
      title: post.title,
      date_iso: postDate.toISOString(),
      date_formatted: postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      tags_html: tagsHtml,
      content: post.content,
      base_path: this.config.basePath
    });

    const html = this.templates.renderLayout(postContent, {
      page_title: `${post.title} - ${this.config.siteName}`,
      page_description: post.description || post.title,
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
    });

    const outputPath = path.join(this.distDir, 'blog', String(year), month, post.slug, 'index.html');
    this.writeFile(outputPath, html);
  }

  generateBlogIndex(posts: BlogPost[]): void {
    const sortedPosts = [...posts].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const postsPerPage = 20;
    const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const pagePosts = sortedPosts.slice(start, end);

      const postsListHtml = pagePosts.map(post => {
        const postDate = new Date(post.date);
        const year = postDate.getFullYear();
        const month = String(postDate.getMonth() + 1).padStart(2, '0');
        const url = this.url(`/blog/${year}/${month}/${post.slug}/`);
        const dateFormatted = postDate.toISOString().split('T')[0];

        return `
          <article class="group">
            <div class="flex flex-col md:flex-row md:items-baseline gap-2 mb-1">
              <span class="text-dim text-xs">[${dateFormatted}]</span>
              <h3 class="text-lg font-bold inline-block">
                <a href="${url}" class="group-hover:bg-[#33ff00] group-hover:text-black transition-colors px-1 -ml-1 inline-block">${post.title}</a>
              </h3>
            </div>
            ${post.description ? `<p class="text-sm opacity-80 pl-0 md:pl-24 border-l-2 border-transparent group-hover:border-[#33ff00] transition-all">${post.description}</p>` : ''}
          </article>
        `;
      }).join('');

      let paginationHtml = '';
      if (totalPages > 1) {
        const links = [];
        if (page > 1) {
          const prevUrl = page === 2 ? this.url('/blog/') : this.url(`/blog/page/${page - 1}/`);
          links.push(`<a href="${prevUrl}" class="inline-block border border-green px-8 py-3 hover:bg-green-400 hover:text-black hover:font-bold transition-all uppercase tracking-widest text-sm">Previous</a>`);
        }
        if (page < totalPages) {
          links.push(`<a href="${this.url(`/blog/page/${page + 1}/`)}" class="inline-block border border-green px-8 py-3 hover:bg-green-400 hover:text-black hover:font-bold transition-all uppercase tracking-widest text-sm">Next</a>`);
        }
        paginationHtml = `<div class="flex gap-4 justify-center mt-12">${links.join('')}</div>`;
      }

      const indexContent = this.templates.render('blog-index', {
        posts_list: postsListHtml,
        pagination: paginationHtml,
        base_path: this.config.basePath
      });

      const html = this.templates.renderLayout(indexContent, {
        page_title: page === 1 ? `Blog - ${this.config.siteName}` : `Blog (Page ${page}) - ${this.config.siteName}`,
        page_description: 'Blog posts',
        site_name: this.config.siteName,
        current_year: new Date().getFullYear().toString(),
        base_path: this.config.basePath
      });

      const outputPath = page === 1
        ? path.join(this.distDir, 'blog', 'index.html')
        : path.join(this.distDir, 'blog', 'page', String(page), 'index.html');

      this.writeFile(outputPath, html);
    }
  }

  generateProject(project: Project): void {
    const tagsHtml = project.tags && project.tags.length > 0
      ? '<div class="flex gap-3 text-xs text-dim font-mono">' +
        project.tags.map(tag => {
          const slug = normalizeTagSlug(tag);
          return `<a href="${this.url(`/tag/${slug}/`)}" class="px-2 py-0.5 border border-green">> ${tag}</a>`;
        }).join('') +
        '</div>'
      : '';

    const demoLink = project.demo
      ? `<a href="${project.demo}" target="_blank" rel="noopener noreferrer" class="inline-block border border-green px-8 py-3 hover:bg-green-400 hover:text-black hover:font-bold transition-all uppercase tracking-widest text-sm text-center">View Demo</a>`
      : '';

    const projectContent = this.templates.render('project', {
      title: project.title,
      description: project.description,
      github: project.github,
      demo_link: demoLink,
      tags_html: tagsHtml,
      content: project.content,
      base_path: this.config.basePath
    });

    const html = this.templates.renderLayout(projectContent, {
      page_title: `${project.title} - ${this.config.siteName}`,
      page_description: project.description,
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
    });

    const outputPath = path.join(this.distDir, 'projects', project.slug, 'index.html');
    this.writeFile(outputPath, html);
  }

  generateProjectsIndex(projects: Project[]): void {
    const sortedProjects = [...projects].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.title.localeCompare(b.title);
    });

    const projectsListHtml = sortedProjects.map(project => {
      const statusBadge = project.order === 0 ? 'PUBLIC' : (project.demo ? 'BETA' : 'ARCHIVED');
      const projectTitle = project.title.toUpperCase().replace(/\s+/g, '_');

      return `
        <div class="border border-green p-6 hover:bg-dim transition-colors group">
          <div class="flex justify-between items-start gap-4 mb-4">
            <h3 class="text-xl font-bold group-hover:underline decoration-2 underline-offset-4 flex-1 min-w-0 truncate">
              <a href="${this.url(`/projects/${project.slug}/`)}" title="${projectTitle}">${projectTitle}</a>
            </h3>
            <span class="text-xs border border-green px-2 py-0.5 text-dim flex-shrink-0">${statusBadge}</span>
          </div>
          <p class="text-sm mb-6 leading-relaxed opacity-90">${project.description}</p>
          <div class="flex gap-3 text-xs text-dim font-mono flex-wrap">
            ${project.tags ? project.tags.map(tag => `<span>> ${tag.toUpperCase()}</span>`).join('') : ''}
          </div>
        </div>
      `;
    }).join('');

    const indexContent = this.templates.render('projects-index', {
      projects_list: projectsListHtml,
      base_path: this.config.basePath
    });

    const html = this.templates.renderLayout(indexContent, {
      page_title: `Projects - ${this.config.siteName}`,
      page_description: 'My projects',
      site_name: this.config.siteName,
      current_year: new Date().getFullYear().toString(),
      base_path: this.config.basePath
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
      const sortedPosts = [...data.posts].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      const sortedProjects = [...data.projects].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.title.localeCompare(b.title);
      });

      let postsSection = '';
      if (sortedPosts.length > 0) {
        const postsHtml = sortedPosts.map(post => {
          const postDate = new Date(post.date);
          const year = postDate.getFullYear();
          const month = String(postDate.getMonth() + 1).padStart(2, '0');
          const url = this.url(`/blog/${year}/${month}/${post.slug}/`);

          return `
            <article class="mb-4">
              <h3 class="text-lg font-semibold">
                <a href="${url}">${post.title}</a>
              </h3>
              <time datetime="${postDate.toISOString()}" class="text-gray-600 text-sm">
                ${postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </article>
          `;
        }).join('');

        postsSection = `
          <section class="mb-12">
            <h2 class="text-2xl font-bold mb-4">Blog Posts</h2>
            ${postsHtml}
          </section>
        `;
      }

      let projectsSection = '';
      if (sortedProjects.length > 0) {
        const projectsHtml = sortedProjects.map(project => {
          return `
            <article class="mb-4">
              <h3 class="text-lg font-semibold">
                <a href="${this.url(`/projects/${project.slug}/`)}">${project.title}</a>
              </h3>
              <p class="text-gray-700">${project.description}</p>
            </article>
          `;
        }).join('');

        projectsSection = `
          <section>
            <h2 class="text-2xl font-bold mb-4">Projects</h2>
            ${projectsHtml}
          </section>
        `;
      }

      const tagContent = this.templates.render('tag', {
        tag_name: data.displayName,
        posts_section: postsSection,
        projects_section: projectsSection
      });

      const html = this.templates.renderLayout(tagContent, {
        page_title: `${data.displayName} - ${this.config.siteName}`,
        page_description: `Posts and projects tagged with ${data.displayName}`,
        site_name: this.config.siteName,
        current_year: new Date().getFullYear().toString(),
        base_path: this.config.basePath
      });

      this.writeFile(path.join(this.distDir, 'tag', slug, 'index.html'), html);
    }
  }

  generateRSS(posts: BlogPost[]): void {
    const sortedPosts = [...posts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    const items = sortedPosts.map(post => {
      const postDate = new Date(post.date);
      const year = postDate.getFullYear();
      const month = String(postDate.getMonth() + 1).padStart(2, '0');
      const url = `${this.config.siteUrl}/blog/${year}/${month}/${post.slug}/`;

      return `
    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>${url}</link>
      <pubDate>${postDate.toUTCString()}</pubDate>
      <description>${this.escapeXml(post.description || post.title)}</description>
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
      const postDate = new Date(post.date);
      const year = postDate.getFullYear();
      const month = String(postDate.getMonth() + 1).padStart(2, '0');
      const url = `${this.config.siteUrl}/blog/${year}/${month}/${post.slug}/`;
      urls.push(this.sitemapUrl(url, postDate));
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
