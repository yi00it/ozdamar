import * as fs from 'fs';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { OgCard } from './generator';

const FONTS = [
  path.join(__dirname, '..', 'og', 'InterDisplay-SemiBold.ttf'),
  path.join(__dirname, '..', 'og', 'Inter-Medium.ttf')
];

const PAPER = '#f3f2ee';
const INK = '#161615';
const QUIET = '#6b6963';
const ACCENT = '#ef5a0c';

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 80;

// Rough advance widths for Inter, in ems. Close enough to wrap lines safely.
function textWidth(text: string, size: number, tracking: number): number {
  let em = 0;
  for (const ch of text) {
    if ('ijl.,:;\'!|·’'.includes(ch)) em += 0.27;
    else if (ch === ' ') em += 0.28;
    else if ('frtI()[]-'.includes(ch)) em += 0.38;
    else if ('mwMW'.includes(ch)) em += 0.88;
    else if (/[A-Z]/.test(ch)) em += 0.7;
    else if (/[0-9]/.test(ch)) em += 0.6;
    else em += 0.57;
    em += tracking;
  }
  return em * size;
}

function wrap(text: string, size: number, tracking: number, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size, tracking) <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,.;:]*$/, '') + '…';
    return kept;
  }
  return lines;
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function iconHref(publicDir: string, icon: string): string | null {
  const file = path.join(publicDir, icon);
  if (!fs.existsSync(file)) return null;
  const type = icon.endsWith('.svg') ? 'image/svg+xml' : icon.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
}

// Paper, the wordmark with its orange stop, and the title set large at the foot
function cardSvg(card: OgCard, publicDir: string): string {
  const inner = WIDTH - MARGIN * 2;
  const kicker = wrap(card.kicker, 30, 0, inner, 2);
  let size = 84;
  let title = wrap(card.title, size, -0.02, inner, 3);
  if (title.length > 2) {
    size = 68;
    title = wrap(card.title, size, -0.02, inner, 3);
  }

  const parts: string[] = [];
  let y = HEIGHT - MARGIN + 6;
  for (const line of [...kicker].reverse()) {
    parts.push(`<text x="${MARGIN}" y="${y}" font-family="Inter" font-weight="500" font-size="30" fill="${QUIET}">${escape(line)}</text>`);
    y -= 40;
  }
  y -= 28;
  for (const line of [...title].reverse()) {
    parts.push(`<text x="${MARGIN}" y="${y}" font-family="Inter Display" font-weight="600" font-size="${size}" letter-spacing="${-0.02 * size}" fill="${INK}">${escape(line)}</text>`);
    y -= Math.round(size * 1.06);
  }

  const href = card.icon ? iconHref(publicDir, card.icon) : null;
  const icon = href ? `
  <clipPath id="tile"><rect x="${WIDTH - MARGIN - 120}" y="${MARGIN - 8}" width="120" height="120" rx="27"/></clipPath>
  <image href="${href}" x="${WIDTH - MARGIN - 120}" y="${MARGIN - 8}" width="120" height="120" clip-path="url(#tile)" preserveAspectRatio="xMidYMid slice"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>
  <text x="${MARGIN}" y="${MARGIN + 26}" font-family="Inter Display" font-weight="600" font-size="36" letter-spacing="-1.1" fill="${INK}">ozdamar</text>
  <circle cx="${MARGIN + 140}" cy="${MARGIN + 21}" r="5" fill="${ACCENT}"/>${icon}
  ${parts.join('\n  ')}
</svg>`;
}

function render(svg: string, width: number): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter' }
  }).render().asPng();
}

export function renderOgCards(cards: OgCard[], distDir: string, publicDir: string): void {
  const dir = path.join(distDir, 'og');
  fs.mkdirSync(dir, { recursive: true });
  for (const card of cards) {
    fs.writeFileSync(path.join(dir, `${card.slug}.png`), render(cardSvg(card, publicDir), WIDTH));
  }
}

// Home-screen icons: the orange light on paper, full bleed so each platform can mask it
export function renderAppIcons(distDir: string, siteName: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PAPER}"/>
  <circle cx="256" cy="256" r="104" fill="${ACCENT}"/>
</svg>`;
  fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), render(svg, 180));
  fs.writeFileSync(path.join(distDir, 'icon-192.png'), render(svg, 192));
  fs.writeFileSync(path.join(distDir, 'icon-512.png'), render(svg, 512));

  const manifest = {
    name: siteName,
    short_name: 'ozdamar',
    start_url: '/',
    display: 'minimal-ui',
    background_color: PAPER,
    theme_color: PAPER,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  };
  fs.writeFileSync(path.join(distDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
}
