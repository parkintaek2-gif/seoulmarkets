#!/usr/bin/env node
/**
 * md-to-pdf.mjs — **사장님께 드리는 보고서를 표가 안 깨지는 PDF 로 만든다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 만들었나 — 2026-09-02 사장님]
 *   > 「md 말고 워드, 액셀, pdf 파일 중 하나로 줘..**표가 다 깨짐.**」
 *
 *   마크다운 표(`| a | b |`)는 **마크다운을 렌더하는 프로그램에서만** 표로 보인다.
 *   사장님은 OneDrive 미리보기·기본 편집기로 여시니 파이프 기호가 그대로 보인다.
 *   내가 표로 잘 짰다고 믿은 것이 **사장님 화면에서는 깨진 글줄 뭉치**였다.
 *   회사 제1 원칙 — 「그릇이 내용물을 결정한다」. **사장님도 이 보고서의 독자다.**
 *
 * [왜 klifemap 의 build-report-deck.js 를 안 쓰나 — 히스토리를 보고 정했다]
 *   그 자는 사장님 다른 지시(「ppt 로 한 장씩 여섯 장」·「제목과 설명 3줄」)에 맞춘
 *   **슬라이드 전용**이다. 표를 아예 그리지 않고 세 줄을 넘으면 잘라 낸다.
 *   여기 필요한 것은 «표가 살아 있는 문서»라 쓰임이 다르다. → 따로 만든다.
 *   ⛔ 그 자를 고치지 않는다. 고치면 여섯 장 보고가 깨진다.
 *
 * [글꼴 — 네트워크에 기대지 않는다]
 *   구글 폰트를 부르면 CDN 이 느린 날 보고가 통째로 실패한다(4번이 실제로 겪었다).
 *   윈도우에 늘 있는 **맑은 고딕**을 쓴다. 네트워크가 죽어도 보고는 나간다.
 *
 * [쓰는 법]
 *   node scripts/md-to-pdf.mjs <보고.md> [--out 경로.pdf] [--제목 "표지 제목"]
 *   node scripts/md-to-pdf.mjs --시험        스스로 시험한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

/* ⛔ 이스케이프를 **먼저** 하고 그다음 꾸밈을 살린다 — 순서를 바꾸면 구멍이 된다 */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 그림을 어디서 찾을지. 만든다() 가 md 파일이 있는 폴더로 맞춰 준다.
 * ⛔ 전역에 둔 이유 — 몸통만든다() 는 이미 여러 곳에서 «한 인자»로 불린다. 짝을 깨지 않는다.
 */
export let 그림뿌리 = process.cwd();
export const 그림뿌리정한다 = (길) => { 그림뿌리 = 길; };

/**
 * 「![이름](경로)」를 **글자 안에 박힌 그림**으로 바꾼다.
 * 🔴 왜 파일을 읽어서 박나 — setContent() 로 띄운 쪽은 바탕 주소가 없다.
 *    `<img src="그림.svg">` 는 **아무것도 안 뜬 채** PDF 가 만들어지고, 아무 말도 안 한다.
 *    그래서 파일을 읽어 data: 로 박는다. 못 읽으면 **못 찾았다고 글자로 남긴다** — 빈자리를 숨기지 않는다.
 */
export function 그림박기(길, 이름, 읽기, 있나, 뿌리 = 그림뿌리) {
  if (/^(data:|https?:)/i.test(길)) return `<img src="${길}" alt="${이름}">`;
  const 온길 = path.isAbsolute(길) ? 길 : path.join(뿌리, 길);
  if (!있나(온길)) return `<em>[그림을 못 찾았다: ${이름 || 길}]</em>`;
  const 종류 = /\.svg$/i.test(온길) ? 'image/svg+xml'
    : /\.png$/i.test(온길) ? 'image/png'
      : /\.jpe?g$/i.test(온길) ? 'image/jpeg' : 'application/octet-stream';
  return `<img src="data:${종류};base64,${Buffer.from(읽기(온길)).toString('base64')}" alt="${이름}">`;
}

function 안쪽꾸밈(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  /* ⛔ 그림(!)을 고리보다 «먼저» 본다 — 순서를 바꾸면 그림이 고리로 잡힌다 */
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, 이름, 길) => 그림박기(길, 이름, (p) => fs.readFileSync(p), (p) => fs.existsSync(p)));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  return t;
}

const 표줄인가 = (l) => /^\s*\|.*\|\s*$/.test(l);
const 가름줄인가 = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-');
const 칸나누기 = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** 마크다운 → HTML 몸통. **표를 진짜 <table> 로 그리는 것이 이 자의 존재 이유다.** */
export function 몸통만든다(md) {
  const 줄 = String(md).replace(/\r\n/g, '\n').split('\n');
  const 나온다 = [];
  let i = 0;
  let 목록열림 = false;
  const 목록닫기 = () => { if (목록열림) { 나온다.push('</ul>'); 목록열림 = false; } };

  while (i < 줄.length) {
    const l = 줄[i];

    /* 코드블록 — 안쪽은 손대지 않는다 */
    if (/^\s*```/.test(l)) {
      목록닫기();
      const 담을것 = [];
      i += 1;
      while (i < 줄.length && !/^\s*```/.test(줄[i])) { 담을것.push(줄[i]); i += 1; }
      i += 1;
      나온다.push(`<pre>${esc(담을것.join('\n'))}</pre>`);
      continue;
    }

    /* 표 — 머리줄 + 가름줄 + 몸줄 */
    if (표줄인가(l) && i + 1 < 줄.length && 가름줄인가(줄[i + 1])) {
      목록닫기();
      const 머리 = 칸나누기(l);
      i += 2;
      const 몸 = [];
      while (i < 줄.length && 표줄인가(줄[i])) { 몸.push(칸나누기(줄[i])); i += 1; }
      const th = 머리.map((c) => `<th>${안쪽꾸밈(c)}</th>`).join('');
      const tr = 몸.map((r) => {
        /* ⚠ 칸 수가 머리와 다르면 «조용히 버리지 않는다» — 채워서 다 보이게 한다 */
        const 칸 = r.slice(0, 머리.length);
        while (칸.length < 머리.length) 칸.push('');
        return `<tr>${칸.map((c) => `<td>${안쪽꾸밈(c)}</td>`).join('')}</tr>`;
      }).join('');
      나온다.push(`<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`);
      continue;
    }

    if (/^\s*(---+|===+|___+)\s*$/.test(l)) { 목록닫기(); 나온다.push('<hr>'); i += 1; continue; }

    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { 목록닫기(); 나온다.push(`<h${h[1].length}>${안쪽꾸밈(h[2])}</h${h[1].length}>`); i += 1; continue; }

    /* ⚠ [2026-09-02] 이어지는 인용줄을 **한 덩이로 묶는다.**
       전에는 줄마다 따로 <blockquote> 를 냈다. 그러면 `**굵게**` 가 두 줄에 걸칠 때
       여는 별표와 닫는 별표가 서로 다른 덩이로 갈려 **별표가 글자로 새어 나온다.**
       사장님 말씀을 인용하는 자리라 특히 그렇게 두면 안 된다. */
    if (/^\s*>/.test(l)) {
      목록닫기();
      const 담을것 = [];
      while (i < 줄.length && /^\s*>/.test(줄[i])) {
        담을것.push(줄[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      나온다.push(`<blockquote>${안쪽꾸밈(담을것.join(' ').trim())}</blockquote>`);
      continue;
    }

    const li = l.match(/^\s*[-*·]\s+(.*)$/);
    if (li) {
      if (!목록열림) { 나온다.push('<ul>'); 목록열림 = true; }
      나온다.push(`<li>${안쪽꾸밈(li[1])}</li>`);
      i += 1; continue;
    }

    if (!l.trim()) { 목록닫기(); i += 1; continue; }

    목록닫기();
    나온다.push(`<p>${안쪽꾸밈(l)}</p>`);
    i += 1;
  }
  목록닫기();
  return 나온다.join('\n');
}

const 판 = (제목, 몸통) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(제목)}</title><style>
  /* ⛔ 웹폰트를 안 쓴다 — 네트워크가 죽어도 보고는 나가야 한다 */
  * { box-sizing: border-box; }
  /* 🔴 [2026-10-03] 「⬜」가 빈 네모(두부)로 찍혔다 — 맑은 고딕에 그 글자가 없다.
     ⇒ 기호 글꼴을 «뒤에» 붙인다. 한글은 여전히 맑은 고딕이 먼저 잡는다. */
  body { font-family: "맑은 고딕", "Malgun Gothic", system-ui, sans-serif,
                      "Segoe UI Emoji", "Segoe UI Symbol";
         font-size: 11pt; line-height: 1.62; color: #1c2330; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 4pt; border-bottom: 2.5px solid #1c2330; padding-bottom: 7pt; }
  h2 { font-size: 14.5pt; margin: 20pt 0 7pt; color: #0f2f5f; border-left: 5px solid #0f2f5f;
       padding-left: 8pt; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 13pt 0 5pt; color: #24406b; page-break-after: avoid; }
  h4 { font-size: 11pt; margin: 10pt 0 4pt; color: #3a4a63; page-break-after: avoid; }
  p  { margin: 5pt 0; }
  ul { margin: 5pt 0 5pt 17pt; padding: 0; }
  li { margin: 2.5pt 0; }
  hr { border: 0; border-top: 1px solid #d3d9e2; margin: 15pt 0; }
  code { font-family: Consolas, "D2Coding", monospace; font-size: 9.7pt;
         background: #eef1f6; padding: 1px 4px; border-radius: 3px; }
  pre  { font-family: Consolas, "D2Coding", monospace; font-size: 9.3pt; line-height: 1.5;
         background: #f5f7fa; border: 1px solid #dde3ec; border-left: 4px solid #6b7f9e;
         border-radius: 4px; padding: 8pt 10pt; white-space: pre-wrap; word-break: break-word;
         margin: 7pt 0; page-break-inside: avoid; }
  blockquote { margin: 7pt 0; padding: 6pt 11pt; background: #fbf6e8;
               border-left: 4px solid #c9a227; border-radius: 0 4px 4px 0; }
  /* ⭐ 이 자의 존재 이유 — 표가 표로 보인다 */
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 10pt;
          page-break-inside: avoid; }
  /* ⚠ 머리칸이 좁아 「언제」가 「언/제」로 쪼개져 보였다 — 머리는 줄바꿈하지 않는다 */
  th { background: #1c2330; color: #fff; font-weight: 600; text-align: left;
       padding: 5pt 7pt; border: 1px solid #1c2330; white-space: nowrap; }
  td { padding: 4.5pt 7pt; border: 1px solid #cfd6e0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f6f8fb; }
  /* 그림은 쪽을 넘기지 않게 줄인다 — 넘치면 조용히 잘린다 */
  img { max-width: 100%; height: auto; display: block; margin: 8pt 0;
        page-break-inside: avoid; }
  a { color: #14478f; }
</style></head><body>
${몸통}
</body></html>`;

export async function 만든다(mdPath, outPath, 제목) {
  if (!CHROME) throw new Error('크롬/엣지를 못 찾았다 — PDF 를 만들 수 없다');
  const md = fs.readFileSync(mdPath, 'utf8');
  /* 그림은 md 파일 «옆»에서 찾는다 — 어디서 부르든 같은 그림이 들어가야 한다 */
  그림뿌리정한다(path.dirname(path.resolve(mdPath)));
  const html = 판(제목 || path.basename(mdPath, '.md'), 몸통만든다(md));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-size:8pt;color:#8a93a2;'
        + 'font-family:\'맑은 고딕\',sans-serif;text-align:center;">'
        + '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  } finally { await browser.close(); }
  return outPath;
}

/* ── 스스로 시험한다 ───────────────────────────────────────────────────── */
function 자가시험() {
  let 흠 = 0;
  /* ⚠ 세는 수를 손으로 적지 않는다 — 검사를 늘리고 수를 안 고치면 «한 일보다 적게» 적힌다 */
  let 잰수 = 0;
  const 본다 = (이름, 참) => { 잰수 += 1; if (참) console.log(`  ✅ ${이름}`); else { console.log(`  🔴 ${이름}`); 흠 += 1; } };
  const h = 몸통만든다([
    '# 제목', '', '| 갈래 | 수 |', '|---|---|', '| 회원 | **0명** |', '| 결제 | 0원 |', '',
    '- 목록 하나', '- 목록 둘', '', '> 사장님 말씀', '', '```', '코드 <b> 그대로', '```', '',
    '평범한 문단 `코드` 와 **굵게**',
  ].join('\n'));
  본다('표를 <table> 로 그린다', h.includes('<table>') && h.includes('<th>갈래</th>'));
  본다('표 몸줄이 다 들어간다', (h.match(/<tr>/g) || []).length === 3);
  본다('표 안의 **굵게** 가 산다', h.includes('<td><strong>0명</strong></td>'));
  본다('목록을 <ul> 로 묶는다', h.includes('<ul>') && (h.match(/<li>/g) || []).length === 2);
  본다('인용을 <blockquote> 로', h.includes('<blockquote>사장님 말씀</blockquote>'));
  /* 🔴 두 줄에 걸친 굵게가 별표로 새면 안 된다 — 사장님 말씀을 인용하는 자리다 */
  const 두줄인용 = 몸통만든다('> 사장님: **「앞줄\n> 뒷줄」**');
  본다('이어지는 인용줄을 한 덩이로 묶는다', (두줄인용.match(/<blockquote>/g) || []).length === 1);
  본다('두 줄에 걸친 굵게가 별표로 안 샌다',
    두줄인용.includes('<strong>') && !두줄인용.includes('**'));
  본다('코드블록 안은 이스케이프한다', h.includes('&lt;b&gt;'));
  /* ⚠ 이 줄의 첫 판은 «</pre> 를 넘어가서» 뒤 문단의 굵게를 잡아 헛되이 울렸다.
     자가시험이 틀리면 멀쩡한 코드를 고치게 된다 — 검사 자체를 좁게 짠다. */
  const 프레 = (h.match(/<pre>[\s\S]*?<\/pre>/) || [''])[0];
  본다('코드블록 안을 굵게로 바꾸지 않는다', 프레.length > 0 && !프레.includes('<strong>'));
  본다('문단의 `코드` 를 <code> 로', h.includes('<code>코드</code>'));
  /* ⛔ 표 칸 수가 어긋나도 «조용히 버리지 않는다» */
  const h2 = 몸통만든다('| a | b | c |\n|---|---|---|\n| 하나 |');
  본다('칸이 모자란 줄도 버리지 않는다', (h2.match(/<td>/g) || []).length === 3);
  const h3 = 몸통만든다('| a | b |\n|---|---|\n| 하나 | 둘 | 셋 |');
  본다('칸이 넘치는 줄은 머리 수에 맞춘다', (h3.match(/<td>/g) || []).length === 2);
  본다('가름줄 없는 표는 표로 안 본다', !몸통만든다('| a | b |\n| c | d |').includes('<table>'));
  /* ── 고리와 그림 (2026-11-10 사장님 — 「바로보기에 링크를 걸어야지」) ── */
  const 고리 = 몸통만든다('**[JTBC 편성표 바로보기](https://jtbc.co.kr/schedule)**');
  본다('[말](주소)를 고리로 건다', 고리.includes('<a href="https://jtbc.co.kr/schedule">JTBC 편성표 바로보기</a>'));
  본다('고리 둘레의 굵게도 산다', 고리.includes('<strong><a '));
  본다('주소의 & 를 막는다', 몸통만든다('[ㄱ](https://a.b?x=1&y=2)').includes('x=1&amp;y=2'));
  /* 🔴 그림은 파일을 읽어서 박는다 — 바탕 주소가 없어 <img src="파일"> 은 안 뜬다 */
  const 박힌것 = 그림박기('ㄱ.svg', '그림', () => '<svg/>', () => true, '/t');
  본다('그림을 data: 로 박는다', 박힌것.startsWith('<img src="data:image/svg+xml;base64,'));
  본다('그림 종류를 확장자로 가른다',
    그림박기('ㄱ.png', '', () => 'x', () => true, '/t').includes('data:image/png'));
  본다('data: 주소는 그대로 둔다',
    그림박기('data:image/svg+xml;base64,AA', 'ㄱ', () => '', () => false) === '<img src="data:image/svg+xml;base64,AA" alt="ㄱ">');
  본다('🔴 못 찾은 그림을 조용히 지우지 않는다',
    /못 찾았다/.test(그림박기('없다.svg', '시청률', () => '', () => false, '/t')));
  본다('그림(!)이 고리보다 먼저다',
    몸통만든다('![ㄱ](data:image/png;base64,AA)').includes('<img ')
    && !몸통만든다('![ㄱ](data:image/png;base64,AA)').includes('<a href'));
  본다('크롬을 찾았다', Boolean(CHROME));
  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : `\n✅ 자가시험 ${잰수}가지 다 지났다`);
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--시험')) process.exit(자가시험() ? 1 : 0);
  const 인자 = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
  const src = process.argv[2];
  if (!src || !fs.existsSync(src)) {
    console.error('사용법: node scripts/md-to-pdf.mjs <보고.md> [--out 경로.pdf] [--제목 "표지"]');
    process.exit(1);
  }
  const out = 인자('out', src.replace(/\.md$/i, '.pdf'));
  await 만든다(src, out, 인자('제목', null));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`✅ PDF 를 만들었다 — ${out} (${kb}KB)`);
}
