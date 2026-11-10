#!/usr/bin/env node
/**
 * 거둔다-TV채널번호.mjs — **PP 채널의 채널번호를 방송사 공식 안내에서 그대로 거둔다.**
 *
 * ── 왜 만드나 (2026-11-10 · 사장님 지시) ─────────────────────────────
 * 사장님 — 「케이리뷰에 메뉴 추가. 메뉴명 **TV채널-편성표**. 내용: 모든 PP사의 채널과
 *   편성표 정보를 제공하는 콘텐트를 만들어. 제목 키워드 예시 **JTBC 채널번호-편성표**
 *   (관련 정보는 https://jtbc.co.kr/channel/jtbc/iptv 등에서 찾아서 콘텐트 제작하면 됨)」
 * 사장님 — 「**롱테일 콘텐트** 역할을 한다. 내가 티스토리 블로그에서 했던 건데, 의외로 많이 찾음」
 *
 * ⭐ 「JTBC 채널번호」는 **사는 곳마다 답이 다르다.** 딜라이브 강남은 15번인데 에스케이브로드밴드
 *   강서는 4번이다. 전국 하나로 적으면 **절반 넘는 손님에게 틀린 답**을 주는 것이다.
 *   그래서 권역·사업자까지 통째로 거둔다. 그것이 이 갈래에서 롱테일이 생기는 자리다.
 *
 * ⛔ **숫자를 지어내지 않는다.** 표를 못 받으면 그 채널은 「못 거뒀다」로 남기고 지면을 안 낸다.
 * ⛔ 우리가 셈해서 바꾸지 않는다 — 방송사가 적어 둔 칸을 그대로 옮긴다.
 * ⛔ b.close() 금지(사장님 창이 닫힌다). disconnect() 만. 언제나 새 탭, 연 탭은 그 자리에서 닫는다.
 *
 * 쓰는 법
 *   node scripts/거둔다-TV채널번호.mjs            전부 거둬 src/data/kcw-tv-channels.json 에 적는다
 *   node scripts/거둔다-TV채널번호.mjs --자가시험
 *   node scripts/거둔다-TV채널번호.mjs --채널 jtbc   하나만
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 낼길 = 'src/data/kcw-tv-channels.json';

/** 권역 탭 이름 — 방송사 안내가 쓰는 말 그대로 */
export const 권역이름 = ['IPTV/위성', '서울', '인천/경기', '부산/경남', '광주/전라', '대구/경북', '대전/충청', '강원/제주'];

/**
 * 거둘 채널. ⛔ 여기 적힌 것만 거둔다 — 주소를 짐작해서 넣지 않는다.
 * ⚠ `공식` 은 **채널번호 안내 지면**이고 `편성표` 는 편성표 지면이다. 둘은 다른 곳이다.
 */
export const 거둘채널 = [
  { 코드: 'jtbc', 이름: 'JTBC', 운영: '제이티비씨', 갈래: '종합편성',
    공식: 'https://jtbc.co.kr/channel/jtbc/iptv', 편성표: 'https://jtbc.co.kr/schedule' },
  { 코드: 'jtbc2', 이름: 'JTBC2', 운영: '제이티비씨', 갈래: '오락',
    공식: 'https://jtbc.co.kr/channel/jtbc2/iptv', 편성표: 'https://jtbc.co.kr/schedule' },
  { 코드: 'jtbc4', 이름: 'JTBC4', 운영: '제이티비씨', 갈래: '오락',
    공식: 'https://jtbc.co.kr/channel/jtbc4/iptv', 편성표: 'https://jtbc.co.kr/schedule' },
];

/**
 * 거둔 표(문자열 줄들)를 레코드로 바꾼다.
 *
 * 들어오는 꼴 — 첫 줄이 머리글이고, 권역 칸은 **같은 권역이 이어지면 비어 있다**(rowspan).
 *   권역 ⇥ 세부지역 ⇥ 방송사명 ⇥ 디지털 ⇥ 8VSB ⇥ 기술중립상품
 *   서울 ⇥ 강남구 ⇥ 딜라이브 강남 ⇥ 15 ⇥ 15-1 ⇥
 *        ⇥ 강동구 ⇥ 딜라이브 강동 ⇥ 15 ⇥ 15-1 ⇥      ← 권역 칸이 없다
 *
 * ⭐ 그래서 **칸 수로 가른다.** 칸이 다섯이면 앞 줄의 권역을 물려받는다.
 * ⛔ 빈 칸을 0 으로 채우지 않는다 — 8VSB 가 없는 사업자가 실제로 있다. 빈 것은 빈 채로 둔다.
 */
export function 표읽기(줄들) {
  const 것 = [];
  let 이어받을권역 = '';
  for (const 줄 of 줄들 ?? []) {
    const 칸 = String(줄 ?? '').split('\t').map((x) => x.trim());
    if (!칸.length) continue;
    if (칸[0] === '권역' || /확인표|안내$/.test(칸[0] ?? '')) continue;   /* 머리글 */
    let 권역, 나머지;
    if (칸.length >= 6) { 권역 = 칸[0]; 나머지 = 칸.slice(1); 이어받을권역 = 권역 || 이어받을권역; }
    else if (칸.length === 5) { 권역 = 이어받을권역; 나머지 = 칸; }
    else continue;
    const [세부, 사업자, 디지털, vsb, 기술중립] = 나머지;
    if (!사업자) continue;
    /* ⛔ 번호가 셋 다 비면 적지 않는다 — 「사업자만 있고 번호가 없는 줄」은 답이 아니다 */
    if (!디지털 && !vsb && !기술중립) continue;
    것.push({ 권역: 권역 || 이어받을권역, 세부: 세부 ?? '', 사업자, 디지털: 디지털 ?? '', '8VSB': vsb ?? '', 기술중립: 기술중립 ?? '' });
  }
  return 것;
}

/** 전국(IPTV·위성) 표는 칸 꼴이 조금 다르다 — 권역이 「IPTV」·「위성」이고 세부가 「전국」이다 */
export function 전국읽기(줄들) {
  return 표읽기(줄들).map((x) => ({ 묶음: x.권역, 사업자: x.사업자, 번호: x.디지털, '8VSB': x['8VSB'], 기술중립: x.기술중립 }));
}

/** 오늘 날짜 — KST. ⛔ toISOString() 금지(이 PC 가 이미 KST 다) */
export function 오늘(이제 = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${이제.getFullYear()}-${p(이제.getMonth() + 1)}-${p(이제.getDate())}`;
}

async function 거둔다() {
  const { createRequire } = await import('node:module');
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
  const puppeteer = require('puppeteer-core');
  const 쉼 = (ms) => new Promise((f) => setTimeout(f, ms));

  const 고른것 = process.argv.includes('--채널')
    ? 거둘채널.filter((c) => c.코드 === process.argv[process.argv.indexOf('--채널') + 1])
    : 거둘채널;

  let b;
  try { b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null }); }
  catch (e) { console.log('⬜ 못 거뒀다 — 크롬(9222)에 못 붙었다. ' + String(e.message).slice(0, 60)); return; }

  const 낸것 = [];
  const 못거둔것 = [];
  try {
    for (const c of 고른것) {
      const 탭 = await b.newPage();
      try {
        await 탭.setViewport({ width: 1400, height: 1100 });
        await 탭.goto(c.공식, { waitUntil: 'networkidle2', timeout: 70000 });
        await 쉼(3500);

        const 모은것 = {};
        /* 🔴 [2026-11-10] **IPTV/위성 은 「처음 열리는 탭」이라 눌러도 안 바뀐다.**
           눌러서 거두려 했더니 전국 줄이 0 으로 나왔다 — 지역 91줄은 받으면서 정작
           「전국 채널번호」가 비었다. 손님이 가장 많이 찾는 바로 그 답이다.
           ⇒ 아무것도 누르기 전에 **먼저 띄워진 표를 그대로** 받는다. */
        모은것['IPTV/위성'] = await 탭.evaluate(() => {
          const t = document.querySelector('table');
          if (!t) return null;
          return [...t.querySelectorAll('tr')]
            .map((tr) => [...tr.querySelectorAll('th,td')].map((x) => (x.innerText || '').trim()).join('\t'))
            .filter((x) => x.replace(/\t/g, '').length);
        });
        for (const 권 of 권역이름) {
          if (권 === 'IPTV/위성') continue;   /* 위에서 이미 받았다 */
          const 눌렀나 = await 탭.evaluate((이름) => {
            const e = [...document.querySelectorAll('a,button,li')]
              .find((x) => (x.innerText || '').trim() === 이름);
            if (!e) return false;
            e.scrollIntoView({ block: 'center' });
            (e.querySelector('a,button') ?? e).click();
            return true;
          }, 권);
          if (!눌렀나) continue;
          await 쉼(2200);
          const 표 = await 탭.evaluate(() => {
            const t = document.querySelector('table');
            if (!t) return null;
            return [...t.querySelectorAll('tr')]
              .map((tr) => [...tr.querySelectorAll('th,td')].map((x) => (x.innerText || '').trim()).join('\t'))
              .filter((x) => x.replace(/\t/g, '').length);
          });
          if (표) 모은것[권] = 표;
        }

        const 전국 = 전국읽기(모은것['IPTV/위성'] ?? []);
        const 지역 = 권역이름.filter((x) => x !== 'IPTV/위성').flatMap((권) => 표읽기(모은것[권] ?? []));
        if (!전국.length && !지역.length) { 못거둔것.push({ ...c, 왜: '표를 하나도 못 받았다' }); continue; }
        낸것.push({ ...c, 전국, 지역 });
        console.log(`✅ ${c.이름} — 전국 ${전국.length}줄 · 지역 ${지역.length}줄`);
      } catch (e) {
        못거둔것.push({ ...c, 왜: String(e.message).slice(0, 70) });
        console.log(`⬜ 못 거뒀다 — ${c.이름}`);
      } finally { await 탭.close().catch(() => {}); }
    }
  } finally { await b.disconnect(); }

  if (!낸것.length) { console.log('⛔ 한 채널도 못 거뒀다 — 파일을 건드리지 않는다'); process.exitCode = 1; return; }

  /* ⛔ 거둔 것만으로 파일을 통째로 덮지 않는다 — `--채널` 로 하나만 돌렸을 때 나머지가 지워진다 */
  const p = path.join(뿌리, 낼길);
  let 옛것 = { 채널: [] };
  try { if (fs.existsSync(p)) 옛것 = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { 옛것 = { 채널: [] }; }
  const 표 = new Map((옛것.채널 ?? []).map((x) => [x.코드, x]));
  for (const x of 낸것) 표.set(x.코드, { ...x, 잰날: 오늘() });

  fs.writeFileSync(p, JSON.stringify({
    설명: 'PP 채널의 채널번호. 방송사 공식 안내에서 그대로 거둔 것이다. 우리가 셈해서 바꾸지 않는다.',
    잰날: 오늘(),
    채널: [...표.values()],
  }, null, 1), 'utf8');
  console.log(`\n📈 ${표.size}개 채널 — ${낼길}`);
  if (못거둔것.length) {
    console.log(`⬜ 못 거둔 채널 ${못거둔것.length}개 — 「없다」가 아니라 「못 거뒀다」다`);
    for (const x of 못거둔것) console.log(`   ${x.이름} — ${x.왜}`);
  }
}

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 검 = (이름, 참) => { if (참) { 통과 += 1; console.log('  ✅ ' + 이름); } else { 실패 += 1; console.log('  🔴 ' + 이름); } };

  const 줄들 = [
    '권역\t세부지역\t방송사명\t디지털\t8VSB\t기술중립상품',
    '서울\t강남구\t딜라이브 강남\t15\t15-1\t',
    '강동구\t딜라이브 강동\t15\t15-1\t',
    '강서구\t에스케이브로드밴드 강서\t4\t20-1\t4',
  ];
  const r = 표읽기(줄들);
  검('머리글을 거른다', r.length === 3);
  검('🔴 권역이 빈 줄은 앞 줄의 권역을 물려받는다 — rowspan 이라 빈다',
    r[1].권역 === '서울' && r[2].권역 === '서울');
  검('사업자와 번호를 그대로 옮긴다', r[2].사업자 === '에스케이브로드밴드 강서' && r[2].디지털 === '4');
  검('⛔ 빈 칸을 0 으로 채우지 않는다', r[0].기술중립 === '');
  검('⛔ 번호가 하나도 없는 줄은 안 받는다',
    표읽기(['서울\t어딘가\t어느방송\t\t\t']).length === 0);
  검('⛔ 빈 것에 안 터진다', 표읽기(null).length === 0 && 표읽기([]).length === 0);
  검('⛔ 칸이 모자란 줄은 건너뛴다', 표읽기(['가\t나']).length === 0);

  const 전 = 전국읽기([
    '권역\t세부지역\t방송사명\t디지털\t8VSB\t기술중립상품',
    'IPTV\t전국\tKT 지니 TV\t15\t\t',
    '전국\t에스케이브로드밴드\t15\t\t',
    '위성\t전국\t케이티스카이라이프\t4\t\t',
  ]);
  검('전국 표를 읽는다', 전.length === 3);
  검('🔴 IPTV 묶음이 이어진다 — 둘째 줄에 묶음이 비어 있다', 전[1].묶음 === 'IPTV');
  검('위성이 제 묶음으로 선다', 전[2].묶음 === '위성' && 전[2].번호 === '4');

  검('권역 여덟이 다 있다', 권역이름.length === 8 && 권역이름.includes('IPTV/위성'));
  검('거둘 채널마다 공식 주소가 있다', 거둘채널.every((c) => /^https:\/\//.test(c.공식)));
  검('거둘 채널 코드가 겹치지 않는다', new Set(거둘채널.map((c) => c.코드)).size === 거둘채널.length);
  검('오늘 날짜가 KST 꼴이다', /^\d{4}-\d{2}-\d{2}$/.test(오늘(new Date('2026-11-10T01:00:00+09:00'))));
  검('⛔ 9시간을 더하지 않는다', 오늘(new Date('2026-11-10T01:00:00+09:00')) === '2026-11-10');

  console.log(`\n통과 ${통과} · 실패 ${실패}`);
  if (실패) process.exitCode = 1;
}

if (process.argv.includes('--자가시험')) 자가시험();
else await 거둔다();
