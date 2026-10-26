import * as fs from 'fs';
import * as path from 'path';
import { transform } from 'lightningcss';
import { TemplateEngine } from './scripts/template';
import { ContentParser, validateUniquenessSlugs } from './scripts/content';
import { SiteGenerator, SiteConfig, Release } from './scripts/generator';
import { renderOgCards, renderAppIcons } from './scripts/og';

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'src', 'templates');
const STYLES_PATH = path.join(ROOT_DIR, 'src', 'styles.css');
const OUTPUT_CSS_DIR = path.join(DIST_DIR, 'assets');
const OUTPUT_CSS_PATH = path.join(OUTPUT_CSS_DIR, 'main.css');

const config: SiteConfig = {
  siteName: 'Yigit Ozdamar',
  siteUrl: 'https://ozdamar.net',
  siteDescription: 'Construction project manager, building software for construction.',
  intro: 'I build things.',
  introSub: 'Some with concrete. Some with code. Others just because I wanted to see if I could.',
  basePath: ''
};

// Whitebox's download page links the installer from this repo's latest release
const WHITEBOX_REPO = 'yi00it/whitebox';

// The newest release and its Windows installer. Null when offline or rate
// limited; the page then links GitHub's latest-release page instead.
async function fetchLatestRelease(repo: string): Promise<Release | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const data = await response.json() as {
      tag_name: string;
      published_at: string;
      assets: { name: string; size: number; browser_download_url: string }[];
    };
    const installer = data.assets.find(asset => asset.name.endsWith('-setup.exe'))
      ?? data.assets.find(asset => asset.name.endsWith('.exe'));
    if (!installer) throw new Error(`no installer in ${data.tag_name}`);
    return {
      version: data.tag_name,
      published: data.published_at,
      downloadUrl: installer.browser_download_url,
      size: installer.size,
      sumsUrl: data.assets.find(asset => asset.name === 'SHA256SUMS.txt')?.browser_download_url
    };
  } catch (error) {
    console.warn(`Could not fetch the latest ${repo} release (${(error as Error).message}); linking the releases page.`);
    return null;
  }
}

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

// Browsers the stylesheet is written for: all support light-dark(). Naming them
// also stops the minifier folding animation-timeline into the animation
// shorthand, which browsers reject.
const CSS_TARGETS = {
  chrome: 123 << 16,
  safari: (17 << 16) | (5 << 8),
  firefox: 120 << 16
};

// One hand-written stylesheet, minified
function buildCSS(): void {
  console.log('Building CSS...');

  fs.mkdirSync(OUTPUT_CSS_DIR, { recursive: true });
  const { code, warnings } = transform({
    filename: STYLES_PATH,
    code: fs.readFileSync(STYLES_PATH),
    minify: true,
    targets: CSS_TARGETS
  });
  for (const warning of warnings) console.warn('CSS:', warning.message);
  fs.writeFileSync(OUTPUT_CSS_PATH, code);
}

function loadTemplates(templates: TemplateEngine): void {
  templates.loadTemplate('layout', TEMPLATES_DIR);
  templates.loadTemplate('home', TEMPLATES_DIR);
  templates.loadTemplate('blog-index', TEMPLATES_DIR);
  templates.loadTemplate('blog-post', TEMPLATES_DIR);
  templates.loadTemplate('projects-index', TEMPLATES_DIR);
  templates.loadTemplate('project', TEMPLATES_DIR);
  templates.loadTemplate('tag', TEMPLATES_DIR);
  templates.loadTemplate('shelf', TEMPLATES_DIR);
  templates.loadTemplate('uses', TEMPLATES_DIR);
  templates.loadTemplate('404', TEMPLATES_DIR);
  templates.loadTemplate('whitebox', TEMPLATES_DIR);
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

  // Step 3: Build CSS
  buildCSS();

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

  const books = parser.loadShelf(path.join(CONTENT_DIR, 'shelf', 'books'));
  const movies = parser.loadShelf(path.join(CONTENT_DIR, 'shelf', 'movies'));
  generator.generateShelf(books, movies);

  const uses = parser.loadUses(path.join(CONTENT_DIR, 'uses.md'));
  if (uses) {
    generator.generateUses(uses);
  }

  const extraPaths: string[] = [];
  const whitebox = projects.find(project => project.slug === 'whitebox');
  if (whitebox) {
    generator.generateWhitebox(whitebox, WHITEBOX_REPO, await fetchLatestRelease(WHITEBOX_REPO));
    extraPaths.push('/whitebox/');
  }

  if (posts.length > 0 || projects.length > 0) {
    generator.generateTagPages(posts, projects);
    generator.generateSitemap(posts, projects, extraPaths);
  }

  generator.generateNotFound();

  // Step 8: Share cards and home-screen icons
  console.log(`Rendering ${generator.ogCards.length} share cards...`);
  renderOgCards(generator.ogCards, DIST_DIR, PUBLIC_DIR);
  renderAppIcons(DIST_DIR, config.siteName);

  console.log('Build completed successfully!');
}

// Run build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
