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

  generateHome(): void {
    const homeContent = this.templates.render('home', {
      site_name: this.config.siteName,
      intro: this.config.intro,
      base_path: this.config.basePath
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
      ? '<div class="flex gap-2 flex-wrap">' +
        post.tags.map(tag => {
          const slug = normalizeTagSlug(tag);
          return `<a href="${this.url(`/tag/${slug}/`)}" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">${tag}</a>`;
        }).join('') +
        '</div>'
      : '';

    const postContent = this.templates.render('blog-post', {
      title: post.title,
      date_iso: postDate.toISOString(),
      date_formatted: postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      tags_html: tagsHtml,
      content: post.content
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

        return `
          <article class="border-b border-gray-200 pb-6">
            <h2 class="text-xl font-bold mb-2">
              <a href="${url}">${post.title}</a>
            </h2>
            <time datetime="${postDate.toISOString()}" class="text-gray-600 text-sm">
              ${postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            ${post.description ? `<p class="mt-2 text-gray-700">${post.description}</p>` : ''}
          </article>
        `;
      }).join('');

      let paginationHtml = '';
      if (totalPages > 1) {
        const links = [];
        if (page > 1) {
          const prevUrl = page === 2 ? this.url('/blog/') : this.url(`/blog/page/${page - 1}/`);
          links.push(`<a href="${prevUrl}" class="px-4 py-2 border rounded hover:bg-gray-50">Previous</a>`);
        }
        if (page < totalPages) {
          links.push(`<a href="${this.url(`/blog/page/${page + 1}/`)}" class="px-4 py-2 border rounded hover:bg-gray-50">Next</a>`);
        }
        paginationHtml = `<div class="flex gap-4 justify-center mt-8">${links.join('')}</div>`;
      }

      const indexContent = this.templates.render('blog-index', {
        posts_list: postsListHtml,
        pagination: paginationHtml
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
      ? '<div class="flex gap-2 flex-wrap mb-4">' +
        project.tags.map(tag => {
          const slug = normalizeTagSlug(tag);
          return `<a href="${this.url(`/tag/${slug}/`)}" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">${tag}</a>`;
        }).join('') +
        '</div>'
      : '';

    const demoLink = project.demo
      ? `<a href="${project.demo}" class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">View Demo</a>`
      : '';

    const projectContent = this.templates.render('project', {
      title: project.title,
      description: project.description,
      github: project.github,
      demo_link: demoLink,
      tags_html: tagsHtml,
      content: project.content
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
      return `
        <article class="border border-gray-200 p-6 rounded hover:shadow-lg transition-shadow">
          <h2 class="text-xl font-bold mb-2">
            <a href="${this.url(`/projects/${project.slug}/`)}">${project.title}</a>
          </h2>
          <p class="text-gray-700 mb-4">${project.description}</p>
          <div class="flex gap-3">
            <a href="${project.github}" class="text-sm text-blue-600 hover:text-blue-800">GitHub →</a>
            ${project.demo ? `<a href="${project.demo}" class="text-sm text-blue-600 hover:text-blue-800">Demo →</a>` : ''}
          </div>
        </article>
      `;
    }).join('');

    const indexContent = this.templates.render('projects-index', {
      projects_list: projectsListHtml
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
