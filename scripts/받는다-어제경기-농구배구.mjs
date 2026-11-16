#!/usr/bin/env node
/**
 * 받는다-어제경기-농구배구.mjs
 *   — **어제 KBL·KOVO 여자부 경기의 점수와 선수 기록을 공식 화면에서 직접 받아 적는다.**
 *
 * ## 🔴 왜 이것이 생겼나 (2026-11-16 · 5번)
 *
 *   사장님 「**어제 농구와 배구경기 기사 줘**」를 받고 찾아보니 11월 15일·16일 아침
 *   회차가 **날씨 기사만** 내보내고 경기 기사는 한 건도 안 나갔다.
 *   예약 회차(스포츠 09시)는 켜져 있는데 **2026-11-11 에 만든 세션에 묶인 채**
 *   새 세션을 만들지 못하고 있었다. 켜짐·다음실행시각은 멀쩡해 보인다.
 *
 *   ⇒ 회차가 멈춰도 기사가 나가도록 **받침**을 둔다. 자료는 이 자가 받고,
 *     기사는 그 자료로 세션이 쓴다.
 *
 * ## ⛔ 지어내지 않는다
 *   못 읽은 칸은 「못 읽었다」로 적는다. 기사에서 베끼지 않는다 —
 *   KBL 일정 화면과 KOVO 일정 화면의 «공식 기록»만 쓴다.
 *
 * ## ⚠ 화면이 자바스크립트로 그려진다
 *   글자를 긁기 전에 충분히 기다린다. 「기록」·「상세결과」 단추는 element.click() 을
 *   무시하므로 **실제 마우스 좌표**로 누른다.
 *
 * ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만. 연 탭은 그 자리에서 닫는다.
 *
 * 쓰는 법
 *   node scripts/받는다-어제경기-농구배구.mjs                어제
 *   node scripts/받는다-어제경기-농구배구.mjs --날 2026-11-15
 *   node scripts/받는다-어제경기-농구배구.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** KBL 일정 화면 글에서 그 날짜 덩어리를 잘라 낸다. 「11.15」 꼴로 찾는다 */
export function 그날덩어리(글, 월, 일) {
  const s = String(글 ?? '');
  const 못 = String(월).padStart(2, '0') + '.' + String(일).padStart(2, '0');
  const i = s.indexOf('\n' + 못 + '\n');
  if (i < 0) return '';
  const 뒤 = s.slice(i + 1);
  const j = 뒤.search(/\n\d{2}\.\d{2}\n/);
  return j < 0 ? 뒤 : 뒤.slice(0, j);
}

/** 덩어리에서 「팀 점수 팀 점수」 짝을 뽑는다 */
export function 경기뽑기(덩어리) {
  const 줄 = String(덩어리 ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
  const 결과 = [];
  for (let i = 0; i < 줄.length; i += 1) {
    if (!/^(정규시즌|플레이오프|컵대회|EASL)$/.test(줄[i])) continue;
    const 시각 = 줄[i + 1] || '';
    if (!/^\d{1,2}:\d{2}$/.test(시각)) continue;
    const 곳 = 줄[i + 2] || '';
    const 홈 = 줄[i + 3] || '';
    const 홈점 = 줄[i + 4] || '';
    const 원 = 줄[i + 5] || '';
    const 원점 = 줄[i + 6] || '';
    if (!/^\d+$/.test(홈점) || !/^\d+$/.test(원점)) continue;
    결과.push({ 시각, 곳, 홈, 홈점: Number(홈점), 원정: 원, 원점: Number(원점) });
  }
  return 결과;
}

if (process.argv.includes('--자가시험')) {
  const 본보기 = [
    '11.15', '정규시즌', '14:00', '고양소노아레나', '소노', '89', 'DB', '83',
    '기록', '프리뷰', '하이라이트', '정규시즌', '16:30', '창원체육관', 'LG', '83', 'KT', '81',
    '기록', '11.16', '정규시즌', '19:00', '잠실학생체육관', 'SK', '0', '현대모비스', '0',
  ].join('\n');
  const 덩 = 그날덩어리('\n' + 본보기, '11', '15');
  const 경기 = 경기뽑기(덩);
  const 본 = [
    [() => 덩.length > 0, true],
    [() => 덩.includes('11.16'), false],
    [() => 경기.length, 2],
    [() => 경기[0] && 경기[0].홈, '소노'],
    [() => 경기[0] && 경기[0].홈점, 89],
    [() => 경기[0] && 경기[0].원점, 83],
    [() => 경기[1] && 경기[1].홈, 'LG'],
    [() => 경기[1] && 경기[1].원점, 81],
    [() => 경기뽑기('').length, 0],
    [() => 그날덩어리('', '11', '15'), ''],
    /* 그 날이 없으면 빈손이다 — 옆 날 경기를 끌어오지 않는다 */
    [() => 그날덩어리('\n' + 본보기, '11', '20'), ''],
    /* ⭐ 0대0 예정 경기는 다음 날 덩어리에 있어야 하고 이 날에 섞이면 안 된다 */
    [() => 경기.some((g) => g.홈 === 'SK'), false],
  ];
  let 통과 = 0;
  본.forEach(([f, 와야], i) => {
    const 났 = f();
    if (났 === 와야) 통과 += 1;
    else console.log('  X ' + (i + 1) + '번 -> [' + 났 + '] (와야 할 것 [' + 와야 + '])');
  });
  console.log('자가시험 ' + 통과 + '/' + 본.length);
  process.exit(통과 === 본.length ? 0 : 1);
}

/* ── 본 일 ── */
const 날자리 = process.argv.indexOf('--날');
const 어제 = (() => {
  if (날자리 > 0 && process.argv[날자리 + 1]) return process.argv[날자리 + 1];
  const d = new Date();                      /* ⛔ toISOString 금지 — 이 PC 가 KST 다 */
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
})();
const [연, 월, 일] = 어제.split('-');

const require2 = createRequire(path.join('C:\\Users\\User\\Documents\\GitHub\\klifemap', 'package.json'));
const puppeteer = require2('puppeteer-core');
const 포트 = process.env.KLM_CHROME_PORT || '9222';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + 포트, defaultViewport: null, protocolTimeout: 240000 });
const 탭들 = [];
const 울 = '```';
const 적을것 = [
  '# 어제 경기 밑감 — ' + 어제 + ' (받은 때 ' + new Date().toLocaleString('ko-KR') + ')', '',
  '⚠ KBL·KOVO 공식 화면에서 그대로 받아 적은 것이다. 기사에서 베낀 것이 아니다.', '',
];

const 잎누르기 = async (p, 말, 몇번째 = 0) => {
  const 자리 = await p.evaluate((m, n) => {
    const 잎 = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === m);
    if (!잎[n]) return null;
    잎[n].scrollIntoView({ block: 'center' });
    const r = 잎[n].getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, 말, 몇번째);
  if (!자리) return false;
  await new Promise((r) => setTimeout(r, 1000));
  await p.mouse.click(자리.x, 자리.y);
  await new Promise((r) => setTimeout(r, 8000));
  return true;
};

try {
  /* ── 농구 ── */
  const k = await b.newPage(); 탭들.push(k);
  await k.setViewport({ width: 1500, height: 1300 });
  await k.goto('https://www.kbl.or.kr/match/schedule', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 9000));
  const 일정글 = await k.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
  const 덩 = 그날덩어리('\n' + 일정글, 월, 일);
  const 경기 = 경기뽑기(덩);
  적을것.push('## KBL — ' + 어제 + ' 경기 ' + 경기.length + '건', '');
  if (!경기.length) 적을것.push('⬜ 어제 KBL 경기가 없었다(또는 일정 화면에서 못 읽었다).', '');
  for (const g of 경기) 적을것.push('- ' + g.시각 + ' ' + g.곳 + ' — ' + g.홈 + ' ' + g.홈점 + ' : ' + g.원점 + ' ' + g.원정);
  적을것.push('');

  const 다음일 = (() => { const d = new Date(어제 + 'T12:00:00'); d.setDate(d.getDate() + 1); return d; })();
  const 번호 = await k.evaluate((못1, 못2) => {
    const 잎 = (m) => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === m);
    const 기록들 = 잎('기록');
    const d1 = 잎(못1)[0];
    const d2 = 잎(못2)[0];
    if (!d1) return [];
    return 기록들.map((e, i) => ({ e, i })).filter(({ e }) => {
      const 뒤 = d1.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING;
      const 앞 = !d2 || (d2.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING);
      return 뒤 && 앞;
    }).map((o) => o.i);
  },
  String(월).padStart(2, '0') + '.' + String(일).padStart(2, '0'),
  String(다음일.getMonth() + 1).padStart(2, '0') + '.' + String(다음일.getDate()).padStart(2, '0'));

  const 기록주소 = [];
  for (const n of 번호) {
    await k.goto('https://www.kbl.or.kr/match/schedule', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 8000));
    if (await 잎누르기(k, '기록', n)) 기록주소.push(k.url());
  }
  for (const u of 기록주소) {
    await k.goto(u, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 9000));
    const 요약 = await k.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
    적을것.push('### ' + u + ' — 경기요약', 울, 요약.slice(0, 2600), 울, '');
    if (await 잎누르기(k, '경기기록')) {
      const 선수 = await k.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
      적을것.push('### 같은 경기 — 선수기록', 울, 선수.slice(0, 4200), 울, '');
    }
  }
  await k.close().catch(() => {});

  /* ── 배구(여자부) ── */
  const v = await b.newPage(); 탭들.push(v);
  await v.setViewport({ width: 1500, height: 1300 });
  await v.goto('https://kovo.co.kr/games/v-leagues/schedules?gender=2&season=023&league=201&round=all',
    { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 9000));
  const 배일정 = await v.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
  const 배못 = String(연).slice(2) + '.' + String(월).padStart(2, '0') + '.' + String(일).padStart(2, '0');
  적을것.push('## KOVO 여자부 — ' + 어제, '');
  if (배일정.indexOf(배못) < 0) 적을것.push('⬜ 어제 여자부 경기가 없었다(또는 일정 화면에서 못 읽었다).', '');
  else {
    const i = 배일정.indexOf(배못);
    적을것.push(울, 배일정.slice(Math.max(0, i - 300), i + 300), 울, '');
    const 눌림 = await v.evaluate((못) => {
      const 잎 = (m) => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === m);
      const d = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').includes(못))[0];
      if (!d) return null;
      const 상세 = 잎('상세결과').filter((e) => d.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (!상세[0]) return null;
      상세[0].scrollIntoView({ block: 'center' });
      const r = 상세[0].getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    }, 배못);
    if (눌림) {
      await new Promise((r) => setTimeout(r, 1200));
      await v.mouse.click(눌림.x, 눌림.y);
      await new Promise((r) => setTimeout(r, 10000));
      const 상세 = await v.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
      적을것.push('### ' + v.url() + ' — 상세결과', 울, 상세.slice(0, 4000), 울, '');
    } else 적을것.push('⬜ 「상세결과」 단추를 못 찾았다 — 손으로 본다.', '');
  }
  await v.close().catch(() => {});

  const 낼곳 = path.join(뿌리, 'docs', '자료-어제경기-' + 어제.replace(/-/g, '') + '.md');
  fs.writeFileSync(낼곳, 적을것.join('\n'), 'utf8');
  console.log('✅ 적었다 — ' + path.relative(뿌리, 낼곳) + ' (' + 적을것.join('\n').length + '자)');
  console.log('   KBL 경기 ' + 경기.length + '건 · 기록 화면 ' + 기록주소.length + '개');
} catch (e) {
  console.log('🔴 오류 — ' + e.message);
  process.exitCode = 1;
} finally {
  for (const x of 탭들) await x.close().catch(() => {});
  b.disconnect();
}
