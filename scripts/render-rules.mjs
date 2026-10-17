// rules.md is the source of truth. Run from the repository root:
// node scripts/render-rules.mjs [site-directory]
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteDirectory = resolve(process.argv[2] || '.');
const markdown = await readFile(resolve(siteDirectory, 'rules.md'), 'utf8');
const indexPath = resolve(siteDirectory, 'index.html');
const index = await readFile(indexPath, 'utf8');
const start = '<!-- RULES:START -->';
const end = '<!-- RULES:END -->';

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

// Small, deliberately limited Markdown format: headings, paragraphs, bullet
// lists, bold and inline code. Raw HTML is always escaped.
function inline(text) {
  return text.split(/(`[^`]+`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    }
    return escapeHtml(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }).join('');
}

const output = [];
let paragraph = [];
let list = [];
function flush() {
  if (paragraph.length) output.push(`<p class="rule-text">${inline(paragraph.join(' '))}</p>`);
  if (list.length) output.push(`<ul class="rule-list">${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
  paragraph = [];
  list = [];
}

for (const line of markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')) {
  const heading = /^(#{1,3})\s+(.+)$/.exec(line);
  const bullet = /^[-*]\s+(.+)$/.exec(line);
  if (heading) {
    flush();
    if (heading[1].length === 1) continue; // Page already has its own title.
    const isSection = heading[1].length === 2;
    const tag = isSection ? 'h2' : 'h3';
    if (!isSection) output.push('<hr/>');
    output.push(`<${tag} class="${isSection ? 'rules-main-title' : 'rule-item-title'}">${inline(heading[2])}</${tag}>`);
  } else if (bullet) {
    if (paragraph.length) flush();
    list.push(bullet[1]);
  } else if (!line.trim()) {
    flush();
  } else {
    if (list.length) flush();
    paragraph.push(line.trim());
  }
}
flush();
if (!output.length) throw new Error('rules.md is empty; refusing to publish empty rules');
const startIndex = index.indexOf(start);
const endIndex = index.indexOf(end);
if (startIndex < 0 || endIndex <= startIndex || index.indexOf(start, startIndex + 1) >= 0 || index.indexOf(end, endIndex + 1) >= 0) {
  throw new Error('Expected exactly one RULES:START / RULES:END pair in index.html');
}
await writeFile(indexPath, index.slice(0, startIndex + start.length) + '\n' + output.join('\n') + '\n' + index.slice(endIndex));
console.log(`Rules rendered from rules.md (${output.length} blocks)`);
