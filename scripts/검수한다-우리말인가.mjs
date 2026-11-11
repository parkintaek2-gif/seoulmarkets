#!/usr/bin/env node
/**
 * 검수한다-우리말인가.mjs — **표준국어대사전에 물어서 순한글인지 가린다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 사장님] 「**순한글 또는 우리말 사전에서 순한글인 지 검수를 해**」
 *
 * ── 왜 이것이 필요한가 ───────────────────────────────────────────────────
 * 그동안은 `순한글-금지어.mjs` 의 «손으로 적은 목록»으로만 걸렀다.
 * 그래서 목록에 없는 말은 전부 통과했고, 손 없는 날 기사에서 사장님이
 * **열일곱 군데를 직접 짚어 주셔야** 걸렸다.
 * ⛔ **내가 목록을 정하면, 목록에 없는 것이 「없는 것」이 된다.**
 *
 * ⇒ 목록이 아니라 **사전에 묻는다.** 국립국어원 표준국어대사전이 정본이다.
 *
 * ── 가리는 법 — 사전 결과 줄의 생김새가 답이다 ──────────────────────────
 * ```
 * 일진4(日辰)「명사」 …   ← 괄호 안에 한자가 있다 ⇒ **한자어**
 * 사흘「명사」 세 날.      ← 한자가 없다          ⇒ **고유어(순한글)**
 * ```
 * ⚠ 한 낱말에 뜻이 여럿이면 한자어 뜻과 고유어 뜻이 섞일 수 있다.
 *   그때는 「섞임」으로 적고 사람이 본다. ⛔ 한쪽으로 단정하지 않는다.
 *
 * ⛔ 크롬 9222 에 붙을 때 브라우저를 통째로 닫는 호출은 금지 — disconnect() 만.
 * ⛔ 연 탭은 그 일이 끝나는 자리에서 닫는다.
 * ⚠ 한 번에 다 묻지 않는다 — `--몇개` 로 끊어 묻고 캐시에 쌓는다.
 *   사전 서버에 무리를 주지 않고, 다음 번에는 물어본 것을 다시 안 묻는다.
 *
 * 쓰는 법
 *   node scripts/검수한다-우리말인가.mjs <글파일> [--몇개 40]
 *   node scripts/검수한다-우리말인가.mjs <글파일> --캐시만   (사전에 안 묻는다)
 *   node scripts/검수한다-우리말인가.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 캐시길 = path.join(뿌리, 'docs', '자료-우리말사전-캐시.json');

/**
 * ⛔ **고유어라고 다 고칠 것이 아니다.** 바꿀 표준 한자어가 «없는» 말이 많다.
 * 「사람」을 「인간」으로, 「있다」를 「존재한다」로 바꾸면 그게 더 이상한 글이 된다.
 * ⇒ 이 목록에 든 말은 사전이 고유어라 해도 보고에서 뺀다. 소음을 줄여야 진짜가 보인다.
 * ⚠ 이 목록은 «내가 정한 것»이다 — 그래서 여기 없는 말은 전부 사람에게 보여 준다.
 *   ⛔ 반대로 하지 않는다. 내가 정한 목록이 «보여 줄 것»을 정하면 또 못 본 것이 생긴다.
 */
export const 그냥쓰는고유어 = new Set([
  '사람', '사람들', '이름', '있다', '없다', '아니다', '하다', '되다', '같다', '보다',
  '그리고', '그러나', '그런데', '다시', '이미', '아직', '가장', '함께', '서로', '모두',
  '어느', '여기', '거기', '무엇', '어떤', '이것', '그것', '저것', '우리', '자기',
  '오늘', '어제', '내일', '올해', '처음', '다음', '나중', '하나', '둘', '셋',
  '날짜', '요일', '주말', '가운데', '아래', '위에', '앞에', '뒤에', '안에', '밖에',
  '말이다', '것이다', '때문', '만큼', '동안', '가지', '군데', '곳에', '쪽에',
]);

/** 체언에 붙는 조사 — 긴 것부터 떼어야 「에서」가 「에」로 잘리지 않는다 */
export const 조사들 = [
  '에서는', '에게는', '으로는', '라고는', '에서도', '으로도', '만큼은',
  '에서', '에게', '으로', '라고', '한테', '처럼', '까지', '부터', '보다', '마저',
  '조차', '밖에', '마다', '이나', '이란', '이라', '하고',
  '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '와', '과', '로', '나',
];

/** 글에서 낱말 후보를 뽑는다 — 한글 2~6음절 덩어리에서 조사를 뗀다 */
export function 낱말뽑기(글) {
  const 것 = new Set();
  for (const 덩이 of String(글 ?? '').match(/[가-힣]{2,10}/g) ?? []) {
    것.add(덩이);
    for (const j of 조사들) {
      if (덩이.length > j.length + 1 && 덩이.endsWith(j)) {
        것.add(덩이.slice(0, 덩이.length - j.length));
        break;
      }
    }
  }
  return [...것].filter((w) => w.length >= 2 && w.length <= 6);
}

/** 사전 결과 글에서 그 낱말의 뜻풀이 줄만 고른다 */
export function 뜻줄고르기(사전글, 낱말) {
  const 줄들 = String(사전글 ?? '').split(/\r?\n/);
  const 꼴 = new RegExp('^' + 낱말 + '(\\d*)(\\(|「|\\[)');
  return 줄들.map((l) => l.trim()).filter((l) => 꼴.test(l));
}

/**
 * 뜻풀이 줄들을 보고 가린다.
 *   고유어 — 한자 표기가 하나도 없다
 *   한자어 — 모든 줄에 한자 표기가 있다
 *   섞임   — 둘이 섞였다 (사람이 본다)
 *   모름   — 사전에 없다
 */
export function 가리기(뜻줄들) {
  const 줄 = (뜻줄들 ?? []).filter(Boolean);
  if (!줄.length) return '모름';
  const 한자있음 = (l) => /\([^)]*[一-鿿][^)]*\)/.test(l);
  const 한자줄 = 줄.filter(한자있음).length;
  if (한자줄 === 0) return '고유어';
  if (한자줄 === 줄.length) return '한자어';
  return '섞임';
}

export function 캐시읽기(길 = 캐시길) {
  try { return JSON.parse(fs.readFileSync(길, 'utf8')); } catch { return {}; }
}
export function 캐시쓰기(값, 길 = 캐시길) {
  fs.mkdirSync(path.dirname(길), { recursive: true });
  fs.writeFileSync(길, JSON.stringify(값, null, 1), 'utf8');
}

async function 사전에묻기(낱말들, 몇개) {
  const 캐시 = 캐시읽기();
  const 물을것 = 낱말들.filter((w) => !(w in 캐시)).slice(0, 몇개);
  if (!물을것.length) return { 캐시, 물은수: 0 };

  const { default: puppeteer } = await import('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  let 물은수 = 0;
  try {
    for (const w of 물을것) {
      const 주소 = 'https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=' + encodeURIComponent(w);
      try {
        await p.goto(주소, { waitUntil: 'networkidle2', timeout: 25000 });
        await new Promise((r) => setTimeout(r, 700));
        const 글 = await p.evaluate(() => (document.querySelector('#content') || document.body).innerText);
        캐시[w] = 가리기(뜻줄고르기(글, w));
      } catch {
        /* ⛔ 못 물어본 것을 「고유어 아님」으로 적지 않는다 — 모름으로 둔다 */
        캐시[w] = '못물음';
      }
      물은수 += 1;
      if (물은수 % 10 === 0) 캐시쓰기(캐시);
    }
  } finally {
    await p.close();
    await b.disconnect();
    캐시쓰기(캐시);
  }
  return { 캐시, 물은수 };
}

async function 주다() {
  if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) return 자가시험();
  const 글길 = process.argv[2];
  if (!글길 || 글길.startsWith('--')) { console.log('쓰는 법: node scripts/검수한다-우리말인가.mjs <글파일> [--몇개 40]'); process.exit(1); }
  const i = process.argv.indexOf('--몇개');
  const 몇개 = i >= 0 ? Number(process.argv[i + 1]) || 40 : 40;
  const 캐시만 = process.argv.includes('--캐시만');

  const 글 = fs.readFileSync(path.resolve(글길), 'utf8');
  const 낱말들 = 낱말뽑기(글);
  const { 캐시, 물은수 } = 캐시만
    ? { 캐시: 캐시읽기(), 물은수: 0 }
    : await 사전에묻기(낱말들, 몇개);

  const 고유어 = 낱말들.filter((w) => 캐시[w] === '고유어' && !그냥쓰는고유어.has(w));
  const 섞임 = 낱말들.filter((w) => 캐시[w] === '섞임');
  const 아직 = 낱말들.filter((w) => !(w in 캐시) || 캐시[w] === '못물음');

  console.log('■ ' + path.basename(글길));
  console.log('   낱말 후보 ' + 낱말들.length + '개 · 이번에 사전에 물은 것 ' + 물은수 + '개');
  console.log('   사전이 «고유어»라고 한 말 ' + 고유어.length + '개');
  if (고유어.length) console.log('     ' + 고유어.join(' · '));
  console.log('   한자어 뜻과 고유어 뜻이 «섞인» 말 ' + 섞임.length + '개 — 사람이 본다');
  if (섞임.length) console.log('     ' + 섞임.join(' · '));
  console.log('   ⬜ 아직 못 물어본 말 ' + 아직.length + '개 — 다시 돌리면 이어서 묻는다');
  console.log('\n⛔ 「고유어」가 전부 틀린 것은 아니다. 대신 쓸 표준 한자어가 있는지 사람이 본다.');
  console.log('   그렇게 정해진 것은 scripts/순한글-금지어.mjs 에 넣어 다음부터 자동으로 걸리게 한다.');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  검('🔴 조사를 떼고 낱말을 뽑는다', 낱말뽑기('날짜를 보고').includes('날짜'));
  검('🔴 긴 조사를 먼저 뗀다', 낱말뽑기('거실에서 본다').includes('거실'));
  검('⛔ 한 글자는 안 뽑는다', 낱말뽑기('그 날 은').every((w) => w.length >= 2));
  검('⛔ 숫자·영문은 안 뽑는다', 낱말뽑기('2027 ABC 사흘').includes('사흘') && 낱말뽑기('2027 ABC').length === 0);

  검('🔴 한자 표기가 있으면 한자어', 가리기(['일진4(日辰)「명사」 날의 간지.']) === '한자어');
  검('🔴 한자 표기가 없으면 고유어', 가리기(['사흘「명사」 「1」 세 날.']) === '고유어');
  검('🔴 섞이면 섞임이라고 적는다',
    가리기(['일진1(一陣)「명사」 무리.', '일진「명사」 그냥.']) === '섞임');
  검('⛔ 사전에 없으면 모름 — 고유어로 단정하지 않는다', 가리기([]) === '모름' && 가리기(null) === '모름');

  const 글 = '사흘「명사」 「1」 세 날.\n다른줄\n사흘하다「동사」 어쩌고';
  검('🔴 그 낱말로 시작하는 뜻줄만 고른다', 뜻줄고르기(글, '사흘').length === 1);
  검('⛔ 빈 글에 안 터진다', 뜻줄고르기(null, '사흘').length === 0);

  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  검('⛔ 브라우저를 닫지 않는다',
    !new RegExp('b[.]clo' + 'se[(]').test(나) && 나.includes('disconnect()'));
  검('⛔ 연 탭을 그 자리에서 닫는다', 나.includes('p.close()') && 나.includes('finally'));
  검('🔴 못 물어본 것을 고유어로 적지 않는다', 나.includes("'못물음'"));
  검('🔴 사장님 지시를 적어 두었다', 나.includes('우리말 사전에서 순한글인 지 검수를 해'));
  /* 🔴 바꿀 한자어가 없는 말까지 올리면 보고가 소음이 된다 — 그러면 진짜가 묻힌다 */
  검('🔴 바꿀 수 없는 고유어는 보고에서 뺀다',
    그냥쓰는고유어.has('사람') && 그냥쓰는고유어.has('있다') && 그냥쓰는고유어.has('그리고'));
  검('⛔ 고칠 수 있는 말까지 빼 버리지 않는다',
    !그냥쓰는고유어.has('사흘') && !그냥쓰는고유어.has('날마다') && !그냥쓰는고유어.has('옛사람'));

  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = String(process.argv[1] ?? '').endsWith('검수한다-우리말인가.mjs');
if (나를직접돌렸나) await 주다();
