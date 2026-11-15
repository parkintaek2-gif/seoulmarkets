#!/usr/bin/env node
/**
 * check-리뷰분류.mjs — 리뷰 글의 `category` 가 **있는 코드인지** 본다.
 *
 * ## 🔴 왜 이 검사가 생겼나 (2026-11-15 · 5번)
 *
 *   `content/kcw-reviews/vleague-gs-soop-2026-11-14.md` 가 `category: volleyball` 로
 *   들어와 있었다. **그런 코드는 없다.** 사장님이 2026-10-28 에 정하셨다 —
 *   *「배구는 제 칸을 두지 않고 **스포츠종합**이 받는다」* (메뉴가 길어지면 안 된다).
 *
 *   그런데 이게 **빌드에서 터졌다.** Astro 의 content schema 가 막아서
 *   `npm run build` 가 통째로 죽었고, **백년지도·K컬처와이어 배포가 함께 섰다.**
 *   글 한 편의 글자 하나가 네 사이트의 배포를 멈춘 것이다.
 *
 *   ⇒ 스키마는 마지막 그물이지 **거르는 자리가 아니다.** 빌드까지 가기 전에 잡는다.
 *
 * ## ⚠ 「틀렸다」로 끝내지 않는다
 *
 *   다음 사람이 또 `volleyball` 을 적을 것이다 — 배구를 배구라고 적는 것이 자연스럽기
 *   때문이다. 그래서 **어느 코드로 가야 하는지 글자로 알려 준다.**
 *
 * 쓰는 법
 *   node scripts/check-리뷰분류.mjs
 *   node scripts/check-리뷰분류.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 사람이 적기 쉬운 말 → 실제 코드.
 * ⛔ 여기에 적는다고 그 코드가 생기는 것이 아니다. **옮겨 줄 자리를 알려 줄 뿐이다.**
 */
export const 흔한잘못 = {
  volleyball: 'sports',
  배구: 'sports',
  volley: 'sports',
  baseball_kbo: 'baseball',
  야구: 'baseball',
  축구: 'football',
  농구: 'basketball',
  골프: 'golf',
  이스포츠: 'esports',
  'e스포츠': 'esports',
  스포츠: 'sports',
  스포츠종합: 'sports',
  tennis: 'sports',
  테니스: 'sports',
  swimming: 'sports',
  volleyball_women: 'sports',
};

/** `리뷰분류.mjs` 에서 코드 목록을 읽는다. ⛔ 목록을 여기 두 벌로 적지 않는다 */
export function 분류코드읽기(글) {
  return [...String(글).matchAll(/코드:\s*'([a-z-]+)'/g)].map((m) => m[1]);
}

/** 머리말에서 category 값을 뽑는다. 없으면 null */
export function 분류뽑기(글) {
  const m = String(글).match(/^category:\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '').trim() || null;
}

/** 한 편을 본다. 괜찮으면 null, 아니면 무엇이 잘못됐는지 */
export function 한편본다(글, 있는코드) {
  const c = 분류뽑기(글);
  if (c == null) return { 까닭: '머리말에 category 가 없다', 값: null, 대신: null };
  if (있는코드.includes(c)) return null;
  return { 까닭: '그런 분류 코드가 없다', 값: c, 대신: 흔한잘못[c] ?? null };
}

if (process.argv.includes('--자가시험')) {
  const 코드 = ['kpop', 'baseball', 'sports', 'basketball'];
  const 본 = [
    ['category: sports\ntitle: x', null],
    ['category: volleyball', 'volleyball→sports'],
    ['category: "baseball"', null],
    ['title: x', '없음'],
    ['category: nosuchthing', 'nosuchthing→(모름)'],
  ];
  let 통과 = 0;
  for (const [글, 나와야] of 본) {
    const r = 한편본다(글, 코드);
    const 나옴 = r == null ? null : r.값 == null ? '없음' : r.값 + '→' + (r.대신 ?? '(모름)');
    if (나옴 === 나와야) 통과 += 1;
    else console.log('  X [' + 글.replace(/\n/g, '\\n') + '] -> ' + 나옴 + ' (와야 할 것 ' + 나와야 + ')');
  }
  /* 목록 읽기도 잰다 — 정규식이 어긋나면 「코드가 0개」라 모든 글이 틀린 것이 된다 */
  const 진짜코드 = 분류코드읽기(fs.readFileSync(path.join(뿌리, 'src/lib/리뷰분류.mjs'), 'utf8'));
  const 목록통과 = 진짜코드.length >= 8 && 진짜코드.includes('sports') && 진짜코드.includes('baseball');
  if (목록통과) 통과 += 1;
  else console.log('  X 분류 코드 목록을 못 읽었다 — ' + 진짜코드.length + '개: ' + 진짜코드.join(','));
  console.log('자가시험 ' + 통과 + '/' + (본.length + 1));
  process.exit(통과 === 본.length + 1 ? 0 : 1);
}

/* ── 본 검사 ── */
const 있는코드 = 분류코드읽기(fs.readFileSync(path.join(뿌리, 'src/lib/리뷰분류.mjs'), 'utf8'));
if (있는코드.length < 8) {
  console.error('⛔ 분류 코드 목록을 못 읽었다 (' + 있는코드.length + '개). 검사를 믿을 수 없다');
  process.exit(1);
}

const 볼곳 = [path.join(뿌리, 'content/kcw-reviews')];
const 파일 = [];
for (const d of 볼곳) {
  if (!fs.existsSync(d)) continue;
  (function 훑기(자리) {
    for (const f of fs.readdirSync(자리)) {
      const p = path.join(자리, f);
      if (fs.statSync(p).isDirectory()) 훑기(p);
      else if (f.endsWith('.md')) 파일.push(p);
    }
  })(d);
}

const 걸린것 = [];
for (const p of 파일) {
  const r = 한편본다(fs.readFileSync(p, 'utf8'), 있는코드);
  if (r) 걸린것.push({ p, ...r });
}

console.log('■ 리뷰 분류 검사 — ' + 파일.length + '편 · 있는 코드 ' + 있는코드.length + '개');
if (!걸린것.length) {
  console.log('✅ 모두 있는 코드다');
  process.exit(0);
}
console.log('🔴 ' + 걸린것.length + '편이 걸렸다 — **이대로 두면 `npm run build` 가 통째로 죽고 네 사이트 배포가 선다**\n');
for (const x of 걸린것) {
  console.log('   ' + path.relative(뿌리, x.p));
  console.log('      ' + x.까닭 + (x.값 ? ' — [' + x.값 + ']' : ''));
  if (x.대신) console.log('      → ' + x.대신 + ' 으로 적습니다');
  else console.log('      → 쓸 수 있는 코드: ' + 있는코드.join(' · '));
}
console.log('\n⚠ 사장님 2026-10-28 — 「배구는 제 칸을 두지 않고 스포츠종합(sports)이 받는다」');
process.exit(1);
