#!/usr/bin/env node
/**
 * 더한다-llms에-빠진글.mjs — `public/llms.txt` 에 안 적힌 글을 찾아 더한다.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18 실측] SeoulMarkets 의 `llms.txt` 가 **2026-10-13 에 멈춰 있었다.**
 * 글 237편 가운데 **169편만 적혀 있고 68편이 빠졌다**(29%).
 *
 * ⭐ 영어 두 사이트는 **ChatGPT 가 구글보다 손님을 수십 배 많이 보낸다**
 *   (28일 실측 — K Culture Wire 153명 대 1명). `llms.txt` 는 빈말이 아니라 큰 통로다.
 *   그런데 그 안내문이 한 달 묵었고 새 글의 3분의 1이 없었다.
 *
 * ── ⛔ 이 자가 하지 않는 것 ──────────────────────────────────
 * ⛔ **손으로 쓴 295줄을 건드리지 않는다.** 주제별로 공들여 쓴 글이다.
 *   통째로 자동 생성으로 바꾸면 그 내용을 잃는다.
 * ⇒ 맨 끝에 「## Recently published」 한 칸을 두고 **빠진 것만** 거기 모은다.
 *   다음에 사람이 주제 칸으로 옮기면 이 자가 알아서 중복을 뺀다.
 * ⛔ 설명을 지어내지 않는다 — 글의 frontmatter 에 적힌 description 을 그대로 쓴다.
 *   그것이 없으면 그 글은 **건너뛰고 몇 편을 건너뛰었는지 적는다.**
 *
 * 쓰는 법
 *   node scripts/더한다-llms에-빠진글.mjs            무엇이 빠졌는지만 본다
 *   node scripts/더한다-llms에-빠진글.mjs --한다      실제로 더한다
 *   node scripts/더한다-llms에-빠진글.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const llms = path.join(뿌리, 'public', 'llms.txt');
const 글방 = path.join(뿌리, 'content', 'articles');
export const 칸이름 = '## Recently published';

/** llms.txt 에 이미 적힌 글의 슬러그 */
export function 이미적힌것(글) {
  return new Set([...String(글).matchAll(/seoulmarkets\.com\/article\/([a-z0-9-]+)/g)].map((m) => m[1]));
}

/** frontmatter 에서 한 칸을 꺼낸다. ⛔ 없으면 null — 지어내지 않는다 */
export function 머리칸(글, 이름) {
  /* ⛔ `\s` 는 줄바꿈도 먹는다 — 값이 비면 다음 줄을 끌어온다. 가로 공백만 본다 */
  const m = String(글).match(new RegExp('^' + 이름 + ':[ \\t]*(.+)$', 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '').trim() || null;
}

/** 한 줄로 만든다. ⛔ 설명이 없으면 null — 그 글은 건너뛴다 */
export function 한줄(슬러그, title, description) {
  if (!title || !description) return null;
  /* 마크다운 링크 안의 대괄호는 깨진다 */
  const 깨끗한제목 = String(title).replace(/[[\]]/g, '');
  return `- [${깨끗한제목}](https://seoulmarkets.com/article/${슬러그}): ${String(description).trim()}`;
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });

  본다('① 적힌 글을 찾는다',
    이미적힌것('- [x](https://seoulmarkets.com/article/abc-def): y').has('abc-def'));
  본다('② .md 판도 같은 글로 본다',
    이미적힌것('https://seoulmarkets.com/article/abc-def.md').has('abc-def'));
  본다('③ 남의 주소는 안 센다', 이미적힌것('https://example.com/article/abc').size === 0);
  본다('④ frontmatter 를 읽는다',
    머리칸('---\ntitle: Hello\ndescription: World\n---', 'title') === 'Hello');
  본다('⑤ 따옴표를 뗀다', 머리칸('---\ntitle: "Hi there"\n---', 'title') === 'Hi there');
  /* ⛔ 없는 것을 빈 글자로 바꾸면 llms.txt 에 빈 줄이 들어간다 */
  본다('⑥ 없으면 null', 머리칸('---\ntitle: x\n---', 'description') === null);
  본다('⑦ 빈 값도 null', 머리칸('---\ntitle:   \n---', 'title') === null);
  본다('⑧ 한 줄을 만든다',
    한줄('abc', 'T', 'D') === '- [T](https://seoulmarkets.com/article/abc): D');
  본다('⑨ 설명이 없으면 줄을 안 만든다', 한줄('abc', 'T', null) === null);
  본다('⑩ 제목의 대괄호를 뗀다', 한줄('abc', 'A [B] C', 'D').includes('A B C'));
  본다('⑪ llms.txt 가 있다', fs.existsSync(llms));
  본다('⑫ 글방이 있다', fs.existsSync(글방));
  /* 🔴 이 저장소는 한 줄 설명을 dek 에 적는다. description 으로만 보면 68편이 통째로 샌다 */
  본다('⑬ dek 을 읽는다', 머리칸('---\ntitle: T\ndek: D\n---', 'dek') === 'D');

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest')) process.exit(자가시험() ? 0 : 1);

/* ── 본 일 ───────────────────────────────────────────────── */
const 글 = fs.readFileSync(llms, 'utf8');
const 적힌것 = 이미적힌것(글);

const 더할줄 = [];
let 설명없음 = 0, 초안 = 0;
for (const 이름 of fs.readdirSync(글방)) {
  if (!이름.endsWith('.md')) continue;
  const 슬러그 = 이름.replace(/\.md$/, '');
  if (적힌것.has(슬러그)) continue;
  const 본문 = fs.readFileSync(path.join(글방, 이름), 'utf8');
  /* ⛔ 초안은 안 넣는다 — 손님에게 안 나가는 글이다 */
  if (/^draft:\s*true\s*$/m.test(본문)) { 초안 += 1; continue; }
  /* 🔴 이 저장소의 글은 한 줄 설명을 `dek` 에 적는다. `description` 은 거의 없다.
     ⛔ 「설명 없음 68편」으로 끝낼 뻔했다 — 칸 이름을 짐작하지 말고 글을 열어 본다.
     ⚠ dek 이 길어도 자르지 않는다. 자르면 뜻이 깨지고, AI 에게는 긴 쪽이 낫다. */
  const 줄 = 한줄(슬러그, 머리칸(본문, 'title'),
    머리칸(본문, 'dek') ?? 머리칸(본문, 'description'));
  if (!줄) { 설명없음 += 1; continue; }
  더할줄.push({ 슬러그, 줄 });
}

console.log('\n📏 llms.txt 에 빠진 글\n');
console.log('  이미 적힌 글 :', 적힌것.size, '편');
console.log('  더할 글      :', 더할줄.length, '편');
console.log('  건너뛴 것    : 설명 없음', 설명없음, '편 · 초안', 초안, '편');

if (!더할줄.length) { console.log('\n✅ 빠진 글이 없다\n'); process.exit(0); }
console.log('\n  보기 :');
for (const x of 더할줄.slice(0, 3)) console.log('   ' + x.줄.slice(0, 120));

if (!process.argv.includes('--한다')) {
  console.log('\n   --한다 로 실제로 더한다\n');
  process.exit(0);
}

/* 맨 끝 칸에 더한다. 칸이 이미 있으면 그 안에 이어 붙인다 */
const 끝 = 글.includes('\r\n') ? '\r\n' : '\n';
let 새글;
if (글.includes(칸이름)) {
  /* 칸이 이미 있다 — 그 칸 끝에 붙인다 */
  const 자리 = 글.indexOf(칸이름);
  const 다음칸 = 글.indexOf(끝 + '## ', 자리 + 칸이름.length);
  const 꽂을곳 = 다음칸 < 0 ? 글.length : 다음칸;
  새글 = 글.slice(0, 꽂을곳).replace(/\s+$/, '') + 끝
    + 더할줄.map((x) => x.줄).join(끝) + 끝 + 글.slice(꽂을곳);
} else {
  새글 = 글.replace(/\s+$/, '') + 끝 + 끝
    + 칸이름 + 끝 + 끝
    + '<!-- 🔴 이 칸은 scripts/더한다-llms에-빠진글.mjs 가 채운다.' + 끝
    + '     주제 칸으로 옮겨 적으면 이 자가 알아서 중복을 뺀다. -->' + 끝
    + 더할줄.map((x) => x.줄).join(끝) + 끝;
}
fs.writeFileSync(llms, 새글, 'utf8');
console.log('\n✅ ' + 더할줄.length + '편을 더했다 — ' + path.relative(뿌리, llms));
console.log('⛔ 「넣었다」를 「닿았다」로 읽지 않는다 — 배포해야 ChatGPT 가 본다\n');
