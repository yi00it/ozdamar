import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

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
      content: marked(content) as string,
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
      content: marked(content) as string,
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
