#!/usr/bin/env node
/**
 * jbnews-daily-stat.mjs — **중부매일 기자별 통계를 날마다 거둬 사장님께 메일로 보낸다.**
 *
 * ── 왜 이 도구가 생겼나 ─────────────────────────────────────────
 * 네이버 뉴스제휴위원회가 「E.기자 1인당 기사 생산량의 적정수준」 8점을 전부 감점했고,
 * 비교 기준값을 공개하지 않아 우리가 직접 산정하고 있다.
 * 사장님 2026-11-24 —
 *   「월 50건 이상 기사 작성 기자들로 표를 만들어 / 중부매일 통계를 미리 뽑자는 의미」
 *   「결과치를 매일로 보내」
 *
 * ⇒ CMS 「통계 > 기자별통계」(기준=승인)에서 이번 달·지난달을 날마다 새로 거두고,
 *   올해 누적과 함께 표로 만들어 메일로 보낸다.
 *
 * ── 이 도구가 지키는 것 ──────────────────────────────────────────
 * ⛔ 달이 안 끝난 이번 달을 월평균에 넣지 않는다 — 못 센 것을 센 것처럼 쓰지 않는다
 * ⛔ 유불리 해석을 붙이지 않는다 (사장님 2026-11-24 「하지마」). 잰 값과 재는 방법만 적는다
 * ⛔ CMS 를 빠르게 많이 두드리지 않는다 — 11-24 에 403 으로 끊겼다. 하루 두 달치뿐이다
 * ⛔ 네이버 주소로 보내지 않는다 — parkintaek2@gmail.com
 *
 * ── 이 도구가 못 보는 것 ─────────────────────────────────────────
 * ⚠ 「중부매일」 바이라인은 오피니언 중 외부 필진 칼럼이다(사장님 확인). 규정 (ㄹ)목대로
 *   실제 인원과 무관하게 대상 기자 1명으로 합산한다 — 몇 사람인지는 CMS 로 못 가린다
 * ⚠ 보도자료·자동생성 기사는 CMS 통계에서 갈리지 않는다
 *
 * 쓰는 법  node scripts/jbnews-daily-stat.mjs --selftest
 *          node scripts/jbnews-daily-stat.mjs                거두고 표만 찍는다
 *          node scripts/jbnews-daily-stat.mjs --send         메일까지 보낸다
 *          node scripts/jbnews-daily-stat.mjs --send --mun=60  기준값을 60 으로
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const 받는곳 = 'parkintaek2@gmail.com';
const 곳간 = path.resolve('docs/자국/중부매일-기자통계');
const 외부필진 = ['중부매일'];
const 계정꼴 = /^[a-zA-Z0-9_.]+$/;

const 인자 = (이름, 기본) => {
  const 머리 = `--${이름}=`;
  const a = process.argv.find((x) => x.startsWith(머리));
  return a ? a.slice(머리.length) : 기본;
};

/** 오늘을 한국시간으로. ⛔ toISOString() 금지 — 자정 앞뒤로 하루가 어긋난다 */
export function 오늘() {
  const d = new Date();
  return { 해: d.getFullYear(), 달: d.getMonth() + 1, 날: d.getDate() };
}

/** 그 달의 마지막 날 */
export function 마지막날(해, 달) {
  return new Date(해, 달, 0).getDate();
}

/** 이름을 기자 / 외부필진 / 계정 으로 가른다 */
export function 갈래(이름) {
  if (외부필진.includes(이름)) return '외부필진';
  if (계정꼴.test(String(이름))) return '계정';
  return '기자';
}

/** 기자별통계 표의 한 줄을 읽는다. 순위가 숫자인 줄만 사람이다 */
export function 줄을읽는다(line) {
  const p = String(line).split('\t');
  if (p.length < 4 || !/^[0-9]+$/.test(p[0])) return null;
  const 이름 = (p[1] || '').trim();
  const 승인 = Number(String(p[3]).replace(/,/g, ''));
  if (!이름 || !Number.isFinite(승인)) return null;
  return { 이름, 승인 };
}

/** 달이 끝났나 — 이번 달은 아직 안 끝났다 */
export function 달이끝났나(mm, 이제 = 오늘()) {
  const m = Number(String(mm).slice(4));
  const y = Number(String(mm).slice(0, 4));
  if (y < 이제.해) return true;
  if (y > 이제.해) return false;
  return m < 이제.달;
}

/* ────────────────────────── 자가시험 ────────────────────────── */
function 자가시험() {
  const 시험 = [];
  const T = (이름, 참) => 시험.push([이름, !!참]);

  T('마지막날 — 2026년 2월은 28일', 마지막날(2026, 2) === 28);
  T('마지막날 — 11월은 30일', 마지막날(2026, 11) === 30);
  T('마지막날 — 1월은 31일', 마지막날(2026, 1) === 31);

  /* 🔴 사장님이 「중부매일」은 외부 필진 칼럼이라고 밝히셨다 (2026-11-24).
     통합 바이라인으로 읽으면 규정상 -4점이 되므로 갈래를 틀리면 점수가 통째로 달라진다 */
  T('갈래 — 「중부매일」은 외부필진이다', 갈래('중부매일') === '외부필진');
  T('갈래 — 사람 이름은 기자', 갈래('천성남') === '기자');
  T('갈래 — 영문 계정은 계정', 갈래('suyeoniii20') === '계정');
  T('갈래 — digitaljbnews 도 계정', 갈래('digitaljbnews') === '계정');

  T('줄읽기 — 사람 줄을 읽는다',
    줄을읽는다('1\t천성남\t180\t180\t0\t6').이름 === '천성남');
  T('줄읽기 — 승인 칸을 쓴다(기사수 칸이 아니다)',
    줄을읽는다('1\t천성남\t180\t175\t0').승인 === 175);
  T('줄읽기 — 쉼표가 든 수를 읽는다',
    줄을읽는다('1\t가나\t1,234\t1,200\t0').승인 === 1200);
  T('줄읽기 — 머리줄은 사람이 아니다', 줄을읽는다('순위\t기자명\t기사수\t승인') === null);
  T('줄읽기 — 「헤드 중요 일반」 둘째 머리줄도 아니다', 줄을읽는다('헤드\t중요\t일반') === null);
  T('줄읽기 — 빈 줄에 안 터진다', 줄을읽는다('') === null);

  /* 🔴 달이 안 끝났는데 평균에 넣으면 그 사람의 생산량이 낮게 찍힌다 */
  const 가상 = { 해: 2026, 달: 11, 날: 24 };
  T('달끝 — 이번 달은 안 끝났다', !달이끝났나('202611', 가상));
  T('달끝 — 지난달은 끝났다', 달이끝났나('202610', 가상));
  T('달끝 — 지난해는 끝났다', 달이끝났나('202512', 가상));
  T('달끝 — 다음 달은 안 끝났다', !달이끝났나('202612', 가상));

  const 진 = 시험.filter(([, ok]) => !ok);
  for (const [이름] of 진) console.error(`❌ ${이름}`);
  if (진.length) { console.error(`⛔ 자가시험 ${진.length}개 실패`); process.exit(1); }
  console.log(`✅ jbnews-daily-stat 자가시험 통과 (${시험.length})`);
}

if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  자가시험();
  process.exit(0);
}

/* ────────────────────────── 거두기 ────────────────────────── */
const 문턱 = Number(인자('mun', '50'));
const 보낸다 = process.argv.includes('--send') || process.argv.includes('--보낸다');
const 이제 = 오늘();

fs.mkdirSync(곳간, { recursive: true });

/* 이번 달과 지난달만 새로 거둔다. 지난 달들은 이미 적어 둔 것을 쓴다 */
const 거둘달 = [];
거둘달.push([이제.해, 이제.달]);
if (이제.달 === 1) 거둘달.push([이제.해 - 1, 12]);
else 거둘달.push([이제.해, 이제.달 - 1]);

const { 새탭에서 } = await import('./lib/cdp.mjs');

const 표읽기 = `(() => {
  const 줄 = [];
  document.querySelectorAll('table tr').forEach((tr) => {
    const 칸 = [].slice.call(tr.querySelectorAll('th,td')).map(function (c) {
      return (c.textContent || '').replace(/[ \\t\\n\\r]+/g, ' ').trim();
    });
    if (칸.length) 줄.push(칸.join('\\t'));
  });
  return JSON.stringify({ url: location.href, 줄: 줄 });
})()`;

let 거둔것 = 0;
let 거두기탈 = '';
try {
  await 새탭에서('https://cms.jbnews.com/statistics/authorList.html', async (붙음) => {
    await new Promise((z) => setTimeout(z, 6000));
    const 어디 = await 붙음.보내기('Runtime.evaluate', {
      expression: 'location.href', returnByValue: true,
    });
    if (/adminLoginForm/.test(String(어디.result.value))) {
      거두기탈 = 'CMS 로그인 화면이 떴다 — 자동로그인이 풀렸다';
      return;
    }
    for (const [y, m] of 거둘달) {
      const mm = String(m).padStart(2, '0');
      const 시작 = `${y}-${mm}-01`;
      const 끝 = `${y}-${mm}-${String(마지막날(y, m)).padStart(2, '0')}`;
      const 넣고누른다 = `(() => {
        const f = document.forms['form_statistics_search'];
        if (!f) return 'NOFORM';
        if (f.start_date) f.start_date.value = '${시작}';
        if (f.end_date) f.end_date.value = '${끝}';
        const r = f.querySelector('input[name=sc_date][value=S]');
        if (r) r.checked = true;
        f.submit();
        return 'OK';
      })()`;
      const a = await 붙음.보내기('Runtime.evaluate', { expression: 넣고누른다, returnByValue: true });
      if (a.result.value !== 'OK') { 거두기탈 = `${mm}월 폼을 못 찾았다 (${a.result.value})`; continue; }
      await new Promise((z) => setTimeout(z, 9000));
      const b = await 붙음.보내기('Runtime.evaluate', { expression: 표읽기, returnByValue: true });
      let 쓴것;
      try { 쓴것 = JSON.parse(b.result.value); } catch { 거두기탈 = `${mm}월 표를 못 읽었다`; continue; }
      fs.writeFileSync(path.join(곳간, `kija_${y}${mm}.tsv`), (쓴것.줄 || []).join('\n'), 'utf8');
      거둔것 += 1;
      await new Promise((z) => setTimeout(z, 4000));
    }
  });
} catch (e) {
  거두기탈 = String(e.message).slice(0, 140);
}

/* ────────────────────────── 모으기 ────────────────────────── */
const 파일들 = fs.readdirSync(곳간).filter((f) => /^kija_[0-9]{6}[.]tsv$/.test(f)).sort();
const 달들 = 파일들.map((f) => f.slice(5, 11));
const 사람 = new Map();
for (const mm of 달들) {
  for (const line of fs.readFileSync(path.join(곳간, `kija_${mm}.tsv`), 'utf8').split('\n')) {
    const r = 줄을읽는다(line);
    if (!r) continue;
    if (!사람.has(r.이름)) 사람.set(r.이름, {});
    사람.get(r.이름)[mm] = r.승인;
  }
}
const 온전한달 = 달들.filter((mm) => 달이끝났나(mm, 이제));

const 줄 = [];
for (const [이름, d] of 사람) {
  const 온전값 = 온전한달.map((mm) => (d[mm] ?? 0));
  const 합 = 온전값.reduce((s, x) => s + x, 0);
  const 평균 = 온전값.length ? 합 / 온전값.length : 0;
  줄.push({ 이름, 갈래: 갈래(이름), 달: d, 합, 평균, 최대: 온전값.length ? Math.max(...온전값) : 0 });
}
줄.sort((a, b) => b.평균 - a.평균);
const 넘은이 = 줄.filter((r) => r.평균 >= 문턱);
const 상한 = 문턱 * 2;

/* ────────────────────────── 글 ────────────────────────── */
const 오늘글 = `${이제.해}-${String(이제.달).padStart(2, '0')}-${String(이제.날).padStart(2, '0')}`;
const 칸 = (s, n) => String(s).padStart(n);
const 말 = [];
말.push(`중부매일 기자별 기사 생산량 — ${오늘글} 기준`);
말.push('');
말.push(`출처: CMS 통계 > 기자별통계 · 기준=승인`);
말.push(`기간: ${달들[0].slice(0, 4)}-${달들[0].slice(4)} ~ ${달들[달들.length - 1].slice(0, 4)}-${달들[달들.length - 1].slice(4)}`);
말.push(`월평균은 달이 끝난 ${온전한달.length}개 달로 냈습니다. 이번 달은 칸에만 적고 평균에서 뺐습니다.`);
말.push(`비교 기준값 ${문턱}건 · 감점 없는 상한(2배) ${상한}건`);
if (거두기탈) 말.push(`주의: 오늘 거두기가 완전하지 않았습니다 — ${거두기탈}`);
말.push('');

말.push(`[1] 월별 — 기자수, 승인 기사수, 1인당, ${문턱}건 이상 인원`);
말.push('');
말.push('달        기자수   기사수   1인당    ' + 문턱 + '건+인원  ' + 문턱 + '건+1인당');
for (const mm of 달들) {
  const 전부 = [...사람.values()].map((d) => d[mm] ?? 0).filter((x) => x > 0);
  if (!전부.length) continue;
  const 합 = 전부.reduce((s, x) => s + x, 0);
  const 넘 = 전부.filter((x) => x >= 문턱);
  const 넘합 = 넘.reduce((s, x) => s + x, 0);
  const 꼬리 = 달이끝났나(mm, 이제) ? '' : '  (달이 안 끝났습니다)';
  말.push(`${mm.slice(0, 4)}-${mm.slice(4)}  ${칸(전부.length, 5)}명 ${칸(합, 7)}건 ${칸((합 / 전부.length).toFixed(1), 7)}건`
    + ` ${칸(넘.length, 7)}명 ${칸((넘합 / (넘.length || 1)).toFixed(1), 8)}건${꼬리}`);
}
말.push('');

말.push(`[2] 월평균 ${문턱}건 이상인 기자 — ${넘은이.length}명`);
말.push('');
말.push('순위 기자명          구분      ' + 온전한달.map((m) => 칸(m.slice(4) + '월', 6)).join('') + 칸('월평균', 8) + 칸('최대달', 7));
넘은이.forEach((r, i) => {
  말.push(칸(i + 1, 3) + '  ' + String(r.이름).padEnd(14)
    + String(r.갈래).padEnd(9)
    + 온전한달.map((m) => 칸(r.달[m] ?? 0, 6)).join('')
    + 칸(r.평균.toFixed(1), 8) + 칸(r.최대, 7));
});
말.push('');
const 실명 = 넘은이.filter((r) => r.갈래 === '기자').length;
말.push(`실명 기자 ${실명}명 + 외부필진 묶음 ${넘은이.length - 실명}개`);
말.push('');

const 상한넘은이 = 줄.filter((r) => r.평균 > 상한);
말.push(`[3] 월평균이 상한 ${상한}건을 넘는 기자 — ${상한넘은이.length}명`);
말.push('');
if (!상한넘은이.length) {
  말.push(`   없습니다. 기준값 ${문턱}건에서는 상한을 넘는 기자가 0명입니다.`);
} else {
  for (const r of 상한넘은이) {
    말.push(`   ${String(r.이름).padEnd(12)} 월평균 ${r.평균.toFixed(1)}건 · 상한 대비 ${(r.평균 / 문턱).toFixed(2)}배 · 최대달 ${r.최대}건`);
  }
}
말.push('');
말.push('규정 제8조 제6항 표.9 — 기준값의 2배 이하는 감점이 없고, 2배를 넘으면 구간별로');
말.push('기자 1명당 1~4점을 감점합니다. 기준값은 뉴스제휴위가 공개하지 않아 우리가 산정 중입니다.');
말.push('');
말.push(`「중부매일」 바이라인은 오피니언 중 외부 필진 칼럼입니다. 규정 (ㄹ)목에 따라`);
말.push('실제 인원과 무관하게 대상 기자 1명으로 합산했습니다.');
말.push('');
말.push('보도자료와 자동생성 기사는 CMS 통계에서 갈리지 않아 측정하지 못했습니다.');

const 본문 = 말.join('\n');
const 글자리 = path.resolve('docs/자국/중부매일-기자통계-오늘.txt');
fs.writeFileSync(글자리, `${본문}\n`, 'utf8');
console.log(본문);
console.log(`\n(거둔 달 ${거둔것}개 · 적었다 ${글자리})`);

if (!보낸다) {
  console.log('→ 메일을 보내려면 --send 를 준다.');
  process.exit(0);
}

try {
  const 결과 = execFileSync(process.execPath, [
    'scripts/send-mail.mjs',
    `--받는곳=${받는곳}`,
    `--제목=[중부매일] 기자별 기사 생산량 — ${오늘글}`,
    `--글=${글자리}`,
    '--보낸다',
  ], { encoding: 'utf8', env: { ...process.env, CLAUDE_SEAT: process.env.CLAUDE_SEAT || '5' } });
  console.log(결과.trim().split('\n').slice(-4).join('\n'));
} catch (e) {
  console.error('⛔ 메일을 보내지 못했다 —', String(e.message).slice(0, 200));
  process.exit(1);
}
process.exit(0);
