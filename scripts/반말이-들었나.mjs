#!/usr/bin/env node
/**
 * 반말이-들었나.mjs — **밖으로 나가는 글에 반말이 들었는지 봅니다.**
 *
 * ── 🔴🔴 왜 만드나 (2026-11-19 23:35 · 5번) ─────────────────────────
 * 사장님 — 「**반말이네 미쳤구나**」 · 「**업무보고가 반말. 그러니 내가 더 뭐라했지**」
 *
 * 첫 지적을 받고 도구가 찍는 글만 고쳤습니다. 정작 사장님께 가는 **보고서는 반말 그대로**
 * 두고 다시 보냈습니다. 그리고 그 보고서는 금지어 검사를 **통과**했습니다.
 *
 *   밖으로나가는말-관문.mjs  금지어만 봅니다. 반말은 안 봅니다
 *   check-보고말투.mjs       「유입」 같은 낱말만 봅니다. 반말은 안 봅니다
 *   send-mail.mjs            «본문»만 봅니다. **첨부 파일은 한 글자도 안 봅니다**
 *
 * ⇒ 반말을 잡는 검사가 어디에도 없었습니다. 그래서 만듭니다.
 *
 * ── 무엇을 반말로 보나 ──────────────────────────────────────────
 *   문장이 「~다」로 끝나는데 「~습니다 · ~ㅂ니다」가 아니면 반말입니다.
 *   「했다 · 이다 · 없다 · 한다 · 간다」가 그것입니다.
 *   ⛔ 개조식으로 쓰려면 **명사로 끝냅니다** — 「작성 완료」, 「2편 발행」.
 *
 * ⛔ 인용(「」 안)은 세지 않습니다. 사장님 말씀을 원문 그대로 적어야 하기 때문입니다.
 * ⛔ 코드 블록(```)과 주석은 세지 않습니다. 사람에게 하는 말이 아닙니다.
 * ⛔ 이 검사는 «밖으로 나가는 글»에만 씁니다. 코드 주석·커밋 글·지시 대장은 평서형이 바릅니다.
 *
 * 쓰는 법
 *   node scripts/반말이-들었나.mjs <파일>
 *   node scripts/반말이-들었나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

/** 존댓말 끝맺음 — 이것으로 끝나면 바릅니다 */
export const 존댓끝 = /(습니다|ㅂ니다|입니다|세요|십시오|십시요|드립니다|옵니다|사옵니다|소서)[.!?]?$/;

/** 반말 끝맺음 — 「~다」로 끝나는데 존댓말이 아닌 것 */
export const 반말끝 = /(다|까|자|라|니|냐|지|어|야|군|네|걸|데)[.!?]?$/;

/** 인용과 코드 블록을 지웁니다. 지운 자리는 빈칸으로 둡니다 — 줄 수가 어긋나지 않게 */
export function 인용지우기(글) {
  let s = String(글 ?? '');
  s = s.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '));   /* 코드 블록 */
  s = s.replace(/「[^」\n]*」/g, (m) => ' '.repeat(m.length));            /* 낫표 인용 */
  s = s.replace(/"[^"\n]*"/g, (m) => ' '.repeat(m.length));            /* 큰따옴표 인용 */
  s = s.replace(/^\s*>.*$/gm, (m) => ' '.repeat(m.length));            /* 인용 줄 */
  return s;
}

/** 한 줄을 문장으로 쪼갭니다. 표는 칸마다 한 문장으로 봅니다 */
export function 문장들(줄) {
  const s = String(줄 ?? '').trim();
  if (!s) return [];
  if (/^\s*[#|]/.test(s) && !s.includes('|')) return [];               /* 머리글은 명사형이 보통 */
  const 조각 = s.startsWith('|') ? s.split('|') : [s];
  const 것 = [];
  for (const 하나 of 조각) {
    for (const 문 of String(하나).split(/(?<=[.!?])\s+/)) {
      const t = 문.replace(/^[\s\-*·⛔✅⭐🔴⬜⚠🔵■]+/, '').trim();
      if (t) 것.push(t);
    }
  }
  return 것;
}

/** 표 구분줄(|---|---|)인가 */
export function 표금인가(줄) { return /^\s*\|[\s:|-]+\|\s*$/.test(String(줄 ?? '')); }

export function 반말인가(문장) {
  const t = String(문장 ?? '').trim().replace(/\*\*/g, '');
  if (!t) return false;
  if (!/[가-힣]/.test(t)) return false;                                 /* 한국어가 아니면 안 봅니다 */
  if (존댓끝.test(t)) return false;
  if (!반말끝.test(t)) return false;                                    /* 명사로 끝나면 개조식입니다 */
  /* 「~는다/~한다」 같은 평서형 종결만 봅니다. 「수다·제다」 같은 명사는 뺍니다 */
  return /(다|까|자|라|니|냐|지|어|야|군|네|걸|데)[.!?]?$/.test(t) && /[가-힣]다[.!?]?$|[가-힣](까|자|라|니|냐|지|어|야|군|네)[.!?]?$/.test(t);
}

export function 찾는다(글) {
  const 깨끗 = 인용지우기(글);
  const 줄들 = 깨끗.split(/\r?\n/);
  const 걸린것 = [];
  for (let i = 0; i < 줄들.length; i += 1) {
    if (표금인가(줄들[i])) continue;
    for (const 문 of 문장들(줄들[i])) {
      if (반말인가(문)) 걸린것.push({ 줄: i + 1, 글: 문.slice(0, 80) });
    }
  }
  return 걸린것;
}

// ── 자가시험 ───────────────────────────────────────────────
function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  T('했다는 반말입니다', 반말인가('영문 2편을 썼다') === true);
  T('이다는 반말입니다', 반말인가('내 잘못이다') === true);
  T('한다는 반말입니다', 반말인가('밀린 콘텐트를 이어서 쓴다') === true);
  T('없다는 반말입니다', 반말인가('고칠 것이 없다') === true);
  T('습니다는 바릅니다', 반말인가('영문 2편을 썼습니다') === false);
  T('입니다는 바릅니다', 반말인가('제 잘못입니다') === false);
  T('하십시오는 바릅니다', 반말인가('확인해 주십시오') === false);
  T('명사로 끝나면 개조식이라 안 잡습니다', 반말인가('영문 2편 발행') === false);
  T('숫자로 끝나도 안 잡습니다', 반말인가('순방문자 128.3명') === false);
  T('영어는 안 봅니다', 반말인가('We measured 627 companies') === false);
  T('빈 줄은 안 봅니다', 반말인가('') === false && 반말인가(null) === false);

  T('낫표 인용 안은 세지 않습니다', 찾는다('사장님 — 「콘텐트 빈 거 다 채워」').length === 0);
  T('인용 줄은 세지 않습니다', 찾는다('> 사장님 말씀이다').length === 0);
  T('코드 블록은 세지 않습니다', 찾는다('```\n이것은 반말이다\n```').length === 0);
  T('표 구분줄은 세지 않습니다', 찾는다('|---|---|').length === 0);

  T('표 칸 안의 반말을 잡습니다', 찾는다('| 콘텐트 | 영문 2편을 썼다 | 더 쓴다 |').length === 2);
  T('존댓말 표는 안 잡습니다', 찾는다('| 콘텐트 | 영문 2편을 썼습니다 | 더 쓰겠습니다 |').length === 0);
  T('여러 줄에서 줄 번호를 바로 냅니다', 찾는다('첫 줄입니다\n둘째 줄이다')[0]?.줄 === 2);
  T('글머리 기호를 떼고 봅니다', 찾는다('- 콘텐트 0편이 5일 이어졌다').length === 1);

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 파일 = 인자.find((x) => !x.startsWith('--'));
  if (!파일) { console.log('쓰는 법: node scripts/반말이-들었나.mjs <파일>'); process.exit(1); }
  if (!fs.existsSync(파일)) { console.log('🔴 파일이 없습니다 — ' + 파일); process.exit(1); }
  const 걸린것 = 찾는다(fs.readFileSync(파일, 'utf8'));
  if (!걸린것.length) { console.log('✅ 반말이 없습니다 — ' + 파일); process.exit(0); }
  console.log(`🔴 반말 ${걸린것.length}곳 — ${파일}`);
  for (const x of 걸린것.slice(0, 30)) console.log(`   ${String(x.줄).padStart(4)}줄  ${x.글}`);
  if (걸린것.length > 30) console.log(`   … 그 밖 ${걸린것.length - 30}곳`);
  console.log('');
  console.log('   사장님 2026-11-19 — 「반말이네 미쳤구나」 · 「업무보고가 반말」');
  console.log('   ⇒ 「~다」로 끝내지 말고 「~습니다」로 끝내거나, 개조식이면 명사로 끝냅니다');
  process.exit(1);
}
