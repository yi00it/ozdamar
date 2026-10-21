import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';

export interface BlogPost {
  title: string;
  date: string;
  slug: string;
  tags?: string[];
  description?: string;
  content: string;
  filePath: string;
}

export interface Project {
  title: string;
  slug: string;
  description: string;
  github?: string;
  website?: string;
  tags?: string[];
  demo?: string;
  order?: number;
  icon?: string;
  image?: string;
  active: boolean;
  specs: [string, string][];
  content: string;
  filePath: string;
}

export interface ShelfItem {
  title: string;
  subtitle?: string;
  creator: string;
  year?: number;
  cover: string;
  rating?: number;
  finished?: string;
  order?: number;
  comment: string;
  filePath: string;
}

export interface UsesItem {
  name: string;
  icon?: string;
  note?: string;
}

export interface UsesGroup {
  group: string;
  items: UsesItem[];
}

export interface Uses {
  description: string;
  hardware: UsesGroup[];
  software: UsesGroup[];
}

// Headings get ids and a hanging # link; repeated headings get -2, -3…
let headingIds = new Map<string, number>();

function slugify(text: string): string {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'section';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

marked.use({
  renderer: {
    heading(text: string, level: number) {
      if (level !== 2 && level !== 3) return false;
      const base = slugify(text);
      const n = (headingIds.get(base) || 0) + 1;
      headingIds.set(base, n);
      const id = n === 1 ? base : `${base}-${n}`;
      return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${level}>\n`;
    },
    // Muted highlighting; unknown languages stay plain
    code(code: string, lang: string | undefined) {
      const language = (lang || '').trim().split(/\s+/)[0];
      const html = language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language }).value
        : escapeHtml(code);
      return `<pre><code${language ? ` class="language-${language}"` : ''}>${html}</code></pre>\n`;
    }
  }
});

// Footnotes: [^id] in the text, "[^id]: note" on its own line. Each note is set
// twice: as a side note beside its reference, and in a list at the end; CSS
// shows whichever fits the screen.
function footnotes(markdown: string): { markdown: string; notes: string } {
  const defs = new Map<string, string>();
  const body = markdown.replace(/^\[\^([^\]\s]+)\]:[ \t]+(.+)$/gm, (_, id: string, text: string) => {
    defs.set(id, marked.parseInline(text.trim()) as string);
    return '';
  });
  if (defs.size === 0) return { markdown, notes: '' };

  const order: string[] = [];
  const withRefs = body.replace(/\[\^([^\]\s]+)\](?!:)/g, (match, id: string) => {
    if (!defs.has(id)) return match;
    if (!order.includes(id)) order.push(id);
    const n = order.indexOf(id) + 1;
    return `<sup class="fn-ref" id="fnref-${id}"><a href="#fn-${id}">${n}</a></sup>` +
      `<span class="sidenote" role="note"><span class="sidenote__n">${n}</span>${defs.get(id)}</span>`;
  });
  const items = order.map(id =>
    `<li id="fn-${id}">${defs.get(id)} <a href="#fnref-${id}" aria-label="Back to the text">↩</a></li>`).join('');
  return { markdown: withRefs, notes: `<section class="footnotes" aria-label="Notes"><ol>${items}</ol></section>` };
}

export function renderMarkdown(markdown: string): string {
  headingIds = new Map();
  const { markdown: body, notes } = footnotes(markdown);
  const html = (marked(body) as string)
    // An image with a title on its own line becomes a captioned figure
    .replace(/<p>(<img [^>]*title="([^"]*)"[^>]*>)<\/p>/g, '<figure>$1<figcaption>$2</figcaption></figure>');
  return html + notes;
}

export class ContentParser {
  parseBlogPost(filePath: string): BlogPost {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    if (!data.title || !data.date || !data.slug) {
      throw new Error(`Missing required frontmatter in ${filePath}`);
    }

    return {
      title: data.title,
      date: data.date,
      slug: data.slug,
      tags: data.tags || [],
      description: data.description,
      content: renderMarkdown(content),
      filePath
    };
  }

  parseProject(filePath: string): Project {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    if (!data.title || !data.slug || !data.description || !(data.github || data.website)) {
      throw new Error(`Missing required frontmatter in ${filePath}`);
    }

    return {
      title: data.title,
      slug: data.slug,
      description: data.description,
      github: data.github,
      website: data.website,
      tags: data.tags || [],
      demo: data.demo,
      order: data.order,
      icon: data.icon,
      image: data.image,
      active: data.active === true,
      specs: Object.entries(data.specs || {}).map(([key, value]) => [key, String(value)] as [string, string]),
      content: renderMarkdown(content),
      filePath
    };
  }

  // A book or movie: author or director, cover, optional rating and comment
  parseShelfItem(filePath: string): ShelfItem {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const creator = data.author || data.director;

    if (!data.title || !creator || !data.cover) {
      throw new Error(`Missing required frontmatter in ${filePath}`);
    }
    if (data.rating !== undefined && (typeof data.rating !== 'number' || data.rating < 0 || data.rating > 5)) {
      throw new Error(`Rating must be a number from 0 to 5 in ${filePath}`);
    }

    return {
      title: data.title,
      subtitle: data.subtitle,
      creator,
      year: data.year,
      cover: data.cover,
      rating: data.rating,
      finished: data.finished ? String(data.finished instanceof Date ? data.finished.toISOString() : data.finished) : undefined,
      order: data.order,
      comment: content.trim() ? (marked.parseInline(content.trim()) as string) : '',
      filePath
    };
  }

  loadShelf(dir: string): ShelfItem[] {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    return files.map(f => this.parseShelfItem(path.join(dir, f)));
  }

  loadUses(filePath: string): Uses | null {
    if (!fs.existsSync(filePath)) return null;
    const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
    return {
      description: data.description || '',
      hardware: data.hardware || [],
      software: data.software || []
    };
  }

  loadAllPosts(postsDir: string): BlogPost[] {
    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
    return files.map(f => this.parseBlogPost(path.join(postsDir, f)));
  }

  loadAllProjects(projectsDir: string): Project[] {
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md'));
    return files.map(f => this.parseProject(path.join(projectsDir, f)));
  }
}

export function validateUniquenessSlugs(posts: BlogPost[], projects: Project[]): void {
  const slugs = new Set<string>();

  for (const post of posts) {
    const key = `post:${post.slug}`;
    if (slugs.has(key)) {
      throw new Error(`Duplicate post slug: ${post.slug}`);
    }
    slugs.add(key);
  }

  for (const project of projects) {
    const key = `project:${project.slug}`;
    if (slugs.has(key)) {
      throw new Error(`Duplicate project slug: ${project.slug}`);
    }
    slugs.add(key);
  }
}

export function normalizeTagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, '-');
}
