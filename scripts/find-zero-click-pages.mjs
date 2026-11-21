/**
 * 「보이는데 안 눌리는 지면」을 찾는다 — 유닛 누구나 --도메인=·--접두= 만 바꿔 쓴다.
 *
 * 왜 만들었나 (2026-08-27 02:2x · 5번)
 *   `/article/bts-is-not-a-seoul-band` 가 **노출 165 · 클릭 0** 이었다. 순위는 2~7 이었다.
 *   순위 2 면 보통 열에 한 명은 누른다. 원인을 파 보니 셋 다 우리가 만든 것이었다 —
 *     ① 제목이 96자여서 구글이 잘랐고, 잘린 앞쪽에는 «답»만 있었다
 *     ② 제목이 답을 다 말했다 — 「V and Suga from Daegu」. 안 눌러도 답이 나온다
 *     ③ 설명이 214자여서 클릭 이유였던 뒷부분이 잘렸다
 *   그 하나를 손으로 찾는 데 한참 걸렸다. **같은 함정이 몇 개나 더 있는지** 세는 자가 없었다.
 *
 * ⛔ 이 자는 «판정»하지 않는다. 「노출이 큰데 클릭이 0이고, 제목이 N자다」까지만 말한다.
 *    제목만 읽고 답이 끝나는지는 **사람이 본다** — 기계가 뜻을 못 읽는다.
 * ⛔ 못 잰 것은 「못잼」으로 적는다. 빌드 결과에서 지면을 못 찾으면 
 *
 * 쓰기
 *   node scripts/find-zero-click-pages.mjs                       (기본: kculturewire)
 *   node scripts/find-zero-click-pages.mjs --도메인=100yearmap.com --접두=100y
 *   node scripts/find-zero-click-pages.mjs --최소노출=30
 *   node scripts/find-zero-click-pages.mjs --자가시험
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 구글이 검색 결과에서 대략 보여 주는 길이. 넘으면 뒤가 잘린다. */
export const 제목한계 = 60;
export const 설명한계 = 155;

/** `<title>` 에서 사이트 이름 꼬리(「 | K Culture Wire」)를 떼고 «지면 제목만» 센다 */
export function 제목뽑기(글자) {
  if (typeof 글자 !== 'string') return null;
  const m = 글자.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  /* ⚠ 꼬리 구분자가 유닛마다 다르다 — 파이프·엠대시·하이픈을 다 본다.
     ⛔ 맨 앞 조각을 쓰지 않는다. 제목 «안»에 엠대시가 있는 일이 흔하다(우리 제목이 그렇다).
        마지막 구분자 뒤만 꼬리로 본다. */
  /* 🔴 2026-08-27 03:3x — **이 줄이 반쪽이었다.** 설명뽑기에는 `&#39;` 되돌리기를 넣었는데
     여기엔 안 넣어서, `Korea&#39;s` 가 5자로 셈돼 제목 길이를 **실제보다 길게** 냈다.
     그래서 이미 60자 안인 제목을 「넘는다」고 잘못 표시했다. 두 함수를 같은 규칙으로 맞춘다.
     ⚠ 같은 일을 두 곳에 적으면 이렇게 갈라진다 — 되돌릴 것이 늘면 «둘 다» 고친다. */
  const 풀 = m[1].replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
  const 자리 = Math.max(풀.lastIndexOf(' | '), 풀.lastIndexOf(' — '), 풀.lastIndexOf(' - '));
  return 자리 > 0 ? 풀.slice(0, 자리).trim() : 풀;
}

/**
 * 🔴 2026-08-27 02:3x — **여기서 자가 부러졌다.**
 *   처음엔 닫는 따옴표를 `["']` 로 썼다. 그러면 `content="Korea's top 300 …"` 처럼
 *   **글 안에 작은따옴표가 있으면 거기서 멈춘다.** 231자짜리 설명이 「Korea」 5자로 찍혔다.
 *   그리고 나는 그 5자를 «발견»으로 읽고 「설명이 없다」고 보고할 뻔했다.
 *   ⭐ 극단값(5자·0·100%)이 나오면 **자를 먼저 의심한다.** 여기가 그 자리였다.
 *   ⛔ 열린 따옴표를 잡아 «같은 것»으로 닫는다(역참조 \1). 짝을 안 맞추면 또 부러진다.
 */
export function 설명뽑기(글자) {
  if (typeof 글자 !== 'string') return null;
  const m = 글자.match(/<meta\s+name=(["'])description\1\s+content=(["'])([\s\S]*?)\2/i);
  return m ? m[3].replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim() : null;
}

/** 주소 → 빌드 결과 파일 자리. 접두 밑을 먼저 보되 접두 없는 자리도 버리지 않는다. */
export function 파일자리들(주소, 뿌리경로, 접두 = '') {
  const 이름 = (주소 || '/').split('?')[0].split('#')[0].replace(/\/$/, '').replace(/^\//, '');
  const 자리 = [];
  const 붙임 = (밑) => {
    if (이름 === '') {
      if (밑 !== 뿌리경로) 자리.push(`${밑}.html`);
      자리.push(path.join(밑, 'index.html'));
      return;
    }
    자리.push(path.join(밑, `${이름}.html`));
    자리.push(path.join(밑, 이름, 'index.html'));
  };
  if (접두) 붙임(path.join(뿌리경로, 접두));
  붙임(뿌리경로);
  return 자리;
}

export function 글자읽기(주소, 뿌리경로, 접두 = '') {
  for (const 자리 of 파일자리들(주소, 뿌리경로, 접두)) {
    if (existsSync(자리) && statSync(자리).isFile()) return readFileSync(자리, 'utf8');
  }
  return null;
}

/** GSC 보고서 한 줄에서 수를 뽑는다. ⚠ 우리 보고서 글꼴에 맞춘 것이다. */
export function 줄읽기(줄) {
  const 주소 = (줄.match(/https?:\/\/[^/\s]+(\/[^\s]*)/) || [])[1];
  if (!주소) return null;
  const 노출 = Number((줄.match(/노출\s+(\d+)/) || [])[1] ?? NaN);
  const 클릭 = Number((줄.match(/클릭\s+(\d+)/) || [])[1] ?? NaN);
  const 순위 = Number((줄.match(/순위\s+([\d.]+)/) || [])[1] ?? NaN);
  if (!Number.isFinite(노출) || !Number.isFinite(클릭)) return null;
  return { 주소, 노출, 클릭, 순위 };
}

/* ── 자가시험 ─────────────────────────────────────────── */
/**
 * 🔴 2026-08-27 04:3x — **자가시험도 «직접 부를 때만» 돈다.**
 *   `check-meta-length.mjs` 가 이 파일의 함수를 갖다 쓰는데, 그쪽에서 `--자가시험` 을 주자
 *   **이 파일의 자가시험이 먼저 돌고 `process.exit` 로 끝나** 정작 그쪽 시험이 한 개도
 *   안 돌았다. 그런데 화면에는 「✅ 18개 다 통과」가 떠서 **통과한 줄 알았다.**
 *   ⛔ 이런 흠은 초록으로 보인다 — 그게 가장 나쁘다.
 *   ⚠ 본짓에만 관문을 달고 자가시험에는 안 달면 이 구멍이 남는다. 둘 다 단다.
 */
const 이파일직접 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일직접 && process.argv.includes('--자가시험')) {
  let 깨짐 = 0;
  const 본다 = (이름, 참) => { if (참) console.log(`  ✅ ${이름}`); else { console.log(`  ❌ ${이름}`); 깨짐 += 1; } };
  console.log('자가시험 — find-zero-click-pages');
  본다('제목에서 사이트 꼬리를 뗀다',
    제목뽑기('<title>ABC | K Culture Wire</title>') === 'ABC');
  /* 🔴 이 하나가 이 자의 핵심이다 — 우리 제목에는 엠대시가 «안»에 있다.
     맨 앞 조각을 쓰면 「BTS hometowns: Daegu, Busan and three more cities」 로 잘려
     제목 길이를 **실제보다 짧게** 세고, 「안 잘린다」는 틀린 안심을 준다. */
  본다('제목 «안»의 엠대시를 꼬리로 오해하지 않는다',
    제목뽑기('<title>A — B — C | Site</title>') === 'A — B — C');
  본다('&mdash; 를 글자로 되돌린다',
    제목뽑기('<title>A &mdash; B | Site</title>') === 'A — B');
  본다('꼬리가 없으면 통째로 준다', 제목뽑기('<title>ABC</title>') === 'ABC');
  본다('title 이 없으면 못잼(null)', 제목뽑기('<p>x</p>') === null);
  본다('글자가 아니면 못잼(null)', 제목뽑기(null) === null);
  본다('설명을 뽑는다',
    설명뽑기('<meta name="description" content="hello">') === 'hello');
  본다('설명이 없으면 못잼(null)', 설명뽑기('<p>x</p>') === null);
  /* 🔴 아래 셋이 02:3x 의 «부러진 자»를 다시 못 일어나게 막는다 */
  본다('큰따옴표 안의 «작은»따옴표에서 멈추지 않는다',
    설명뽑기(`<meta name="description" content="Korea's top 300 players win 53.65%">`)
      === "Korea's top 300 players win 53.65%");
  본다('작은따옴표로 감싼 것도 읽는다',
    설명뽑기(`<meta name='description' content='he said "no" today'>`) === 'he said "no" today');
  본다('&#39; 를 글자로 되돌린다',
    설명뽑기('<meta name="description" content="Korea&#39;s top">') === "Korea's top");
  /* 🔴 03:3x — 제목뽑기에만 이 처리가 빠져 «길이를 부풀려» 재고 있었다 */
  본다('제목에서도 &#39; 를 되돌린다 — 길이를 부풀리지 않는다',
    제목뽑기('<title>Korea&#39;s ladder | Site</title>') === "Korea's ladder");
  본다('제목의 &rsquo; 도 되돌린다',
    제목뽑기('<title>Korea&rsquo;s ladder</title>') === "Korea's ladder");
  본다('GSC 줄에서 수를 뽑는다', (() => {
    const r = 줄읽기('   노출    165 · 클릭    0 · 순위 8.5   https://www.kculturewire.com/article/x');
    return r && r.노출 === 165 && r.클릭 === 0 && r.순위 === 8.5 && r.주소 === '/article/x';
  })());
  본다('클릭 0 과 «못잼» 을 가른다 — 0 은 수다', (() => {
    const r = 줄읽기('   노출    10 · 클릭    0 · 순위 3   https://x.com/a');
    return r && r.클릭 === 0;
  })());
  본다('수가 없는 줄은 null', 줄읽기('그냥 글') === null);
  본다('접두를 주면 접두 밑을 먼저 본다',
    파일자리들('/a', 'D', 'w')[0] === path.join('D', 'w', 'a.html'));
  본다('접두를 줘도 접두 없는 자리를 버리지 않는다',
    파일자리들('/a', 'D', 'w').includes(path.join('D', 'a.html')));
  console.log(깨짐 === 0 ? `\n✅ 18개 다 통과` : `\n❌ ${깨짐}개 깨짐`);
  process.exit(깨짐 === 0 ? 0 : 1);
}

/* ── 본짓 ─────────────────────────────────────────────── */
if (이파일직접) {
  const 도메인 = process.argv.find((a) => a.startsWith('--도메인='))?.split('=')[1] ?? 'kculturewire.com';
  const 뿌리이름 = process.argv.find((a) => a.startsWith('--뿌리='))?.split('=')[1] ?? 'dist';
  const 최소노출 = Number(process.argv.find((a) => a.startsWith('--최소노출='))?.split('=')[1]) || 20;
  const 접두인자 = process.argv.find((a) => a.startsWith('--접두='));
  const 접두 = 접두인자 ? 접두인자.split('=')[1] : (도메인.includes('kculturewire') ? 'wikitip' : '');
  const 뿌리경로 = path.join(뿌리, 뿌리이름);

  /* GSC 보고서를 그대로 불러 쓴다 — 열쇠 다루는 자리를 둘로 만들지 않는다 */
  const { execFileSync } = await import('node:child_process');
  let 출력 = '';
  try {
    출력 = execFileSync('node', [
      path.join(뿌리, 'scripts/search-console-report.mjs'),
      `sc-domain:${도메인}`, '--days', '28', '--축=page', '--행수=1000',
    ], { encoding: 'utf8', cwd: 뿌리, maxBuffer: 40 * 1024 * 1024 });
  } catch (e) {
    console.log(`❌ GSC 를 못 읽었다 — ${e.message.slice(0, 200)}`);
    process.exit(1);
  }

  const 줄들 = 출력.split(/\r?\n/).map(줄읽기).filter(Boolean);
  const 후보 = 줄들.filter((r) => r.노출 >= 최소노출 && r.클릭 === 0)
    .sort((a, b) => b.노출 - a.노출);

  console.log(`# 보이는데 안 눌리는 지면 — ${도메인} · 최근 28일`);
  console.log(`⚠ 「클릭 0」은 판정이 아니다. 노출 ${최소노출} 이상인데 한 번도 안 눌린 지면을 «후보»로 낸다.\n`);
  console.log(`  지면                                       노출  순위  제목자  설명자`);
  console.log(`  ${'─'.repeat(72)}`);

  let 긴제목 = 0; let 긴설명 = 0; let 못잰것 = 0; let 잃은노출 = 0;
  for (const r of 후보.slice(0, 25)) {
    const 글 = 글자읽기(r.주소, 뿌리경로, 접두);
    const 제목 = 제목뽑기(글);
    const 설명 = 설명뽑기(글);
    잃은노출 += r.노출;
    if (제목 === null) 못잰것 += 1;
    else if (제목.length > 제목한계) 긴제목 += 1;
    if (설명 !== null && 설명.length > 설명한계) 긴설명 += 1;
    const 칸 = (r.주소.length > 40 ? `${r.주소.slice(0, 37)}…` : r.주소).padEnd(40);
    const ㅈ = 제목 === null ? ' 못잼' : String(제목.length).padStart(4) + (제목.length > 제목한계 ? '🔴' : '  ');
    const ㅅ = 설명 === null ? ' 못잼' : String(설명.length).padStart(4) + (설명.length > 설명한계 ? '🔴' : '  ');
    console.log(`  ${칸}${String(r.노출).padStart(5)}${String(r.순위).padStart(6)}  ${ㅈ}  ${ㅅ}`);
  }

  console.log('');
  console.log(`⭐ 노출 ${최소노출} 이상인데 «클릭 0» 인 지면 ${후보.length}장 · 그 지면들이 받은 노출 합 ${잃은노출}`);
  if (못잰것) console.log(`⚠ 그중 ${못잰것}장은 빌드 결과에서 못 찾았다 — 「못잼」이지 0 이 아니다. 먼저 빌드하십시오.`);
  console.log(`🔴 제목이 ${제목한계}자를 넘는 것 ${긴제목}장 — 넘으면 구글이 잘라 «클릭 이유»가 사라진다`);
  console.log(`🔴 설명이 ${설명한계}자를 넘는 것 ${긴설명}장 — 잘린 자리에 클릭 이유가 있었을 수 있다`);
  console.log('');
  console.log('⛔ 길이가 맞아도 안 눌릴 수 있다. 다음은 «사람이» 봐야 한다 —');
  console.log('   **제목만 읽고 답이 끝나는가?** 끝나면 손님은 누를 까닭이 없다.');
  console.log('   그때는 답을 «감추지» 말고, 제목에 다 못 담는 더 큰 것을 가리키게 고친다.');
  console.log('⛔ 고쳤으면 `src/data/kcw-title-experiments.json` 에 전 값과 다시 잴 날을 적는다.');
  console.log('   GSC 는 28일 창이라 28일이 지나야 «바뀐 뒤만» 담긴 수가 된다.');
}
