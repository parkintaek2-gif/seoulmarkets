#!/usr/bin/env node
/**
 * fix-kcw-body-doors.mjs — **기사 본문에 나가는 문이 하나도 없는 편에 문을 낸다.**
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * `check-visitor-walk.mjs` 가 이렇게 적어 두었다 —
 *   「꼬리말·이웃기사까지 세면 늘 통과했다. 재는 자리가 틀렸다.
 *    검색으로 온 사람은 첫 화면을 안 거치고 **기사 한 장에 곧장 떨어진다.**」
 * 2026-08-22 실측으로 **111편 중 17편**이 본문에 링크가 0개였다. 그 편에 떨어진 손님은
 * 꼬리말까지 내려가지 않으면 나갈 길이 없다.
 *
 * ── 어떻게 고르나 (⛔ 손으로 안 고른다) ───────────────────────
 * 그 기사의 앞말 `pages:` 에 적힌 **자기 자료 지면**으로 보낸다. 기사가 그 지면의 표로
 * 쓴 것이니 가장 가까운 문이고, 편마다 다르게 나온다.
 * ⛔ 「관련 지면」을 사람이 고르지 않는다 — 다음 기사에서 또 빠진다.
 * ⛔ `pages` 가 빈 기사는 **건드리지 않고 이름을 남긴다.** 없는 문을 지어내지 않는다.
 * ⚠ 이미 본문에 링크가 있는 편은 손대지 않는다(다시 돌려도 같다).
 *
 * 쓰는 법  node scripts/fix-kcw-body-doors.mjs --자가시험
 *          node scripts/fix-kcw-body-doors.mjs --본다      무엇이 바뀔지만 보여 준다
 *          node scripts/fix-kcw-body-doors.mjs --고친다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 본문떼기, 본문에링크있나 } from './lib/kcw-body-links.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CD = path.join(뿌리, 'content/kculturewire');

/** 앞말의 pages 목록. CRLF 로 저장된 편이 섞여 있어 `\s` 를 안 쓴다(8/8 에 한 편을 놓쳤다) */
export const pages읽기 = (원본) => {
  const m = 원본.match(/^pages:[^\S\r\n]*\r?\n((?:[^\S\r\n]+-[^\S\r\n]+.*\r?\n)+)/m);
  if (!m) return [];
  return [...m[1].matchAll(/-[^\S\r\n]+"?([^"\r\n]+?)"?[^\S\r\n]*\r?$/gm)].map((x) => x[1].trim());
};

/* ⭐ 2026-08-22 — 이 규칙이 여기와 check-visitor-walk 두 곳에 베껴져 있었고,
   한쪽만 고쳐서 멀쩡한 기사 열 편이 거짓으로 울렸다. 이제 공용 자리 하나에 둔다 */
export { 본문떼기, 본문에링크있나 } from './lib/kcw-body-links.mjs';

/**
 * 낼 한 줄. 지면이 둘이면 둘 다 건다 — 하나만 걸면 나머지가 또 문 없는 지면이 된다.
 *
 * ⭐ 2026-08-22 — 주소에 `?from=body` 딱지를 붙인다. 서버가 `from` 하나만 남긴다.
 *   까닭: 이레 실측에서 지면 열림 5,026 중 **안쪽 걸음이 296(5.9%)** 이고 「방」은 **0장**이었다.
 *   문을 111편에 냈는데 **어느 자리의 문이 안 눌리는지**를 모르고 있었다. 자리마다 갈라 센다.
 * ⚠ 딱지가 붙어도 링크로 세어진다(`](/`로 시작한다) — `본문에링크있나` 가 그대로 잡는다.
 * ⚠ 보이는 글자에는 딱지를 안 쓴다. 손님 눈에 `?from=body` 를 보일 이유가 없다.
 */
export const 딱지 = '?from=body';
export function 문장만들기(지면들) {
  const 걸이 = 지면들.map((p) => `[kculturewire.com${p}](${p}${딱지})`);
  if (!걸이.length) return null;
  if (걸이.length === 1) return `The table behind this is at ${걸이[0]}.`;
  const 마지막 = 걸이.pop();
  return `The tables behind this are at ${걸이.join(', ')} and ${마지막}.`;
}

/**
 * 🔴🔴 [2026-11-14 · 5번] **「자료 지면이 없는 편」에도 문은 있다 — 태그 지면이다.**
 *
 * 1번이 40편 가운데 21편에 문을 내고 **19편이 남았다**고 적었다. 남은 편은 시청률·
 * 연예 뉴스만 근거로 써서 `pages:` 가 비어 있다. 1번이 물었다 —
 * 「남은 편에 길을 내려면 같은 주제의 자료 지면을 새로 만들어야 합니까」.
 *
 * ⛔ **만들지 않는다.** 주소를 살리려고 자료를 짓는 것은 거꾸로다.
 * ⭐ 우리에겐 이미 **태그 지면**이 있다 — `/tag/1-night-2-days` 처럼 그 주제의 글을 모은 곳이다.
 *   지어낸 문이 아니라 **있는 문**이고, 그 편을 읽은 사람이 다음에 갈 만한 자리다.
 *   실측 — 남은 19편 가운데 **18편**이 이 길로 풀린다.
 *
 * ⚠ 태그를 아무거나 걸지 않는다. `ratings`·`drama` 같은 **두루뭉술한 것은 뒤로 미룬다** —
 *   손님에게도 구글에게도 「그 글 이야기」인 태그가 쓸모 있다.
 * ⚠ 문장도 달라야 한다. 태그 지면은 «표»가 아니라 «모아 둔 곳»이다. 아닌 것을 그렇다고 적지 않는다.
 */
export const 두루뭉술한태그 = new Set([
  'ratings', 'drama', 'variety', 'kpop', 'k-pop', 'music', 'film', 'movies', 'tv',
  'sports', 'football', 'baseball', 'basketball', 'golf', 'esports', 'netflix',
  'wikipedia', 'nielsen-korea', 'charts', 'actors', 'idols', 'reality',
]);

export const 태그슬러그 = (s) => String(s ?? '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** 앞말의 tags 목록 — 슬러그로 바꿔 돌려준다 */
export function tags읽기(원본) {
  const m = /^tags:[^\S\r\n]*\[([^\]]*)\]/m.exec(String(원본 ?? ''));
  if (!m) return [];
  return m[1].split(',').map((x) => 태그슬러그(x.replace(/["']/g, ''))).filter(Boolean);
}

/**
 * 걸 태그 하나를 고른다 — **있는 태그 지면 가운데 가장 또렷한 것**.
 * ⛔ 없는 태그 지면은 안 건다. 지어낸 문이 된다.
 */
export function 태그고르기(원본, 있는태그) {
  const 것 = tags읽기(원본).filter((t) => 있는태그 && 있는태그.has(t));
  if (!것.length) return null;
  const 또렷한것 = 것.filter((t) => !두루뭉술한태그.has(t));
  return (또렷한것.length ? 또렷한것 : 것)[0];
}

/** 태그 지면으로 가는 한 줄. ⚠ 「표」라고 적지 않는다 — 모아 둔 곳이다 */
export function 태그문장만들기(태그) {
  if (!태그) return null;
  const 길 = `/tag/${태그}`;
  return `Everything we have filed under this subject is at [kculturewire.com${길}](${길}${딱지}).`;
}

/** 한 편을 고친 결과를 돌려준다. ⛔ 파일을 쓰지 않는다 — 쓰는 것은 부르는 쪽이다 */
export function 한편고치기(원본, 있는태그 = null) {
  if (본문에링크있나(원본)) return { 꼴: '그대로', 새것: 원본 };
  const 지면 = pages읽기(원본);
  /* ① 자기 자료 지면이 가장 가까운 문이다 */
  let 문장 = 문장만들기(지면);
  /* ② 없으면 태그 지면 — «있는» 것만. 지어내지 않는다 */
  if (!문장) 문장 = 태그문장만들기(태그고르기(원본, 있는태그));
  if (!문장) {
    return { 꼴: '못한다', 새것: 원본, 말: 'pages 도 비었고 걸 만한 태그 지면도 없다 — 없는 문을 지어내지 않는다' };
  }
  const 끝 = /\r\n/.test(원본) ? '\r\n' : '\n';
  const 몸 = 원본.replace(/[\r\n]+$/, '');
  return { 꼴: '고쳤다', 새것: `${몸}${끝}${끝}${문장}${끝}`, 문장 };
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  let 검한수 = 0;
  const 검 = (이름, 참) => { 검한수 += 1; if (!참) 실패.push(이름); };
  const 앞말 = (지면) => `---\ntitle: "x"\npages:\n${지면.map((p) => `  - "${p}"`).join('\n')}\n---\n\nBody text.\n`;

  검('지면 하나면 한 줄',
    문장만들기(['/places']) === 'The table behind this is at [kculturewire.com/places](/places?from=body).');
  검('지면 둘이면 둘 다 건다',
    문장만들기(['/a', '/b']).includes('](/a?from=body)') && 문장만들기(['/a', '/b']).includes('](/b?from=body)'));
  /* ⭐ 보이는 글자에는 딱지가 없다 — 손님 눈에 `?from=body` 를 보일 이유가 없다 */
  검('⛔ 보이는 글자에 딱지를 안 쓴다', 문장만들기(['/places']).includes('[kculturewire.com/places]'));
  검('⭐ 딱지가 붙어도 본문 링크로 세어진다', 본문에링크있나(`---\nx: 1\n---\n\n${문장만들기(['/places'])}\n`));
  검('빈 지면은 문장을 안 만든다', 문장만들기([]) === null);

  const r = 한편고치기(앞말(['/places']));
  검('본문 끝에 붙인다', r.꼴 === '고쳤다' && r.새것.trim().endsWith('](/places?from=body).'));
  검('앞말을 안 건드린다', r.새것.startsWith('---\ntitle: "x"'));
  검('고친 뒤에는 본문에 링크가 있다', 본문에링크있나(r.새것) === true);
  검('두 번 돌려도 한 번만 붙는다', 한편고치기(r.새것).꼴 === '그대로');
  검('pages 가 비면 안 고치고 이름을 남긴다', 한편고치기('---\ntitle: "x"\n---\n\nBody.\n').꼴 === '못한다');
  /* 🔴 [2026-11-14] pages 가 비어도 «있는» 태그 지면이면 문이 된다 */
  const 태그앞말 = (t) => `---\ntitle: "x"\ntags: [${t.map((x) => `"${x}"`).join(', ')}]\n---\n\nBody.\n`;
  const 있는것 = new Set(['1-night-2-days', 'ratings', 'kim-hyun-joo']);
  검('tags 를 읽는다', JSON.stringify(tags읽기(태그앞말(['1 night 2 days', 'ratings']))) === JSON.stringify(['1-night-2-days', 'ratings']));
  검('있는 태그를 고른다', 태그고르기(태그앞말(['1 night 2 days']), 있는것) === '1-night-2-days');
  검('⭐ 두루뭉술한 것보다 또렷한 것을 먼저 고른다',
    태그고르기(태그앞말(['ratings', 'kim hyun-joo']), 있는것) === 'kim-hyun-joo');
  검('또렷한 것이 없으면 두루뭉술한 것이라도 건다', 태그고르기(태그앞말(['ratings']), 있는것) === 'ratings');
  검('⛔ 없는 태그 지면은 안 건다 — 지어낸 문이 된다', 태그고르기(태그앞말(['nope']), 있는것) === null);
  검('⛔ 있는태그를 안 주면 아무것도 안 건다', 태그고르기(태그앞말(['1 night 2 days']), null) === null);
  검('⚠ 태그 문장은 「표」라고 말하지 않는다', !태그문장만들기('x').includes('table'));
  검('태그 문장도 본문 링크로 세어진다', 본문에링크있나(`---\nx: 1\n---\n\n${태그문장만들기('x')}\n`));
  검('태그가 없으면 문장도 없다', 태그문장만들기(null) === null);
  const t1 = 한편고치기(태그앞말(['1 night 2 days']), 있는것);
  검('pages 가 비어도 태그로 고친다', t1.꼴 === '고쳤다' && t1.새것.includes('](/tag/1-night-2-days?from=body)'));
  검('⛔ 태그 지면도 없으면 그대로 못 고친다', 한편고치기(태그앞말(['nope']), 있는것).꼴 === '못한다');
  검('⭐ 자기 자료 지면이 있으면 그쪽이 먼저다',
    한편고치기(`---\ntitle: "x"\ntags: ["1 night 2 days"]\npages:\n  - "/places"\n---\n\nBody.\n`, 있는것)
      .새것.includes('](/places?from=body)'));
  /* ⚠ CRLF 로 저장된 편이 섞여 있다 — 줄끝을 지켜야 한 파일이 통째로 바뀐 것처럼 보이지 않는다 */
  검('CRLF 파일은 CRLF 로 붙인다', 한편고치기(앞말(['/x']).replace(/\n/g, '\r\n')).새것.endsWith('\r\n'));
  검('앞말 안의 링크를 본문 링크로 안 센다', 본문에링크있나('---\nx: "[a](/b)"\n---\n\nplain\n') === false);
  /**
   * 🔴🔴 이 칸이 없어서 흠이 조용히 지나갔다 — 자가시험 10개가 다 통과하는데
   *   10편에 같은 문이 두 번 붙었다. 시험이 **안 보던 자리**가 여기였다.
   */
  const 절대문 = (주소) => `---\nx: 1\n---\n\nsee [it](${주소}).\n`;
  검('⭐⭐ 전체 주소로 건 문도 문으로 센다',
    본문에링크있나(절대문('https://www.kculturewire.com/places')) === true);
  검('⭐ www 없는 주소도 센다',
    본문에링크있나(절대문('https://kculturewire.com/places')) === true);
  검('⛔ 남의 집 주소는 문이 아니다',
    본문에링크있나(절대문('https://example.com/places')) === false);

  if (실패.length) { console.error('❌ 자가시험 실패\n' + 실패.map((s) => `   · ${s}`).join('\n')); process.exit(1); }
  console.log(`✅ fix-kcw-body-doors 자가시험 ${검한수}개 통과`);
  process.exit(0);
}

const 고친다 = process.argv.includes('--고친다');
if (!고친다 && !process.argv.includes('--본다')) {
  console.error('⛔ --본다 나 --고친다 를 준다. 그냥 돌리지 않는다(글을 건드리는 자다)');
  process.exit(1);
}

/**
 * 🔴 [2026-11-14] 걸 수 있는 태그 지면을 **지어진 것에서 읽는다.**
 *   ⛔ 목록을 여기 손으로 적지 않는다 — 적는 순간 늘어난 태그를 못 따라간다.
 *   ⚠ dist 가 없으면 태그 길은 안 쓴다. 「없는 문을 지어내지 않는다」가 먼저다.
 */
const 태그방 = path.join(뿌리, 'dist', 'wikitip', 'tag');
const 있는태그 = new Set(
  fs.existsSync(태그방) ? fs.readdirSync(태그방).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')) : [],
);
if (!있는태그.size) {
  console.log('⚠ dist/wikitip/tag 가 없다 — 태그 지면으로는 문을 안 낸다. 먼저 짓는다.');
}

const 고침 = [];
const 못함 = [];
for (const f of fs.readdirSync(CD).filter((x) => x.endsWith('.md'))) {
  const 길 = path.join(CD, f);
  const 원본 = fs.readFileSync(길, 'utf8');
  if (/^draft:[^\S\r\n]*true/m.test(원본)) continue;
  const r = 한편고치기(원본, 있는태그);
  if (r.꼴 === '그대로') continue;
  if (r.꼴 === '못한다') { 못함.push(`${f} — ${r.말}`); continue; }
  고침.push(`${f} — ${r.문장}`);
  if (고친다) fs.writeFileSync(길, r.새것);
}

console.log(`${고친다 ? '고쳤다' : '고칠 것'} ${고침.length}편`);
for (const s of 고침) console.log(`   · ${s}`);
if (못함.length) {
  console.log(`\n⚠ 못 고친 것 ${못함.length}편 — 자기 자료 지면도 태그 지면도 없다. 지어내지 않는다`);
  for (const s of 못함) console.log(`   · ${s}`);
}
if (!고친다) console.log('\n⚠ 아직 아무 파일도 안 바꿨다. 바꾸려면 --고친다');
