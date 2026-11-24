// 중부매일 — 월 50건 이상 쓴 기자만 추린다.
// 사장님 2026-11-24 — 「월 50건 이상 기사 작성 기자들로 표를 만들어 / 중부매일 통계를 미리 뽑자는 의미」
// 「중부매일」 바이라인은 오피니언 중 외부 필진 칼럼이다(사장님 확인).
//   규정 (ㄹ)목 — 외부 칼럼니스트·기고자는 실제 인원과 무관하게 대상 기자 1명으로 합산한다.
import fs from 'fs';

const 문턱 = Number(process.argv[2] || 50);
const 외부필진 = ['중부매일'];
const 계정꼴 = /^[a-zA-Z0-9_.]+$/;   /* suyeoniii20 · psd0328 · digitaljbnews 같은 계정 이름 */

const 달들 = [];
for (let m = 1; m <= 11; m += 1) {
  const f = 'kija_2026' + String(m).padStart(2, '0') + '.tsv';
  if (fs.existsSync(f)) 달들.push([String(m).padStart(2, '0'), f]);
}
const 온전한달 = 달들.map(([mm]) => mm).filter((mm) => mm !== '11');

const 사람 = new Map();
for (const [mm, f] of 달들) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const p = line.split('\t');
    if (p.length < 4 || !/^[0-9]+$/.test(p[0])) continue;
    const 이름 = p[1].trim();
    const 승인 = Number(String(p[3]).replace(/,/g, ''));
    if (!이름 || !Number.isFinite(승인)) continue;
    if (!사람.has(이름)) 사람.set(이름, {});
    사람.get(이름)[mm] = 승인;
  }
}

function 갈래(이름) {
  if (외부필진.includes(이름)) return '외부필진';
  if (계정꼴.test(이름)) return '계정';
  return '기자';
}

/* ── 표 1 — 달마다, 그 달에 문턱을 넘은 기자 ── */
console.log(`■ 달마다 ${문턱}건 이상 쓴 기자 — 중부매일 (승인 기준, 2026년)\n`);
console.log(['달', `${문턱}건+ 인원`, `${문턱}건+ 기사합`, '그들의 1인당', '전체 기자', '전체 기사', '전체 1인당'].join('\t'));
const 달통계 = [];
for (const [mm] of 달들) {
  const 전부 = [...사람.entries()].map(([이름, d]) => ({ 이름, n: d[mm] ?? 0 })).filter((x) => x.n > 0);
  const 넘은 = 전부.filter((x) => x.n >= 문턱);
  const 넘은합 = 넘은.reduce((s, x) => s + x.n, 0);
  const 전부합 = 전부.reduce((s, x) => s + x.n, 0);
  달통계.push({ mm, 넘은, 넘은합, 전부, 전부합 });
  console.log([
    '2026-' + mm,
    넘은.length + '명',
    넘은합 + '건',
    (넘은합 / (넘은.length || 1)).toFixed(1) + '건',
    전부.length + '명',
    전부합 + '건',
    (전부합 / (전부.length || 1)).toFixed(1) + '건',
  ].join('\t') + (mm === '11' ? '   (24일까지)' : ''));
}

/* ── 표 2 — 월평균이 문턱을 넘은 기자의 달별 수치 ── */
const 줄 = [];
for (const [이름, d] of 사람) {
  const 온전값 = 온전한달.map((mm) => (d[mm] ?? 0));
  const 합 = 온전값.reduce((s, x) => s + x, 0);
  const 평균 = 온전값.length ? 합 / 온전값.length : 0;
  if (평균 < 문턱) continue;
  줄.push({ 이름, 갈래: 갈래(이름), 값: 달들.map(([mm]) => (d[mm] ?? 0)), 합, 평균, 최대: Math.max(...온전값) });
}
줄.sort((a, b) => b.평균 - a.평균);

console.log(`\n■ 월평균 ${문턱}건 이상인 기자 — 1~10월 평균으로 가렸다 (11월은 달이 안 끝나 평균에서 뺐다)\n`);
console.log(['순위', '기자명', '갈래', ...달들.map(([m]) => m + '월'), '1~10월합', '월평균', '최대달'].join('\t'));
줄.forEach((r, i) => {
  console.log([i + 1, r.이름, r.갈래, ...r.값, r.합, r.평균.toFixed(1), r.최대].join('\t'));
});

const 실명 = 줄.filter((r) => r.갈래 === '기자');
const 합계 = 줄.reduce((s, r) => s + r.합, 0);
console.log(`\n월평균 ${문턱}건 이상: ${줄.length}명 (실명 기자 ${실명.length}명 + 외부필진 묶음 ${줄.length - 실명.length}개)`);
console.log(`그 ${줄.length}명의 1~10월 기사 합계 ${합계}건 · 1인당 월 ${(합계 / 줄.length / 온전한달.length).toFixed(1)}건`);

/* ── 표 3 — 문턱 미만 기자가 차지하는 몫 ── */
const 미만 = [...사람.entries()].filter(([이름, d]) => {
  const 평균 = 온전한달.reduce((s, mm) => s + (d[mm] ?? 0), 0) / 온전한달.length;
  return 평균 > 0 && 평균 < 문턱;
});
const 미만합 = 미만.reduce((s, [, d]) => s + 온전한달.reduce((t, mm) => t + (d[mm] ?? 0), 0), 0);
console.log(`\n월평균 ${문턱}건 미만: ${미만.length}명 · 1~10월 기사 합계 ${미만합}건`);
console.log(`   ${미만.map(([n]) => n).join(' · ')}`);
