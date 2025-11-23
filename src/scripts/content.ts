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
  github: string;
  tags?: string[];
  demo?: string;
  order?: number;
  content: string;
  filePath: string;
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

    if (!data.title || !data.slug || !data.description || !data.github) {
      throw new Error(`Missing required frontmatter in ${filePath}`);
    }

    return {
      title: data.title,
      slug: data.slug,
      description: data.description,
      github: data.github,
      tags: data.tags || [],
      demo: data.demo,
      order: data.order,
      content: marked(content) as string,
      filePath
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
