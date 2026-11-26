#!/usr/bin/env node
/**
 * build-seoulmarkets-data-markdown.mjs — SeoulMarkets 자료 화면(/data/<이름>)마다 마크다운 판을 낸다.
 *
 * ── 왜 (2026-11-27 · 5번) ─────────────────────────────────────────────
 * 기사에는 .md 판이 있는데(build-seoulmarkets-markdown.mjs) 자료 화면 52장에는 없었다.
 * 28일 실측으로 ChatGPT 유입이 실제로 닿는 곳은 자료 화면이다(/data 49명, 그중 kospi-weights 28명).
 * AI 가 표를 그대로 읽을 수 있게 같은 주소에 .md 를 붙인 판을 낸다.
 *
 * 기사와 달리 자료 화면은 원본이 .astro 라 마크다운 원본이 없다.
 * 그래서 이미 지어진 dist/data/<이름>.html 의 <main> 안쪽만 읽어 바꾼다.
 * ⛔ 공개 HTML 에 없는 것은 넣지 않는다 — 지어진 화면에 보이는 것만 옮긴다.
 * ⛔ 입력 칸·단추·스크립트·그림은 옮기지 않는다.
 * ⛔ 사이트맵에는 넣지 않는다 — llms.txt 로만 안내한다(기사 .md 와 같은 원칙).
 *
 * 쓰는 법
 *   node scripts/build-seoulmarkets-data-markdown.mjs --selftest
 *   node scripts/build-seoulmarkets-data-markdown.mjs        (astro build 뒤 — dist/data 필요)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist/data');
const SITE = 'https://seoulmarkets.com';

const NAMED = { ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…', times: '×', minus: '−', middot: '·', rarr: '→', larr: '←', le: '≤', ge: '≥', thinsp: ' ', ensp: ' ', emsp: ' ', deg: '°', plusmn: '±', asymp: '≈', ne: '≠' };

function unescapeHtml(s) {
  return String(s)
    .replace(/&([a-z]+);/gi, (m, n) => (Object.prototype.hasOwnProperty.call(NAMED, n) ? NAMED[n] : m))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

const absolute = (href) => (href.startsWith('/') && !href.startsWith('//') ? SITE + href : href);

/** inline tags to markdown, everything else stripped, whitespace collapsed */
export function inline(html) {
  let s = String(html);
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, t, a, x) => (x.trim() ? `**${x.trim()}**` : ''));
  s = s.replace(/<code(\s[^>]*)?>([\s\S]*?)<\/code>/gi, (_, a, x) => '`' + x.trim() + '`');
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const t = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    return href.startsWith('#') ? t : `[${t}](${absolute(href)})`;
  });
  s = s.replace(/<[^>]+>/g, '');
  return unescapeHtml(s).replace(/\s+/g, ' ').trim();
}

/** one <table> to a markdown table */
export function table(html) {
  const rows = [...html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<t[hd](?:\s[^>]*)?>([\s\S]*?)<\/t[hd]>/gi)].map((c) => inline(c[1]).replace(/\|/g, '\\|')))
    .filter((r) => r.length);
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [line(rows[0]), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
}

/** the inside of <main> to markdown blocks */
export function body(mainHtml) {
  let s = String(mainHtml);
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|svg|noscript|template|form|button|select|nav|figure)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(input|img)(\s[^>]*)?>/gi, '');
  const tables = [];
  s = s.replace(/<table(\s[^>]*)?>[\s\S]*?<\/table>/gi, (m) => { tables.push(table(m)); return `<p>@@TABLE${tables.length - 1}@@</p>`; });
  /* stat tiles: <div class="stat"><b>824</b><span>companies counted</span></div> */
  s = s.replace(/<div class="stat"[^>]*>\s*<b[^>]*>([\s\S]*?)<\/b>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/div>/gi,
    (_, a, b) => `<li><b>${a}</b> — ${b}</li>`);
  const out = [];
  const block = /<h1[^>]*>([\s\S]*?)<\/h1>|<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>|<h4[^>]*>([\s\S]*?)<\/h4>|<summary[^>]*>([\s\S]*?)<\/summary>|<p[^>]*>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = block.exec(s))) {
    if (m[1] != null) out.push(`# ${inline(m[1])}`);
    else if (m[2] != null) out.push(`## ${inline(m[2])}`);
    else if (m[3] != null) out.push(`### ${inline(m[3])}`);
    else if (m[4] != null) out.push(`#### ${inline(m[4])}`);
    else if (m[5] != null) out.push(`**${inline(m[5])}**`);
    else if (m[6] != null) {
      const t = m[6].match(/@@TABLE(\d+)@@/);
      out.push(t ? tables[Number(t[1])] : inline(m[6]));
    } else if (m[7] != null) {
      const t = inline(m[7]);
      if (t) out.push(`- ${t}`);
    }
  }
  /* consecutive list items belong to one list — join them with single newlines */
  const joined = [];
  for (const b of out.filter(Boolean)) {
    if (b.startsWith('- ') && joined.length && joined[joined.length - 1].startsWith('- ')) joined[joined.length - 1] += '\n' + b;
    else joined.push(b);
  }
  return joined.join('\n\n');
}

/** a built page to its markdown edition; null when the page has no usable body */
export function page(html, slug) {
  const main = (String(html).match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i) || [])[1];
  if (!main) return null;
  const text = body(main);
  if (!text || !/^# /m.test(text)) return null;
  const desc = unescapeHtml((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '');
  const head = [
    desc ? `> ${desc}` : '',
    '',
    `Source page: ${SITE}/data/${slug}`,
    'Publisher: SeoulMarkets. Figures are computed from named public sources and stated with their gaps. Free to cite with attribution and a link back. Not investment advice.',
  ].filter((l, i) => l || i === 1).join('\n');
  return `${text}\n\n---\n\n${head}\n`;
}

function selftest() {
  const fail = [];
  const ok = (name, cond) => { if (!cond) fail.push(name); };
  ok('bold', inline('<b data-x>48.7%</b>') === '**48.7%**');
  ok('relative link becomes absolute', inline('<a href="/data/screener" class="x">Screener</a>') === '[Screener](https://seoulmarkets.com/data/screener)');
  ok('anchor link keeps text only', inline('<a href="#method">method</a>') === 'method');
  ok('entities', inline('A&amp;B &#39;x&#39;') === "A&B 'x'");
  ok('named entities', inline('&ldquo;x&rdquo; &mdash; y') === '“x” — y');
  ok('whitespace collapsed', inline('a\n   b') === 'a b');
  const t = table('<table data-a><thead><tr data-a><th data-a>Company</th><th>Weight</th></tr></thead><tbody><tr><td>A | B</td><td><b>1.2%</b></td></tr><tr><td>C</td></tr></tbody></table>');
  ok('table head', t.startsWith('| Company | Weight |'));
  ok('table rule', t.includes('| --- | --- |'));
  ok('table pipe escaped', t.includes('A \\| B'));
  ok('short row padded', t.endsWith('| C |  |'));
  const b = body('<article><h1 data-a>Title</h1><section class="stats"><div class="stat" data-a><b data-a>824</b><span data-a>companies</span></div><div class="stat"><b>2</b><span>x</span></div></section><h2>Rows</h2><table><tr><th>a</th></tr><tr><td>1</td></tr></table><form><p>hidden form text</p></form><script>var p="<p>no</p>"</script><p>Body <a href="/x">link</a>.</p></article>');
  ok('h1', b.startsWith('# Title'));
  ok('stat tiles as one list', b.includes('- **824** — companies\n- **2** — x'));
  ok('table placed', b.includes('| a |\n| --- |\n| 1 |'));
  ok('form dropped', !b.includes('hidden form text'));
  ok('script dropped', !b.includes('no'));
  ok('paragraph link', b.includes('Body [link](https://seoulmarkets.com/x).'));
  const p = page('<html><head><meta name="description" content="D &amp; d"></head><body><nav><p>menu</p></nav><main id="main"><h1>T</h1><p>x</p></main><footer><p>foot</p></footer></body></html>', 'slug-x');
  ok('page has source line', p.includes('Source page: https://seoulmarkets.com/data/slug-x'));
  ok('page has description', p.includes('> D & d'));
  ok('page excludes nav and footer', !p.includes('menu') && !p.includes('foot'));
  ok('page without main is null', page('<html><body><p>x</p></body></html>', 'a') === null);
  ok('page without h1 is null', page('<main><p>x</p></main>', 'a') === null);
  if (fail.length) { console.error('FAIL build-seoulmarkets-data-markdown selftest: ' + fail.join(' / ')); process.exit(1); }
  console.log('✅ build-seoulmarkets-data-markdown selftest passed (22)');
}

function run() {
  if (!fs.existsSync(DIST)) { console.log('dist/data not found — nothing written'); return; }
  let written = 0;
  const skipped = [];
  for (const f of fs.readdirSync(DIST)) {
    if (!f.endsWith('.html')) continue;
    const slug = f.slice(0, -5);
    const md = page(fs.readFileSync(path.join(DIST, f), 'utf8'), slug);
    if (!md) { skipped.push(slug); continue; }
    fs.writeFileSync(path.join(DIST, slug + '.md'), md);
    written++;
  }
  console.log(`data markdown editions written: ${written}` + (skipped.length ? ` | skipped (no usable body): ${skipped.join(', ')}` : ''));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  if (process.argv.includes('--selftest')) selftest();
  else run();
}
