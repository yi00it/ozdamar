import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TemplateEngine } from './scripts/template';
import { ContentParser, validateUniquenessSlugs } from './scripts/content';
import { SiteGenerator, SiteConfig } from './scripts/generator';

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'src', 'templates');
const STYLES_PATH = path.join(ROOT_DIR, 'src', 'styles.css');
const OUTPUT_CSS_DIR = path.join(DIST_DIR, 'assets');
const OUTPUT_CSS_PATH = path.join(OUTPUT_CSS_DIR, 'main.css');

const config: SiteConfig = {
  siteName: 'Ozdamar',
  siteUrl: 'https://ozdamar.net',
  siteDescription: 'Personal website and blog',
  intro: "I've spent my career in construction project management, and now I'm building my own construction software—powered by the insane productivity of the AI era.",
  basePath: ''
};

function cleanDist(): void {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyPublicAssets(): void {
  if (fs.existsSync(PUBLIC_DIR)) {
    const items = fs.readdirSync(PUBLIC_DIR);
    for (const item of items) {
      const src = path.join(PUBLIC_DIR, item);
      const dest = path.join(DIST_DIR, item);

      if (fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }
}

function buildTailwindCSS(): void {
  console.log('Building Tailwind CSS...');

  fs.mkdirSync(OUTPUT_CSS_DIR, { recursive: true });

  try {
    execSync(
      `npx tailwindcss -i ${STYLES_PATH} -o ${OUTPUT_CSS_PATH} --minify`,
      { stdio: 'inherit' }
    );
  } catch (error) {
    console.error('Error building Tailwind CSS:', error);
    throw error;
  }
}

function loadTemplates(templates: TemplateEngine): void {
  templates.loadTemplate('layout', TEMPLATES_DIR);
  templates.loadTemplate('home', TEMPLATES_DIR);
  templates.loadTemplate('blog-index', TEMPLATES_DIR);
  templates.loadTemplate('blog-post', TEMPLATES_DIR);
  templates.loadTemplate('projects-index', TEMPLATES_DIR);
  templates.loadTemplate('project', TEMPLATES_DIR);
  templates.loadTemplate('tag', TEMPLATES_DIR);
  templates.loadXMLTemplate('rss', TEMPLATES_DIR);
  templates.loadXMLTemplate('sitemap', TEMPLATES_DIR);
}

async function build(): Promise<void> {
  console.log('Starting build...');

  // Step 1: Clean and create dist directory
  console.log('Cleaning dist directory...');
  cleanDist();

  // Step 2: Copy public assets
  console.log('Copying public assets...');
  copyPublicAssets();

  // Step 3: Build Tailwind CSS
  buildTailwindCSS();

  // Step 4: Load templates
  console.log('Loading templates...');
  const templates = new TemplateEngine();
  loadTemplates(templates);

  // Step 5: Parse content
  console.log('Parsing content...');
  const parser = new ContentParser();

  const postsDir = path.join(CONTENT_DIR, 'posts');
  const projectsDir = path.join(CONTENT_DIR, 'projects');

  // Ensure content directories exist
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const posts = parser.loadAllPosts(postsDir);
  const projects = parser.loadAllProjects(projectsDir);

  console.log(`Found ${posts.length} posts and ${projects.length} projects`);

  // Step 6: Validate uniqueness
  validateUniquenessSlugs(posts, projects);

  // Step 7: Generate pages
  console.log('Generating pages...');
  const generator = new SiteGenerator(templates, config, DIST_DIR);

  generator.generateHome(posts, projects);

  if (posts.length > 0) {
    for (const post of posts) {
      generator.generateBlogPost(post);
    }
    generator.generateBlogIndex(posts);
    generator.generateRSS(posts);
  }

  if (projects.length > 0) {
    for (const project of projects) {
      generator.generateProject(project);
    }
    generator.generateProjectsIndex(projects);
  }

  if (posts.length > 0 || projects.length > 0) {
    generator.generateTagPages(posts, projects);
    generator.generateSitemap(posts, projects);
  }

  console.log('Build completed successfully!');
}

// Run build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
