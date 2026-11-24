#!/usr/bin/env node
/**
 * jbnews-stat-xlsx.mjs — **중부매일 기자별 통계를 엑셀 두 장으로 만든다.**
 *
 * 사장님 2026-11-24 —
 *   「기자별 월 기사수 — 2026년 1~11월 (승인) / 달마다 — 50건 이상 쓴 기자
 *     이 두 개만 엑셀파일로 보내. 셀값은 숫자와 백분율로 지정하고」
 *   「날마다 보내지마 / 12월1일에 11월치 보내」
 *
 * 자료는 CMS 통계 > 기자별통계(기준=승인)에서 거둔 TSV 다.
 * 합계·평균·비중은 전부 «수식»으로 넣는다 — 계산한 값을 박아 넣지 않는다.
 * 그래야 사장님이 칸을 고치시면 표가 따라 움직인다.
 *
 * ⚠ 이 PC 에는 파이썬도 LibreOffice 도 없고 Excel COM 은 파일을 못 연다.
 *   그래서 xlsx 를 lib/xlsx-쓴다.mjs 로 직접 쓰고 lib/xlsx-읽어본다.mjs 로 되읽어 잰다.
 *
 * 쓰기  node scripts/jbnews-stat-xlsx.mjs --자가시험
 *       node scripts/jbnews-stat-xlsx.mjs [--mun=50] [--out=<경로>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { 통만든다, 적는다, 열이름 } from './lib/xlsx-쓴다.mjs';
import { 잰다 } from './lib/xlsx-읽어본다.mjs';

const 곳간 = path.resolve('docs/자국/중부매일-기자통계');
const 외부필진 = ['중부매일'];
const 계정꼴 = /^[a-zA-Z0-9_.]+$/;

const 인자 = (이름, 기본) => {
  const 머리 = `--${이름}=`;
  const a = process.argv.find((x) => x.startsWith(머리));
  return a ? a.slice(머리.length) : 기본;
};

export function 구분(이름) {
  if (외부필진.includes(이름)) return '외부필진';
  if (계정꼴.test(String(이름))) return '계정';
  return '기자';
}

export function 줄을읽는다(line) {
  const p = String(line).split('\t');
  if (p.length < 4 || !/^[0-9]+$/.test(p[0])) return null;
  const 이름 = (p[1] || '').trim();
  const 승인 = Number(String(p[3]).replace(/,/g, ''));
  if (!이름 || !Number.isFinite(승인)) return null;
  return { 이름, 승인 };
}

export function 끝난달(mm, 이제 = new Date()) {
  const y = Number(String(mm).slice(0, 4));
  const m = Number(String(mm).slice(4));
  if (y !== 이제.getFullYear()) return y < 이제.getFullYear();
  return m < 이제.getMonth() + 1;
}

/* ────────────────────────── 자가시험 ────────────────────────── */
function 자가시험() {
  const 시험 = [];
  const T = (이름, 참) => 시험.push([이름, !!참]);

  T('구분 — 「중부매일」은 외부필진', 구분('중부매일') === '외부필진');
  T('구분 — 사람 이름은 기자', 구분('천성남') === '기자');
  T('구분 — 영문 계정은 계정', 구분('psd0328') === '계정');

  T('줄읽기 — 승인 칸을 쓴다', 줄을읽는다('1\t가나\t180\t175\t0').승인 === 175);
  T('줄읽기 — 쉼표가 든 수', 줄을읽는다('1\t가나\t1,234\t1,200\t0').승인 === 1200);
  T('줄읽기 — 머리줄은 거른다', 줄을읽는다('순위\t기자명\t기사수\t승인') === null);
  T('줄읽기 — 빈 줄에 안 터진다', 줄을읽는다('') === null);

  const 때 = new Date(2026, 10, 24);   /* 2026-11-24 */
  T('달끝 — 이번 달은 안 끝났다', !끝난달('202611', 때));
  T('달끝 — 지난달은 끝났다', 끝난달('202610', 때));
  T('달끝 — 지난해는 끝났다', 끝난달('202512', 때));

  T('열이름 — 1은 A', 열이름(1) === 'A');
  T('열이름 — 26은 Z', 열이름(26) === 'Z');
  T('열이름 — 27은 AA', 열이름(27) === 'AA');

  /* 🔴 되읽기 검사가 실제로 깨진 것을 잡나 — 안 잡으면 검사가 아니다 */
  const 통 = 통만든다();
  const 장 = 통.새장('ㄱ');
  장.줄([{ v: 'ㄴ', 꼴: '머리' }, { v: 1, 꼴: '수' }]);
  const 임시 = path.join(process.env.TEMP || '.', 'xlsx-자가시험.xlsx');
  적는다(통, 임시);
  const r = 잰다(임시);
  T('되읽기 — 성한 파일은 통과한다', r.탈.length === 0);
  /* 눌린 몸통 한가운데를 망가뜨린다 — 머리 쪽을 건드리면 crc 검사에 안 걸린다 */
  const b = fs.readFileSync(임시);
  const 가운데자리 = Math.floor(b.length * 0.6);
  b[가운데자리] ^= 0xff;
  fs.writeFileSync(임시, b);
  let 잡았나 = false;
  try { 잡았나 = 잰다(임시).탈.length > 0; } catch { 잡았나 = true; }
  T('되읽기 — 망가진 파일을 잡아낸다', 잡았나);
  try { fs.unlinkSync(임시); } catch { /* 지워지면 그만이다 */ }

  const 진 = 시험.filter(([, ok]) => !ok);
  for (const [이름] of 진) console.error(`❌ ${이름}`);
  if (진.length) { console.error(`⛔ 자가시험 ${진.length}개 실패`); process.exit(1); }
  console.log(`✅ jbnews-stat-xlsx 자가시험 통과 (${시험.length})`);
}

if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  자가시험();
  process.exit(0);
}

/* ────────────────────────── 자료 ────────────────────────── */
const 문턱 = Number(인자('mun', '50'));
const 낼곳 = path.resolve(인자('out', 'docs/자국/중부매일-기자별-기사생산량.xlsx'));

const 파일들 = fs.readdirSync(곳간).filter((f) => /^kija_[0-9]{6}[.]tsv$/.test(f)).sort();
if (!파일들.length) { console.error('자료가 없다 — ' + 곳간); process.exit(1); }
const 달들 = 파일들.map((f) => f.slice(5, 11));

const 사람 = new Map();
for (let i = 0; i < 달들.length; i += 1) {
  const mm = 달들[i];
  for (const line of fs.readFileSync(path.join(곳간, 파일들[i]), 'utf8').split('\n')) {
    const r = 줄을읽는다(line);
    if (!r) continue;
    if (!사람.has(r.이름)) 사람.set(r.이름, {});
    사람.get(r.이름)[mm] = r.승인;
  }
}
const 온전한달 = 달들.filter((mm) => 끝난달(mm));
const 안끝난달 = 달들.filter((mm) => !끝난달(mm));

const 차례 = [...사람.entries()].sort((a, b) => {
  const f = (d) => 온전한달.reduce((s, mm) => s + (d[mm] ?? 0), 0) / Math.max(1, 온전한달.length);
  return f(b[1]) - f(a[1]);
});

/* ────────────────────────── 장 1 ────────────────────────── */
const 통 = 통만든다();
const 장1이름 = '기자별 월 기사수';
const s1 = 통.새장(장1이름);

const 달첫 = 4;
const 온전첫 = 달첫 + 달들.indexOf(온전한달[0]);
const 온전끝 = 달첫 + 달들.indexOf(온전한달[온전한달.length - 1]);
const 합열 = 달첫 + 달들.length;
const 평균열 = 합열 + 1;
const 최대열 = 합열 + 2;
const 비중열 = 합열 + 3;
const 첫줄 = 2;
const 끝줄 = 첫줄 + 차례.length - 1;
const 합줄 = 끝줄 + 1;
const 합문자 = 열이름(합열);
const A = 열이름(온전첫);
const B = 열이름(온전끝);

s1.너비([6, 15, 10, ...달들.map(() => 7), 11, 9, 9, 10]);
s1.틀고정('D2');
s1.줄([
  { v: '순위', 꼴: '머리' }, { v: '기자명', 꼴: '머리' }, { v: '구분', 꼴: '머리' },
  ...달들.map((mm) => ({ v: Number(mm.slice(4)) + '월', 꼴: '머리' })),
  { v: `${Number(온전한달[0].slice(4))}~${Number(온전한달[온전한달.length - 1].slice(4))}월 합`, 꼴: '머리' },
  { v: '월평균', 꼴: '머리' }, { v: '최대달', 꼴: '머리' }, { v: '연간 비중', 꼴: '머리' },
]);

차례.forEach(([이름, d], i) => {
  const r = 첫줄 + i;
  const 갈 = 구분(이름);
  const 빨강 = 갈 === '외부필진';
  s1.줄([
    { v: i + 1, 꼴: 빨강 ? '빨강수' : '수' },
    { v: 이름, 꼴: 빨강 ? '빨강글' : '글왼쪽' },
    { v: 갈, 꼴: 빨강 ? '빨강글' : '글' },
    ...달들.map((mm) => ({ v: d[mm] ?? 0, 꼴: 빨강 ? '빨강수' : '수' })),
    { f: `SUM(${A}${r}:${B}${r})`, 꼴: 빨강 ? '빨강수' : '수' },
    { f: `AVERAGE(${A}${r}:${B}${r})`, 꼴: 빨강 ? '빨강소수' : '소수' },
    { f: `MAX(${A}${r}:${B}${r})`, 꼴: 빨강 ? '빨강수' : '수' },
    { f: `IF($${합문자}$${합줄}=0,0,${합문자}${r}/$${합문자}$${합줄})`, 꼴: 빨강 ? '빨강퍼센트' : '퍼센트' },
  ]);
});

s1.줄([
  { v: '', 꼴: '굵은글' }, { v: '합계', 꼴: '굵은글' }, { v: '', 꼴: '굵은글' },
  ...달들.map((_, j) => {
    const L = 열이름(달첫 + j);
    return { f: `SUM(${L}${첫줄}:${L}${끝줄})`, 꼴: '굵은수' };
  }),
  { f: `SUM(${합문자}${첫줄}:${합문자}${끝줄})`, 꼴: '굵은수' },
  { f: `SUM(${열이름(평균열)}${첫줄}:${열이름(평균열)}${끝줄})`, 꼴: '굵은소수' },
  { f: `MAX(${열이름(최대열)}${첫줄}:${열이름(최대열)}${끝줄})`, 꼴: '굵은수' },
  { v: 1, 꼴: '굵은퍼센트' },
]);

s1.빈줄();
s1.줄([{ v: '출처: 중부매일 CMS 통계 > 기자별통계 · 기준=승인', 꼴: '주석' }]);
s1.줄([{ v: `월평균·합계·최대달은 달이 끝난 ${온전한달.length}개 달(${Number(온전한달[0].slice(4))}~${Number(온전한달[온전한달.length - 1].slice(4))}월)로 계산했습니다.`, 꼴: '주석' }]);
if (안끝난달.length) {
  s1.줄([{ v: `${Number(안끝난달[0].slice(4))}월은 달이 끝나지 않아 칸에만 적고 평균에서 뺐습니다.`, 꼴: '주석' }]);
}
s1.줄([{ v: '「중부매일」은 오피니언 중 외부 필진 칼럼입니다. 규정 (ㄹ)목에 따라 실제 인원과 무관하게 대상 기자 1명으로 합산했습니다.', 꼴: '빨강주석' }]);
s1.줄([{ v: '보도자료와 자동생성 기사는 CMS 통계에서 구분되지 않아 측정하지 못했습니다.', 꼴: '주석' }]);

/* ────────────────────────── 장 2 ────────────────────────── */
const s2 = 통.새장(`월별 ${문턱}건 이상`);
s2.너비([11, 13, 13, 12, 15, 12, 17, 12, 14]);
s2.틀고정('B2');
s2.줄([
  { v: '달', 꼴: '머리' }, { v: '전체 기자수', 꼴: '머리' }, { v: '전체 기사수', 꼴: '머리' },
  { v: '전체 1인당', 꼴: '머리' }, { v: `${문턱}건 이상 인원`, 꼴: '머리' }, { v: '인원 비중', 꼴: '머리' },
  { v: `${문턱}건 이상 기사수`, 꼴: '머리' }, { v: '기사 비중', 꼴: '머리' }, { v: '그들의 1인당', 꼴: '머리' },
]);

달들.forEach((mm, i) => {
  const r = 2 + i;
  const L = 열이름(달첫 + i);
  const 칸 = `'${장1이름}'!${L}${첫줄}:${L}${끝줄}`;
  const 안끝남 = !끝난달(mm);
  const 수꼴 = 안끝남 ? '빨강수' : '수';
  const 소수꼴 = 안끝남 ? '빨강소수' : '소수';
  const 퍼꼴 = 안끝남 ? '빨강퍼센트' : '퍼센트';
  s2.줄([
    { v: `${mm.slice(0, 4)}-${mm.slice(4)}`, 꼴: 안끝남 ? '빨강글' : '글' },
    { f: `COUNTIF(${칸},">0")`, 꼴: 수꼴 },
    { f: `SUM(${칸})`, 꼴: 수꼴 },
    { f: `IF(B${r}=0,0,C${r}/B${r})`, 꼴: 소수꼴 },
    { f: `COUNTIF(${칸},">=${문턱}")`, 꼴: 수꼴 },
    { f: `IF(B${r}=0,0,E${r}/B${r})`, 꼴: 퍼꼴 },
    { f: `SUMIF(${칸},">=${문턱}")`, 꼴: 수꼴 },
    { f: `IF(C${r}=0,0,G${r}/C${r})`, 꼴: 퍼꼴 },
    { f: `IF(E${r}=0,0,G${r}/E${r})`, 꼴: 소수꼴 },
  ]);
});

s2.빈줄();
s2.줄([{ v: '출처: 중부매일 CMS 통계 > 기자별통계 · 기준=승인', 꼴: '주석' }]);
s2.줄([{ v: `모든 칸은 「${장1이름}」 장을 가리키는 수식입니다. 그 장을 고치면 이 장이 따라 움직입니다.`, 꼴: '주석' }]);
if (안끝난달.length) {
  s2.줄([{ v: `${안끝난달[0].slice(0, 4)}-${안끝난달[0].slice(4)}은 달이 끝나지 않은 값이라 붉게 적었습니다.`, 꼴: '빨강주석' }]);
}

/* ────────────────────────── 쓰고 되읽는다 ────────────────────────── */
fs.mkdirSync(path.dirname(낼곳), { recursive: true });
적는다(통, 낼곳);
const { 탈, 것들 } = 잰다(낼곳);
if (탈.length) {
  for (const t of 탈) console.error('🔴 ' + t);
  console.error('⛔ 만든 파일이 성하지 않다 — 보내지 않는다');
  process.exit(1);
}
const 수식수 = Object.entries(것들)
  .filter(([n]) => /worksheets\/sheet/.test(n))
  .reduce((s, [, g]) => s + (g.match(/<f>/g) || []).length, 0);
console.log(`적었다: ${낼곳}`);
console.log(`장 2개 · 기자 ${차례.length}명 · 달 ${달들.length}개 · 수식 ${수식수}개`);
console.log('✅ 되읽기 검사 통과');

/* ── 진짜 엑셀로 열어 본다 ──────────────────────────────────────
   🔴 되읽기 검사는 우리가 쓴 검사라 우리 잘못을 같이 가질 수 있다.
   사장님이 2026-11-24 에 Office 가 깔려 있다고 짚어 주셨다 — 그래서 실물로 연다.
   ⚠ 첫 시도가 Workbooks.Open 에서 선 까닭은 «경로에 든 한글»이었다.
     ps1 이 ASCII 임시 자리로 옮겨 연다. 창은 띄우지 않는다 */
const { execFileSync: 돌린다 } = await import('node:child_process');
let 엑셀이열었나 = false;
let 엑셀말 = '';
try {
  엑셀말 = 돌린다('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', path.resolve('scripts/lib/check-xlsx-in-excel.ps1'),
    '-Path', 낼곳,
  ], { encoding: 'utf8' });
  엑셀이열었나 = /\bOK\b/.test(엑셀말);
} catch (e) {
  엑셀말 = String((e.stdout || '') + (e.message || '')).slice(0, 300);
  엑셀이열었나 = false;
}
for (const l of 엑셀말.trim().split('\n')) console.log('   ' + l.trim());
if (엑셀이열었나) {
  console.log('✅ 엑셀이 열었고 수식 오류가 없다');
} else {
  console.error('🔴 엑셀로 열어 보지 못했다 — 메일 글에 그대로 적는다');
}

/* ────────────────────────── CSV 두 장 ──────────────────────────
   ⭐ 엑셀이 안 열릴 때를 대비해 같은 내용을 CSV 로도 둔다.
   이 PC 에는 엑셀을 열어 볼 수단이 없어 화면으로 확인하지 못하기 때문이다.
   ⛔ 앞에 BOM 을 붙인다 — 없으면 엑셀이 CP949 로 읽어 한글이 깨진다 */
const 온전합 = 차례.reduce((s, [, d]) => s + 온전한달.reduce((t, m) => t + (d[m] ?? 0), 0), 0);
const 폴더 = path.dirname(낼곳);
const csv1길 = path.join(폴더, '중부매일-기자별-월기사수.csv');
const csv2길 = path.join(폴더, `중부매일-월별-${문턱}건이상.csv`);

const c1 = [['순위', '기자명', '구분', ...달들.map((m) => `${Number(m.slice(4))}월`),
  `${Number(온전한달[0].slice(4))}~${Number(온전한달[온전한달.length - 1].slice(4))}월 합`,
  '월평균', '최대달', '연간 비중(%)'].join(',')];
차례.forEach(([이름, d], i) => {
  const 값 = 온전한달.map((m) => d[m] ?? 0);
  const 합 = 값.reduce((s, x) => s + x, 0);
  c1.push([i + 1, 이름, 구분(이름), ...달들.map((m) => d[m] ?? 0), 합,
    (합 / 온전한달.length).toFixed(1), Math.max(...값),
    온전합 ? ((합 / 온전합) * 100).toFixed(1) : '0.0'].join(','));
});
fs.writeFileSync(csv1길, `﻿${c1.join('\r\n')}\r\n`, 'utf8');

const 달줄 = [];
const c2 = [['달', '전체 기자수', '전체 기사수', '전체 1인당', `${문턱}건 이상 인원`,
  '인원 비중(%)', `${문턱}건 이상 기사수`, '기사 비중(%)', '그들의 1인당'].join(',')];
for (const mm of 달들) {
  const 전부 = [...사람.values()].map((d) => d[mm] ?? 0).filter((x) => x > 0);
  if (!전부.length) continue;
  const 합 = 전부.reduce((s, x) => s + x, 0);
  const 넘 = 전부.filter((x) => x >= 문턱);
  const 넘합 = 넘.reduce((s, x) => s + x, 0);
  const 한줄 = {
    달: `${mm.slice(0, 4)}-${mm.slice(4)}`,
    기자수: 전부.length,
    기사수: 합,
    일인당: 합 / 전부.length,
    넘인원: 넘.length,
    인원비중: 넘.length / 전부.length,
    넘기사: 넘합,
    기사비중: 합 ? 넘합 / 합 : 0,
    넘일인당: 넘.length ? 넘합 / 넘.length : 0,
    안끝남: !끝난달(mm),
  };
  달줄.push(한줄);
  c2.push([한줄.달, 한줄.기자수, 한줄.기사수, 한줄.일인당.toFixed(1), 한줄.넘인원,
    (한줄.인원비중 * 100).toFixed(1), 한줄.넘기사,
    (한줄.기사비중 * 100).toFixed(1), 한줄.넘일인당.toFixed(1)].join(','));
}
fs.writeFileSync(csv2길, `﻿${c2.join('\r\n')}\r\n`, 'utf8');
console.log(`CSV 둘 적었다: ${csv1길} · ${csv2길}`);

/* ────────────────────────── 메일 글 ────────────────────────── */
const 칸 = (s, n) => String(s).padStart(n);
const 글 = [];
글.push(`중부매일 기자별 기사 생산량 — ${달들[0].slice(0, 4)}년 ${Number(달들[0].slice(4))}~${Number(달들[달들.length - 1].slice(4))}월`);
글.push('');
글.push('지시하신 두 표를 엑셀 파일로 붙였습니다. 기준은 승인입니다.');
글.push('');
글.push('첨부 파일');
글.push(`  ${path.basename(낼곳)}   (장 2개)`);
글.push(`    [1] ${장1이름}    ${차례.length}명 x ${달들.length}개월`);
글.push(`    [2] 월별 ${문턱}건 이상      매월 ${문턱}건 이상 쓴 기자의 인원과 기사수`);
글.push(`  ${path.basename(csv1길)}      엑셀이 안 열릴 때 보시라고 같은 내용을 CSV 로도 붙였습니다`);
글.push(`  ${path.basename(csv2길)}`);
글.push('');
글.push('셀 서식');
글.push('  건수는 숫자(#,##0), 월평균과 1인당은 소수 한 자리(#,##0.0),');
글.push('  비중은 백분율(0.0%)로 지정했습니다.');
글.push('  합계와 평균, 비중은 값을 박아 넣지 않고 수식으로 넣었습니다.');
글.push(`  [2]번 장의 모든 칸은 [1]번 장을 가리키는 수식이므로,`);
글.push('  [1]번 장의 숫자를 고치시면 [2]번 장이 따라 움직입니다.');
글.push('');
글.push('월별 요약');
글.push('');
글.push(`  달        기자수   기사수   1인당   ${문턱}건+인원  인원비중  ${문턱}건+기사  기사비중`);
for (const r of 달줄) {
  글.push(`  ${r.달}  ${칸(r.기자수, 7)}명 ${칸(r.기사수.toLocaleString('en-US'), 8)}건 ${칸(r.일인당.toFixed(1), 7)}건`
    + ` ${칸(r.넘인원, 7)}명 ${칸((r.인원비중 * 100).toFixed(1) + '%', 8)} ${칸(r.넘기사.toLocaleString('en-US'), 9)}건`
    + ` ${칸((r.기사비중 * 100).toFixed(1) + '%', 7)}`);
}
글.push('');
if (안끝난달.length) {
  글.push(`  ${Number(안끝난달[0].slice(4))}월은 달이 끝나지 않았습니다. 칸에만 적고 월평균에서 뺐습니다.`);
  글.push('  엑셀에서도 그 달 칸은 붉게 적어 두었습니다.');
  글.push('');
}
글.push('월평균 상위 다섯');
글.push('');
차례.slice(0, 5).forEach(([이름, d], i) => {
  const 값 = 온전한달.map((m) => d[m] ?? 0);
  const 평 = 값.reduce((s, x) => s + x, 0) / 온전한달.length;
  const 최 = Math.max(...값);
  const 최달 = Number(온전한달[값.indexOf(최)].slice(4));
  글.push(`  ${i + 1}  ${String(이름).padEnd(9)} ${칸(평.toFixed(1), 6)}건   최대달 ${최}건 (${최달}월)`
    + (구분(이름) === '외부필진' ? '  — 외부 필진 칼럼' : ''));
});
글.push('');
글.push('함께 적어 두는 것');
글.push('');
글.push('  「중부매일」은 오피니언 중 외부 필진 칼럼입니다. 규정 (ㄹ)목에 따라');
글.push('  실제 인원과 무관하게 대상 기자 1명으로 합산했고, 엑셀에서 붉게 표시했습니다.');
글.push('');
글.push('  보도자료와 자동생성 기사는 CMS 통계에서 구분되지 않아 측정하지 못했습니다.');
글.push('');
if (엑셀이열었나) {
  글.push(`  보내기 전에 엑셀로 열어 확인했습니다. 장 2개, 수식 ${수식수}개, 수식 오류 0개입니다.`);
} else {
  글.push('  엑셀로 열어 확인하지 못했습니다. 파일 구조와 들어간 값은 확인했습니다.');
  글.push('  혹시 열리지 않으면 CSV 를 보시고 알려 주시면 바로 고치겠습니다.');
}

const 글길 = path.join(폴더, '중부매일-기자통계-메일글.txt');
fs.writeFileSync(글길, `${글.join('\n')}\n`, 'utf8');
console.log(`메일 글 적었다: ${글길}`);

if (!process.argv.includes('--send') && !process.argv.includes('--보낸다')) {
  console.log('→ 메일을 보내려면 --send 를 준다.');
  process.exit(0);
}

const { execFileSync } = await import('node:child_process');
const 제목 = `[중부매일] 기자별 기사 생산량 — ${달들[0].slice(0, 4)}년 `
  + `${Number(달들[0].slice(4))}~${Number(달들[달들.length - 1].slice(4))}월 (엑셀)`;
try {
  const 답 = execFileSync(process.execPath, [
    'scripts/send-mail.mjs',
    '--받는곳=parkintaek2@gmail.com',
    `--제목=${제목}`,
    `--글=${글길}`,
    `--첨부=${낼곳},${csv1길},${csv2길}`,
    '--봤다',
    '--보낸다',
  ], { encoding: 'utf8', env: { ...process.env, CLAUDE_SEAT: process.env.CLAUDE_SEAT || '5' } });
  console.log(답.trim().split('\n').slice(-5).join('\n'));
} catch (e) {
  console.error('⛔ 메일을 보내지 못했다 —', String(e.message).slice(0, 220));
  process.exit(1);
}
process.exit(0);
